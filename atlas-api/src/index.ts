/**
 * Atlas API — Cloudflare Worker backend.
 *
 * Receives health data from the iOS app "Health Auto Export" and stores it in
 * Cloudflare KV, and proxies AI calls to Anthropic Claude so the API key stays
 * server-side (this app's frontend is a public PWA and must never hold it).
 *
 *   POST /api/health          store payload (requires x-api-key: API_SECRET) -> 201
 *   GET  /api/health          latest stored payload      (requires x-api-key: ATLAS_API_KEY)
 *   GET  /api/health/:date    payload for a YYYY-MM-DD    (requires x-api-key: ATLAS_API_KEY)
 *   POST /api/workouts        store a Workouts+Routes payload from Health Auto Export
 *                             (requires x-api-key: API_SECRET) -> 201
 *   GET  /api/workouts        latest stored workout payload (requires x-api-key: ATLAS_API_KEY)
 *   GET  /api/workouts/:date  workout payload for a YYYY-MM-DD (requires x-api-key: ATLAS_API_KEY)
 *   POST /api/ai/nutrition    estimate calories/macros from a meal description
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/ai/chat         free-text life-assistant chat over a message history
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/chat            data-grounded, tool-calling chat: today's snapshot injected
 *                             into the system prompt; may call ASSISTANT_TOOLS instead of
 *                             replying with text (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/briefing        terse AI daily brief from a metrics object the PWA sends
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/calendar-parse  extract calendar events/tasks from free text
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/nutrition-gap   largest intake-vs-target nutrition gaps + food fixes
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   POST /api/update-targets  goal-based daily calorie + macro targets
 *                             (requires x-api-key: ATLAS_API_KEY; rate-limited)
 *   GET  /api/sync/:domain            current value + last-write timestamp for a
 *                                      synced domain (see src/sync.ts) (ATLAS_API_KEY)
 *   POST /api/sync/:domain            push a domain's whole current value, last-write-wins
 *                                      (ATLAS_API_KEY)
 *   GET  /api/sync/journal/:yearMonth same, for the per-month journal store
 *                                      (ATLAS_API_KEY)
 *   POST /api/sync/journal/:yearMonth (ATLAS_API_KEY)
 *
 * health/workouts and every /api/sync/* domain are stored in D1 (see
 * migrations/0001_init.sql) — health/workouts as a verbatim JSON blob per day
 * (same semantics as before, just moved off KV), synced domains as real
 * typed rows per domain (see src/sync.ts and src/sync/*.ts).
 *
 * Two keys by design (least privilege):
 *   API_SECRET     — write key, held only by Health Auto Export.
 *   ATLAS_API_KEY  — low-privilege read/AI key, held by the PWA. Rate-limited;
 *                    extractable from the bundle but the daily cap bounds abuse.
 *
 * Read + AI routes additionally require a passkey (WebAuthn) session token — see
 * auth.ts and the `/api/auth/*` routes — so the bundle key alone is not enough.
 */

import Anthropic from "@anthropic-ai/sdk";
import { handleAuthRoutes, requireSession } from "./auth.ts";
import { buildNutritionPrompt, applyFinnishFoodOverrides } from "./finnishFoods.ts";
import { handleFlatSyncRoute } from "./sync.ts";
import { handleJournalSyncRoute, JOURNAL_SYNC_REGISTRY } from "./sync/journalSync.ts";
import { NUTRITION_SYNC_REGISTRY } from "./sync/nutritionSync.ts";
import { WEIGHT_SYNC_REGISTRY } from "./sync/weightSync.ts";
import { ENERGY_SYNC_REGISTRY } from "./sync/energySync.ts";
import { HABITS_SYNC_REGISTRY } from "./sync/habitsSync.ts";
import { DEEP_WORK_SYNC_REGISTRY } from "./sync/deepWorkSync.ts";
import { SETTINGS_SYNC_REGISTRY } from "./sync/settingsSync.ts";

/** Every flat-keyed (`/api/sync/:domain`) registration, merged from each feature area's own file. */
const SYNC_REGISTRY = {
  ...NUTRITION_SYNC_REGISTRY,
  ...JOURNAL_SYNC_REGISTRY,
  ...WEIGHT_SYNC_REGISTRY,
  ...ENERGY_SYNC_REGISTRY,
  ...HABITS_SYNC_REGISTRY,
  ...DEEP_WORK_SYNC_REGISTRY,
  ...SETTINGS_SYNC_REGISTRY,
};

export interface Env {
  HEALTH_KV: KVNamespace;
  /** Structured storage for health/workout ingest and every synced domain — see migrations/0001_init.sql and src/sync.ts. */
  DB: D1Database;
  /** Write key for the Health Auto Export ingest. */
  API_SECRET: string;
  /** Read/AI key sent by the PWA. */
  ATLAS_API_KEY: string;
  /** Anthropic (Claude) API key — server secret, never exposed. */
  ANTHROPIC_API_KEY: string;
  /** Comma-separated origin allowlist for CORS, e.g. "https://app.example,http://localhost:5173". */
  ALLOWED_ORIGINS: string;
  /** Max AI requests per UTC day (string in wrangler vars). Defaults to 100. */
  AI_DAILY_CAP?: string;
  /** HMAC secret for signing passkey session tokens (see auth.ts). */
  SESSION_SECRET: string;
  /** One-time code required to enroll a new passkey/device (see auth.ts). */
  SETUP_CODE: string;
}

// Claude model for all AI features. Haiku 4.5 is fast + cheap and supports
// structured outputs; swap for "claude-sonnet-5" or "claude-opus-4-8" for more
// capability (see https://platform.claude.com/docs pricing).
const CLAUDE_MODEL = "claude-haiku-4-5";
const MEAL_TEXT_MAX = 500;
const DEFAULT_AI_DAILY_CAP = 100;

/** Max length of free text we'll parse for calendar events. */
const CALENDAR_TEXT_MAX = 1000;

/** Chat limits: per-message length and how many turns of history we accept. */
const CHAT_TEXT_MAX = 2000;
const CHAT_MAX_MESSAGES = 20;

/** Max size of the grounded-chat snapshot JSON we'll accept (stringified chars). */
const CHAT_SNAPSHOT_MAX = 8000;

/** Max size of the briefing metrics JSON we'll accept (stringified chars). */
const BRIEFING_JSON_MAX = 4000;

/** Max size of the nutrition-gap JSON we'll accept (stringified chars). */
const NUTRITION_GAP_JSON_MAX = 4000;

/** Max length of a stated goal string. */
const GOAL_TEXT_MAX = 200;

/** The macro-coach instruction for goal-based target setting. */
const TARGETS_PROMPT =
  "You are a macro coach. Given current weight, BMI, body fat %, lean body mass, and the " +
  "user's stated goal, calculate a daily calorie target and macro split (protein/carbs/fat " +
  "in grams). Use lean body mass to set the protein target (not total weight); if lean body " +
  "mass is unavailable, base protein on total body weight instead. Base the calorie " +
  "deficit/surplus on the stated goal, moderate and sustainable (max 500 kcal deficit or " +
  "surplus). Also include 2-3 short, practical, actionable tips (e.g. hydration, daily steps, " +
  "sleep, protein timing) in a `tips` array. Reasoning max 2 sentences.";

/** The nutrition-gap coach instruction ({JSON} = today's intake-vs-targets object). */
const NUTRITION_GAP_PROMPT =
  "Given today's logged intake vs targets: {JSON}, identify the 2-3 largest gaps " +
  "(protein, fibre, key micronutrients). Suggest 1-2 specific whole foods for each gap, " +
  "with approximate amount needed. Short list format, no explanation of nutrition science.";

/** The daily-briefing coach instruction (metrics JSON is appended at call time). */
const BRIEFING_PROMPT =
  "You are a terse health coach. Given the user's daily metrics, write a 2-3 " +
  "sentence brief. Flag any concerning readiness/HRV/sleep numbers, note training " +
  "load advice, flag any macro gaps (protein/carbs/fat) vs their daily target, and " +
  "call out only the 1-2 most significant micronutrient gaps (those well below their " +
  "target percent) — ignore micros that are near or above target. No greetings, no " +
  "fluff, plain language.";

/**
 * Shared output-style rule for the chat assistants: minimal words, plain text,
 * hard length cap, one best tip over a list, disclaimers only when the
 * question is genuinely medical. Appended to every chat system prompt so
 * answers stay terse, unformatted, and consistently scoped across both chat
 * endpoints (CHAT_SYSTEM_PROMPT below and /api/chat's systemText).
 */
const TERSE_STYLE =
  " Answer in as few words as possible while still fully answering — no restating the " +
  "question, no filler, no greetings. Plain text only: never use markdown, bold, or " +
  "asterisks, and never start lines with a dash or bullet. A hyphen is allowed only " +
  "inside a numeric range, e.g. 7-9 hours. Hard cap: keep the whole reply under about 500 " +
  "characters. When giving advice, give the single most useful, evidence-based tip rather " +
  "than an exhaustive list of options. Skip disclaimers and caveats — only add a brief one " +
  "when the question is genuinely medical (symptoms, injury, medication).";

/**
 * Health/fitness/appearance knowledge scope shared by both chat endpoints —
 * training, nutrition, sleep, recovery, and "lookmaxing" (grooming, posture,
 * skin, sleep quality, body composition). Answer confidently from this domain
 * rather than deferring, and prefer the user's own logged numbers over
 * generic advice whenever they're relevant — see /api/chat's systemText,
 * which appends this after injecting today's data snapshot.
 */
const WELLBEING_DOMAIN_PROMPT =
  " Your expertise covers training/strength & conditioning, nutrition, sleep, recovery, " +
  "and appearance optimization ('lookmaxing': grooming, posture, skin, sleep quality, body " +
  "composition). Answer confidently from this domain — don't hedge or suggest consulting a " +
  "professional for normal fitness/appearance questions. When the user's own logged data " +
  "(sleep, training, nutrition, readiness) bears on the question, base the answer on those " +
  "specific numbers instead of generic advice.";

/** System instruction that gives the assistant its ATLAS persona. */
const CHAT_SYSTEM_PROMPT =
  "You are ATLAS, a warm, concise personal wellbeing assistant inside a health " +
  "dashboard app that tracks sleep, energy, training, nutrition, and mood." +
  WELLBEING_DOMAIN_PROMPT +
  TERSE_STYLE;

/**
 * CORS headers for a request. The origin is reflected only when it's in the
 * ALLOWED_ORIGINS allowlist; otherwise no Allow-Origin is sent and browsers
 * block the response. `Vary: Origin` keeps caches per-origin.
 */
function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** Build a JSON response from a raw JSON string, with CORS headers attached. */
function jsonResponse(rawJson: string, status: number, request: Request, env: Env): Response {
  return new Response(rawJson, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
    },
  });
}

/** Today's date as YYYY-MM-DD (UTC). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * A stored KV value, or "{}" when missing or blank. KV.get returns null for an
 * absent key, but an earlier empty POST can also store an empty string — and `??`
 * wouldn't catch that, yielding an empty response body. This handles both.
 */
function storedJson(value: string | null): string {
  return value && value.trim() !== "" ? value : "{}";
}

const DATE_PATH = /^\/api\/health\/(\d{4}-\d{2}-\d{2})$/;
const WORKOUT_DATE_PATH = /^\/api\/workouts\/(\d{4}-\d{2}-\d{2})$/;

/**
 * Micronutrient fields the model estimates, in fixed units (must match
 * src/micros.ts on the frontend): iron/zinc/magnesium/potassium/calcium/
 * vitaminC in mg, vitaminD/vitaminB12/folate in µg, fibre/omega3 in g.
 */
const MICRO_PROPS = {
  iron: { type: "NUMBER" },
  calcium: { type: "NUMBER" },
  vitaminD: { type: "NUMBER" },
  vitaminB12: { type: "NUMBER" },
  zinc: { type: "NUMBER" },
  magnesium: { type: "NUMBER" },
  potassium: { type: "NUMBER" },
  fibre: { type: "NUMBER" },
  omega3: { type: "NUMBER" },
  vitaminC: { type: "NUMBER" },
  folate: { type: "NUMBER" },
  creatine: { type: "NUMBER" },
} as const;

const MICROS_SCHEMA = { type: "OBJECT", properties: MICRO_PROPS } as const;

/**
 * Human-readable units for the prompt so the model returns consistent
 * numbers. Exported so accuracy tests build the exact prompt production
 * uses (see nutritionAccuracy.test.ts) instead of re-declaring it.
 */
export const MICRO_UNITS =
  "iron mg, calcium mg, vitaminD µg, vitaminB12 µg, zinc mg, magnesium mg, " +
  "potassium mg, fibre g, omega3 g, vitaminC mg, folate µg, creatine g (only " +
  "for creatine supplements — omit for food/other supplements)";

/** Structured-output schema the model must return for a meal estimate. Exported for the same reason as MICRO_UNITS above. */
export const NUTRITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    totalKcal: { type: "NUMBER" },
    protein: { type: "NUMBER" },
    carbs: { type: "NUMBER" },
    fat: { type: "NUMBER" },
    micros: MICROS_SCHEMA,
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          kcal: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
        },
        required: ["name", "kcal", "protein", "carbs", "fat"],
      },
    },
    confidence: { type: "STRING", enum: ["low", "medium", "high"] },
  },
  required: ["totalKcal", "protein", "carbs", "fat", "items", "confidence"],
} as const;

/** Structured-output schema for a supplement's micronutrient content. */
const SUPPLEMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    micros: MICROS_SCHEMA,
    confidence: { type: "STRING", enum: ["low", "medium", "high"] },
  },
  required: ["micros", "confidence"],
} as const;

/** Structured-output schema for the daily briefing — a single short paragraph. */
const BRIEFING_SCHEMA = {
  type: "OBJECT",
  properties: {
    brief: { type: "STRING" },
  },
  required: ["brief"],
} as const;

/** Structured-output schema for goal-based target setting. */
const TARGETS_SCHEMA = {
  type: "OBJECT",
  properties: {
    calorieTarget: { type: "NUMBER" },
    protein: { type: "NUMBER" },
    carbs: { type: "NUMBER" },
    fat: { type: "NUMBER" },
    reasoning: { type: "STRING" },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["calorieTarget", "protein", "carbs", "fat", "reasoning", "tips"],
} as const;

/** Structured-output schema for the nutrition-gap analysis. */
const NUTRITION_GAP_SCHEMA = {
  type: "OBJECT",
  properties: {
    gaps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nutrient: { type: "STRING" },
          amountShort: { type: "STRING" },
          foodSuggestions: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["nutrient", "amountShort", "foodSuggestions"],
      },
    },
  },
  required: ["gaps"],
} as const;

/** Structured-output schema for calendar parsing — a top-level array of events. */
const CALENDAR_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      date: { type: "STRING" },
      time: { type: "STRING" },
      type: { type: "STRING", enum: ["event", "task"] },
    },
    required: ["title", "date", "time", "type"],
  },
} as const;

/**
 * Shared event-vs-task classification rule for calendar extraction (both
 * /api/calendar-parse and the add_calendar_events tool) — tasks render with a
 * completable checkbox in the app, events don't, so this materially changes
 * what the user sees. Default to 'task' when unsure: a checkbox degrades
 * better for something flexible than a fixed-time event does.
 */
const TASK_VS_EVENT_RULE =
  "Use 'task' for reminders and to-dos with no fixed time commitment (e.g. 'remind me to X', " +
  "'need to X', 'pick up X', 'don't forget to X') — these get a completable checkbox. Use " +
  "'event' only for actual scheduled appointments/meetings at a specific time (e.g. 'meeting " +
  "with X at 3pm', 'dentist appointment Friday'). Default to 'task' when unsure.";

/**
 * Tools the assistant chat (POST /api/chat) can call. Each one is executed
 * client-side (the PWA owns all the user's data in localStorage, not this
 * Worker), behind a user confirmation — the model just decides *when* to
 * propose an action and with what arguments; see Assistant.tsx for execution.
 */
const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "set_nutrition_targets",
    description:
      "Propose new daily calorie and macro (protein/carbs/fat, grams) targets. Only call " +
      "when the user states or changes a fitness/diet goal (lose fat, build muscle, maintain, " +
      "recomposition). Use lean body mass for the protein target if available, else total " +
      "weight. Keep any deficit/surplus moderate (max 500 kcal/day). Include 2-3 short, " +
      "practical tips (hydration, steps, sleep, protein timing).",
    input_schema: {
      type: "object",
      properties: {
        calorieTarget: { type: "number" },
        protein: { type: "number", description: "grams" },
        carbs: { type: "number", description: "grams" },
        fat: { type: "number", description: "grams" },
        goalLabel: {
          type: "string",
          description: "Short label, e.g. 'Lose fat', 'Build muscle', 'Maintain weight', 'Recomp'",
        },
        reasoning: { type: "string", description: "Max 2 sentences" },
        tips: { type: "array", items: { type: "string" } },
      },
      required: ["calorieTarget", "protein", "carbs", "fat", "goalLabel", "reasoning", "tips"],
    },
  },
  {
    name: "add_calendar_events",
    description:
      "Add one or more events or tasks to the user's calendar. Use when the user asks to " +
      "schedule, remind, or add something with a date and/or time. " +
      TASK_VS_EVENT_RULE,
    input_schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              time: { type: "string", description: "HH:MM, 24-hour" },
              type: { type: "string", enum: ["event", "task"], description: TASK_VS_EVENT_RULE },
            },
            required: ["title", "date", "time", "type"],
          },
        },
      },
      required: ["events"],
    },
  },
  {
    name: "set_hydration_goal",
    description: "Set the user's daily water/hydration goal. Use when they state a water intake goal.",
    input_schema: {
      type: "object",
      properties: { litres: { type: "number" } },
      required: ["litres"],
    },
  },
  {
    name: "log_meal",
    description:
      "Log a meal the user says they ate or are about to eat, estimating calories and " +
      "macros from the description. Use typical serving sizes when quantities are vague.",
    input_schema: {
      type: "object",
      properties: {
        mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        name: { type: "string" },
        kcal: { type: "number" },
        protein: { type: "number", description: "grams" },
        carbs: { type: "number", description: "grams" },
        fat: { type: "number", description: "grams" },
      },
      required: ["mealType", "name", "kcal", "protein", "carbs", "fat"],
    },
  },
];

/** Construct an Anthropic client for this request (key stays server-side). */
function anthropicClient(env: Env): Anthropic {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/**
 * Convert a Gemini-style response schema (uppercase types) into a JSON Schema
 * that Claude's structured outputs accepts: lowercase types, every object gets
 * `additionalProperties: false`, and all properties are marked required (strict).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJsonSchema(node: any): any {
  const t = String(node?.type).toUpperCase();
  if (t === "OBJECT") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(node.properties ?? {})) {
      properties[key] = toJsonSchema(value);
    }
    return {
      type: "object",
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
  }
  if (t === "ARRAY") {
    return { type: "array", items: toJsonSchema(node.items) };
  }
  const scalar: Record<string, string> = {
    STRING: "string",
    NUMBER: "number",
    INTEGER: "integer",
    BOOLEAN: "boolean",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = { type: scalar[t] ?? "string" };
  if (node.enum) out.enum = node.enum;
  return out;
}

/**
 * Call Claude with a prompt and a (Gemini-style) response schema, returning the
 * parsed object. Structured outputs guarantee the JSON matches the schema.
 * Throws on transport/HTTP/parse failure so callers can map to 502. Exported
 * so accuracy tests drive the real call path instead of re-implementing it
 * (see nutritionAccuracy.test.ts) — only `env.ANTHROPIC_API_KEY` is read.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callClaude(env: Env, prompt: string, schema: any): Promise<unknown> {
  const isArray = String(schema?.type).toUpperCase() === "ARRAY";
  const inner = toJsonSchema(schema);
  // Structured outputs require an object at the root, so wrap top-level arrays.
  const format = isArray
    ? {
        type: "object",
        properties: { result: inner },
        required: ["result"],
        additionalProperties: false,
      }
    : inner;

  let res;
  try {
    res = await anthropicClient(env).messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema: format } },
    });
  } catch (err) {
    console.error("[callClaude] Anthropic error:", String(err));
    throw err;
  }

  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!text) {
    console.error("[callClaude] no text content:", JSON.stringify(res.content).slice(0, 500));
    throw new Error("Claude returned no content");
  }
  const parsed = JSON.parse(text);
  return isArray ? (parsed as { result: unknown }).result : parsed;
}

/** A single chat turn as sent by the PWA. */
interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/**
 * Normalize a raw `messages` value from a request body into clean ChatTurns:
 * keeps only `user`/`model` roles with non-empty text, caps each turn's length,
 * and keeps just the most recent turns. Shared by /api/ai/chat and /api/chat.
 */
function parseChatMessages(raw: unknown): ChatTurn[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((m): ChatTurn | null => {
      if (m === null || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      const role = o.role === "model" || o.role === "user" ? o.role : null;
      const text = typeof o.text === "string" ? o.text.trim() : "";
      if (!role || !text) return null;
      return { role, text: text.slice(0, CHAT_TEXT_MAX) };
    })
    .filter((m): m is ChatTurn => m !== null)
    .slice(-CHAT_MAX_MESSAGES);
}

/**
 * Multi-turn free-text chat with Claude. Returns plain text; the assistant
 * persona lives in the system prompt (overridable per request, e.g. to inject
 * today's data). Throws on failure so the caller can map to 502.
 */
async function callClaudeChat(
  env: Env,
  messages: ChatTurn[],
  systemText: string = CHAT_SYSTEM_PROMPT,
): Promise<string> {
  // Claude requires the first message to come from the user — drop leading model turns.
  const turns = [...messages];
  while (turns.length && turns[0].role === "model") turns.shift();
  if (turns.length === 0) throw new Error("no user message to send");

  let res;
  try {
    res = await anthropicClient(env).messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemText,
      messages: turns.map((m) => ({
        role: m.role === "model" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
    });
  } catch (err) {
    console.error("[callClaudeChat] Anthropic error:", String(err));
    throw err;
  }

  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!text) {
    console.error("[callClaudeChat] no text content");
    throw new Error("Claude returned no content");
  }
  return text;
}

/** Max content blocks accepted per turn, and max chars per text/tool_result block. */
const CHAT_BLOCKS_MAX = 8;
const CHAT_BLOCK_TEXT_MAX = 4000;

type AssistantContentBlock =
  | Anthropic.TextBlockParam
  | Anthropic.ToolUseBlockParam
  | Anthropic.ToolResultBlockParam;

/** One turn of the assistant tool-calling conversation, as sent/received by the PWA. */
interface AssistantTurn {
  role: "user" | "assistant";
  content: string | AssistantContentBlock[];
}

/** Coerce one raw content block into a valid Anthropic content block, or null if unusable. */
function toContentBlock(v: unknown): AssistantContentBlock | null {
  if (v === null || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type === "text" && typeof o.text === "string") {
    return { type: "text", text: o.text.slice(0, CHAT_BLOCK_TEXT_MAX) };
  }
  if (o.type === "tool_use" && typeof o.id === "string" && typeof o.name === "string") {
    return { type: "tool_use", id: o.id, name: o.name, input: o.input ?? {} };
  }
  if (o.type === "tool_result" && typeof o.tool_use_id === "string") {
    const content = typeof o.content === "string" ? o.content.slice(0, CHAT_BLOCK_TEXT_MAX) : "";
    return { type: "tool_result", tool_use_id: o.tool_use_id, content };
  }
  return null;
}

/**
 * Normalize a raw `messages` value into clean AssistantTurns for the tool-calling
 * chat: each turn is either plain text or a small list of content blocks (text /
 * tool_use / tool_result), matching the Anthropic Messages API shape directly so
 * the PWA's running conversation round-trips without translation. Returns `null`
 * if the shape is unusable.
 */
function parseAssistantTurns(raw: unknown): AssistantTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: AssistantTurn[] = [];
  for (const m of raw.slice(-CHAT_MAX_MESSAGES)) {
    if (m === null || typeof m !== "object") return null;
    const o = m as Record<string, unknown>;
    const role = o.role === "user" || o.role === "assistant" ? o.role : null;
    if (!role) return null;
    if (typeof o.content === "string") {
      turns.push({ role, content: o.content.slice(0, CHAT_BLOCK_TEXT_MAX) });
      continue;
    }
    if (!Array.isArray(o.content)) return null;
    const blocks = o.content.slice(0, CHAT_BLOCKS_MAX).map(toContentBlock);
    if (blocks.some((b) => b === null)) return null;
    turns.push({ role, content: blocks as AssistantContentBlock[] });
  }
  return turns;
}

/**
 * Multi-turn chat with Claude, tools enabled. Returns either a final plain-text
 * reply (`done: true`, when Claude's turn has no tool_use block) or the raw
 * content blocks of a tool-calling turn (`done: false`) for the PWA to execute
 * client-side and continue the conversation with tool_result blocks. Throws on
 * transport/HTTP failure so the caller can map to 502.
 */
async function callClaudeWithTools(
  env: Env,
  turns: AssistantTurn[],
  systemText: string,
): Promise<{ done: true; reply: string } | { done: false; content: AssistantContentBlock[] }> {
  const cleaned = [...turns];
  while (cleaned.length && cleaned[0].role === "assistant") cleaned.shift();
  if (cleaned.length === 0) throw new Error("no user message to send");

  let res;
  try {
    res = await anthropicClient(env).messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemText,
      tools: ASSISTANT_TOOLS,
      messages: cleaned,
    });
  } catch (err) {
    console.error("[callClaudeWithTools] Anthropic error:", String(err));
    throw err;
  }

  if (res.stop_reason === "tool_use") {
    return { done: false, content: res.content as unknown as AssistantContentBlock[] };
  }

  const reply = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
  if (!reply) {
    console.error("[callClaudeWithTools] no text content");
    throw new Error("Claude returned no content");
  }
  return { done: true, reply };
}

/**
 * Increment today's AI request counter in KV and report whether the cap is
 * exceeded. Best-effort (KV is eventually consistent) — good enough to bound
 * free-tier abuse for a personal app.
 */
async function overRateLimit(env: Env): Promise<boolean> {
  const cap = Number(env.AI_DAILY_CAP) || DEFAULT_AI_DAILY_CAP;
  const key = `ratelimit:ai:${todayKey()}`;
  const current = Number((await env.HEALTH_KV.get(key)) ?? "0");
  if (current >= cap) return true;
  // Expire after ~2 days so old counters clean themselves up.
  await env.HEALTH_KV.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 });
  return false;
}

/**
 * Read/AI routes require BOTH the low-privilege bundle key (cheap pre-filter)
 * AND a valid passkey session token (see auth.ts). The bundle key alone — which
 * anyone can extract from the PWA — is not sufficient.
 */
async function authorized(request: Request, env: Env): Promise<boolean> {
  return (
    request.headers.get("x-api-key") === env.ATLAS_API_KEY &&
    (await requireSession(request, env))
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method;

    // CORS preflight.
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    // Passkey enrollment / unlock (POST /api/auth/*). Returns null for non-auth paths.
    const authResponse = await handleAuthRoutes(
      request,
      env,
      (raw, status) => jsonResponse(raw, status, request, env),
    );
    if (authResponse) return authResponse;

    // POST /api/health — ingest a payload from Health Auto Export (write key).
    if (method === "POST" && pathname === "/api/health") {
      if (request.headers.get("x-api-key") !== env.API_SECRET) {
        return jsonResponse(JSON.stringify({ error: "forbidden" }), 403, request, env);
      }

      // Store the payload verbatim so it round-trips exactly as received —
      // same semantics as the KV keys this replaced (health:{date}/
      // health:latest); "latest" is just the newest row now, no separate key.
      const body = await request.text();
      const date = todayKey();
      await env.DB.prepare(
        "INSERT INTO health_days (date, raw_json, received_at) VALUES (?, ?, ?) " +
          "ON CONFLICT(date) DO UPDATE SET raw_json = excluded.raw_json, received_at = excluded.received_at",
      )
        .bind(date, body, Date.now())
        .run();

      return jsonResponse(JSON.stringify({ stored: true, date }), 201, request, env);
    }

    // POST /api/workouts — ingest a Workouts+Routes payload from Health Auto Export (write key).
    if (method === "POST" && pathname === "/api/workouts") {
      if (request.headers.get("x-api-key") !== env.API_SECRET) {
        return jsonResponse(JSON.stringify({ error: "forbidden" }), 403, request, env);
      }

      // Store the payload verbatim so it round-trips exactly as received.
      const body = await request.text();
      const date = todayKey();
      await env.DB.prepare(
        "INSERT INTO workout_days (date, raw_json, received_at) VALUES (?, ?, ?) " +
          "ON CONFLICT(date) DO UPDATE SET raw_json = excluded.raw_json, received_at = excluded.received_at",
      )
        .bind(date, body, Date.now())
        .run();

      return jsonResponse(JSON.stringify({ stored: true, date }), 201, request, env);
    }

    // POST /api/ai/nutrition — estimate calories/macros from a meal description.
    if (method === "POST" && pathname === "/api/ai/nutrition") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let text = "";
      try {
        const parsed = (await request.json()) as { text?: unknown };
        text = typeof parsed.text === "string" ? parsed.text.trim() : "";
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (!text || text.length > MEAL_TEXT_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `text required, max ${MEAL_TEXT_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      const prompt = buildNutritionPrompt(text, MICRO_UNITS);

      try {
        const result = await callClaude(env, prompt, NUTRITION_SCHEMA);
        // Force exact, deterministic values for any recognized Finnish foods —
        // prompting alone still let the model drift (see finnishFoods.ts).
        const corrected = applyFinnishFoodOverrides(text, result);
        return jsonResponse(JSON.stringify(corrected), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/ai/supplement — estimate a supplement's micronutrient content.
    if (method === "POST" && pathname === "/api/ai/supplement") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let name = "";
      let dosage = "";
      try {
        const parsed = (await request.json()) as { name?: unknown; dosage?: unknown };
        name = typeof parsed.name === "string" ? parsed.name.trim() : "";
        dosage = typeof parsed.dosage === "string" ? parsed.dosage.trim() : "";
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (!name || name.length > MEAL_TEXT_MAX || dosage.length > MEAL_TEXT_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `name required, max ${MEAL_TEXT_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      const prompt =
        "You are a supplement facts estimator. For the supplement and dosage below, " +
        "estimate the micronutrients it provides at that dose, in these exact units: " +
        MICRO_UNITS + ". Only include nutrients the supplement actually contains; omit the " +
        "rest. Set confidence based on how standardized the product is.\n\n" +
        `Supplement: ${name}\nDosage: ${dosage || "typical serving"}`;

      try {
        const result = await callClaude(env, prompt, SUPPLEMENT_SCHEMA);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/ai/chat — free-text life-assistant chat over a message history.
    if (method === "POST" && pathname === "/api/ai/chat") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let messages: ChatTurn[] = [];
      try {
        const parsed = (await request.json()) as { messages?: unknown };
        messages = parseChatMessages(parsed.messages);
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }

      // Need at least one message, and the last turn must be from the user.
      if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
        return jsonResponse(
          JSON.stringify({ error: "messages required; last turn must be from the user" }),
          400,
          request,
          env,
        );
      }

      try {
        const reply = await callClaudeChat(env, messages);
        return jsonResponse(JSON.stringify({ reply }), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/chat — data-grounded, tool-calling chat: today's snapshot is
    // injected into the system prompt, and the model may call one of
    // ASSISTANT_TOOLS instead of (or before) replying with text. The PWA
    // executes tools client-side (behind a user confirm) and continues the
    // conversation with tool_result blocks — see Assistant.tsx.
    if (method === "POST" && pathname === "/api/chat") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let turns: AssistantTurn[] | null = [];
      let snapshotJson = "";
      try {
        const parsed = (await request.json()) as { messages?: unknown; snapshot?: unknown };
        turns = parseAssistantTurns(parsed.messages);
        const s = parsed.snapshot;
        if (s === null || typeof s !== "object" || Array.isArray(s)) {
          return jsonResponse(JSON.stringify({ error: "snapshot object required" }), 400, request, env);
        }
        snapshotJson = JSON.stringify(s);
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }

      if (!turns || turns.length === 0 || turns[turns.length - 1].role !== "user") {
        return jsonResponse(
          JSON.stringify({ error: "messages required; last turn must be from the user" }),
          400,
          request,
          env,
        );
      }
      if (snapshotJson.length > CHAT_SNAPSHOT_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `snapshot too large, max ${CHAT_SNAPSHOT_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      const systemText =
        "You are the user's personal data assistant. Here is today's data: " +
        snapshotJson +
        ". Use this data to answer questions about the user's day and prefer it for anything " +
        "factual — if a specific figure isn't in the data, say so plainly rather than inventing " +
        "it." +
        WELLBEING_DOMAIN_PROMPT +
        " Use the available tools to actually make changes (targets, calendar, hydration " +
        "goal, meal logging) instead of just describing what the user should do — you may " +
        "call more than one tool in a turn when the request asks for multiple things (e.g. " +
        "log a meal and add a reminder)." +
        TERSE_STYLE;

      try {
        const result = await callClaudeWithTools(env, turns, systemText);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/calendar-parse — extract calendar events/tasks from free text.
    if (method === "POST" && pathname === "/api/calendar-parse") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let text = "";
      let today = "";
      try {
        const parsed = (await request.json()) as { text?: unknown; today?: unknown };
        text = typeof parsed.text === "string" ? parsed.text.trim() : "";
        today = typeof parsed.today === "string" ? parsed.today.trim() : "";
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (!text || text.length > CALENDAR_TEXT_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `text required, max ${CALENDAR_TEXT_MAX} chars` }),
          400,
          request,
          env,
        );
      }
      // Fall back to the Worker's UTC date if the client didn't send a local one.
      const currentDate = /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : todayKey();

      const prompt =
        "Extract calendar events from the user text. Return a JSON array of objects " +
        "{title, date, time, type} where type is 'event' or 'task'. " +
        TASK_VS_EVENT_RULE +
        " Assume the current year " +
        "if not stated. If a day of week is given without a date, resolve it to the next " +
        `occurrence from today's date: ${currentDate}. Use YYYY-MM-DD for date and 24-hour ` +
        "HH:MM for time (use 09:00 if no time is given). No commentary, JSON only.\n\n" +
        "User text:\n" +
        text;

      try {
        const result = await callClaude(env, prompt, CALENDAR_SCHEMA);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/briefing — terse AI daily brief from a metrics object the PWA sends.
    if (method === "POST" && pathname === "/api/briefing") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let metricsJson = "";
      try {
        const parsed = (await request.json()) as { metrics?: unknown };
        const m = parsed.metrics;
        if (m === null || typeof m !== "object" || Array.isArray(m)) {
          return jsonResponse(JSON.stringify({ error: "metrics object required" }), 400, request, env);
        }
        metricsJson = JSON.stringify(m);
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (metricsJson.length > BRIEFING_JSON_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `metrics too large, max ${BRIEFING_JSON_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      const prompt = BRIEFING_PROMPT + "\n\nMetrics (JSON):\n" + metricsJson;

      try {
        const result = await callClaude(env, prompt, BRIEFING_SCHEMA);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/nutrition-gap — largest intake-vs-target gaps + whole-food fixes.
    if (method === "POST" && pathname === "/api/nutrition-gap") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let nutritionJson = "";
      try {
        const parsed = (await request.json()) as { nutrition?: unknown };
        const n = parsed.nutrition;
        if (n === null || typeof n !== "object" || Array.isArray(n)) {
          return jsonResponse(JSON.stringify({ error: "nutrition object required" }), 400, request, env);
        }
        nutritionJson = JSON.stringify(n);
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (nutritionJson.length > NUTRITION_GAP_JSON_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `nutrition too large, max ${NUTRITION_GAP_JSON_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      const prompt = NUTRITION_GAP_PROMPT.replace("{JSON}", nutritionJson);

      try {
        const result = await callClaude(env, prompt, NUTRITION_GAP_SCHEMA);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // POST /api/update-targets — goal-based daily calorie + macro targets.
    if (method === "POST" && pathname === "/api/update-targets") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }

      if (await overRateLimit(env)) {
        return jsonResponse(JSON.stringify({ error: "rate limit exceeded" }), 429, request, env);
      }

      let goal = "";
      let body: Record<string, unknown> = {};
      try {
        body = (await request.json()) as Record<string, unknown>;
        goal = typeof body.goal === "string" ? body.goal.trim() : "";
      } catch {
        return jsonResponse(JSON.stringify({ error: "invalid JSON body" }), 400, request, env);
      }
      if (!goal || goal.length > GOAL_TEXT_MAX) {
        return jsonResponse(
          JSON.stringify({ error: `goal required, max ${GOAL_TEXT_MAX} chars` }),
          400,
          request,
          env,
        );
      }

      // Only include body metrics that were actually provided as numbers.
      const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);
      const stats: string[] = [];
      const weightKg = num(body.weightKg);
      const bmi = num(body.bmi);
      const bodyFatPercentage = num(body.bodyFatPercentage);
      const leanBodyMassKg = num(body.leanBodyMassKg);
      if (weightKg !== null) stats.push(`weight ${weightKg} kg`);
      if (bmi !== null) stats.push(`BMI ${bmi}`);
      if (bodyFatPercentage !== null) stats.push(`body fat ${bodyFatPercentage}%`);
      if (leanBodyMassKg !== null) stats.push(`lean body mass ${leanBodyMassKg} kg`);

      const prompt =
        TARGETS_PROMPT +
        "\n\nCurrent stats: " +
        (stats.length ? stats.join(", ") : "not provided") +
        `\nStated goal: ${goal}`;

      try {
        const result = await callClaude(env, prompt, TARGETS_SCHEMA);
        return jsonResponse(JSON.stringify(result), 200, request, env);
      } catch (err) {
        return jsonResponse(
          JSON.stringify({ error: "ai upstream failed", detail: String(err) }),
          502,
          request,
          env,
        );
      }
    }

    // GET /api/health — the most recently stored payload (read key).
    if (method === "GET" && pathname === "/api/health") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }
      const latest = await env.DB.prepare("SELECT raw_json FROM health_days ORDER BY date DESC LIMIT 1").first<{
        raw_json: string;
      }>();
      return jsonResponse(storedJson(latest?.raw_json ?? null), 200, request, env);
    }

    // GET /api/health/:date — the payload for a specific day (read key).
    if (method === "GET") {
      const match = pathname.match(DATE_PATH);
      if (match) {
        if (!(await authorized(request, env))) {
          return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
        }
        const stored = await env.DB.prepare("SELECT raw_json FROM health_days WHERE date = ?")
          .bind(match[1])
          .first<{ raw_json: string }>();
        return jsonResponse(storedJson(stored?.raw_json ?? null), 200, request, env);
      }
    }

    // GET /api/workouts — the most recently stored workout payload (read key).
    if (method === "GET" && pathname === "/api/workouts") {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }
      const latest = await env.DB.prepare("SELECT raw_json FROM workout_days ORDER BY date DESC LIMIT 1").first<{
        raw_json: string;
      }>();
      return jsonResponse(storedJson(latest?.raw_json ?? null), 200, request, env);
    }

    // GET /api/workouts/:date — the workout payload for a specific day (read key).
    if (method === "GET") {
      const match = pathname.match(WORKOUT_DATE_PATH);
      if (match) {
        if (!(await authorized(request, env))) {
          return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
        }
        const stored = await env.DB.prepare("SELECT raw_json FROM workout_days WHERE date = ?")
          .bind(match[1])
          .first<{ raw_json: string }>();
        return jsonResponse(storedJson(stored?.raw_json ?? null), 200, request, env);
      }
    }

    // GET/POST /api/sync/journal/:yearMonth — the per-month journal store (read/AI key).
    if (pathname.startsWith("/api/sync/journal/")) {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }
      const res = await handleJournalSyncRoute(request, env, pathname, (raw, status) =>
        jsonResponse(raw, status, request, env),
      );
      if (res) return res;
    }

    // GET/POST /api/sync/:domain — every other synced domain (read/AI key).
    const syncDomainMatch = pathname.match(/^\/api\/sync\/([a-zA-Z]+)$/);
    if (syncDomainMatch) {
      if (!(await authorized(request, env))) {
        return jsonResponse(JSON.stringify({ error: "unauthorized" }), 401, request, env);
      }
      const res = await handleFlatSyncRoute(request, env, syncDomainMatch[1], SYNC_REGISTRY, (raw, status) =>
        jsonResponse(raw, status, request, env),
      );
      if (res) return res;
      return jsonResponse(JSON.stringify({ error: "unknown sync domain" }), 404, request, env);
    }

    return jsonResponse(JSON.stringify({ error: "not found" }), 404, request, env);
  },
};
