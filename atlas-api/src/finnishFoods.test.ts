/**
 * Validates the Finnish food-knowledge fix for the /api/ai/nutrition
 * estimator against the reported bug: "2 slices ohut kaura leipä, 4 slices
 * Oltermanni cheese, 2 slices meetvursti" was estimated at ~1500 kcal.
 *
 * The real total is a normal open-sandwich snack:
 *   2 × 17g ohut kaura leipä  (260 kcal/100g) =  88 kcal
 *   4 × 20g Oltermanni        (330 kcal/100g) = 264 kcal
 *   2 ×  9g meetvursti        (350 kcal/100g) =  63 kcal
 *   total                                     = 415 kcal
 *
 * Run with: node --test src/finnishFoods.test.ts
 * (Node's built-in test runner — no extra dependency needed.)
 *
 * Two tiers:
 *   1. Deterministic checks (always run, no network) — quantity extraction,
 *      per-item arithmetic, and the override step land on the exact real
 *      total regardless of what any model returns.
 *   2. An optional LIVE check against the real Anthropic API using the exact
 *      prompt + override pipeline the server runs (buildNutritionPrompt +
 *      applyFinnishFoodOverrides) — skipped automatically unless
 *      ANTHROPIC_API_KEY is available (env var, or atlas-api/.dev.vars for
 *      local runs), since it costs a real API call.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  matchFinnishFoods,
  finnishFoodReferenceBlock,
  buildNutritionPrompt,
  extractFinnishFoodItems,
  applyFinnishFoodOverrides,
  finnishItemLabel,
} from "./finnishFoods.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The exact meal text from the bug report. */
const BUG_REPORT_MEAL =
  "2 slices ohut kaura leipä, 4 slices Oltermanni cheese, 2 slices meetvursti";

/** The true total for the bug-report meal (see file header for the arithmetic). */
const EXPECTED_TOTAL_KCAL = 415;
/** The originally-reported (wrong) estimate — the fix must land far below this. */
const BUG_REPORTED_KCAL = 1500;

test("matches all three reported Finnish items by name", () => {
  const matches = matchFinnishFoods(BUG_REPORT_MEAL);
  const names = matches.map((m) => m.name);
  assert.ok(names.some((n) => n.includes("kaura")), "should match ohut kaura leipä");
  assert.ok(names.some((n) => n.includes("Oltermanni")), "should match Oltermanni");
  assert.ok(names.some((n) => n.includes("Meetvursti")), "should match meetvursti");
  assert.equal(matches.length, 3, "should not match anything extra");
});

test("reference macros are realistic for each item (sanity bounds from public label data)", () => {
  const byAlias = (alias: string) =>
    matchFinnishFoods(alias).find((m) => m.aliases.includes(alias))!;

  const breadRef = byAlias("ohut kaura leipä");
  assert.ok(breadRef.kcal100 >= 200 && breadRef.kcal100 <= 300, "thin bread ~200-300 kcal/100g");
  assert.ok(breadRef.unitG <= 25, "a thin Finnish bread slice is well under 25g");

  const cheeseRef = byAlias("oltermanni");
  assert.ok(cheeseRef.kcal100 >= 300 && cheeseRef.kcal100 <= 360, "Oltermanni ~330 kcal/100g");
  assert.ok(cheeseRef.fat100 >= 20 && cheeseRef.fat100 <= 30, "Oltermanni ~26g fat/100g");
  assert.ok(cheeseRef.unitG <= 25, "a deli cheese slice is well under 25g");

  const sausageRef = byAlias("meetvursti");
  assert.ok(sausageRef.kcal100 >= 300 && sausageRef.kcal100 <= 400, "meetvursti ~350 kcal/100g");
  assert.ok(sausageRef.unitG <= 15, "a meetvursti slice is thin, well under 15g");
});

test("extracts the correct quantity (2/4/2) for each item from the reported meal text", () => {
  const items = extractFinnishFoodItems(BUG_REPORT_MEAL);
  assert.equal(items.length, 3);
  const byName = (n: string) => items.find((it) => it.ref.name.includes(n))!;
  assert.equal(byName("kaura").quantityLabel, "2 slice");
  assert.equal(byName("Oltermanni").quantityLabel, "4 slice");
  assert.equal(byName("Meetvursti").quantityLabel, "2 slice");
});

test("deterministic per-item arithmetic sums to exactly the real total (415 kcal), not ~1500", () => {
  const items = extractFinnishFoodItems(BUG_REPORT_MEAL);
  const total = items.reduce((sum, it) => sum + it.kcal, 0);
  assert.equal(total, EXPECTED_TOTAL_KCAL);
  assert.ok(total < BUG_REPORTED_KCAL / 2, "must land far below the originally-reported ~1500 kcal");
});

test("prompt sent to the model includes exact pre-computed numbers for all three items", () => {
  const prompt = buildNutritionPrompt(BUG_REPORT_MEAL, "iron mg, calcium mg");
  const items = extractFinnishFoodItems(BUG_REPORT_MEAL);
  for (const it of items) {
    assert.ok(prompt.includes(finnishItemLabel(it)), `prompt should name "${finnishItemLabel(it)}"`);
    assert.ok(prompt.includes(`kcal: ${it.kcal}`), `prompt should give the exact kcal for ${finnishItemLabel(it)}`);
  }
});

test("text with no Finnish foods gets no reference block and is a no-op for overrides", () => {
  const text = "grilled chicken breast with rice and broccoli";
  assert.equal(finnishFoodReferenceBlock(text), "");
  const original = { totalKcal: 500, protein: 40, carbs: 50, fat: 10 };
  assert.deepEqual(applyFinnishFoodOverrides(text, original), original);
});

test("applyFinnishFoodOverrides forces the exact real total even when the model's own numbers are wrong", () => {
  // Simulates the actual observed bug: told the right numbers, the model still
  // returned ~599 kcal instead of 415. The override must correct this regardless.
  const wrongModelOutput = {
    totalKcal: 599,
    protein: 45,
    carbs: 30,
    fat: 38,
    confidence: "medium",
    items: [
      { name: "Bread with cheese and cold cuts", kcal: 599, protein: 45, carbs: 30, fat: 38 },
    ],
  };
  const corrected = applyFinnishFoodOverrides(BUG_REPORT_MEAL, wrongModelOutput) as typeof wrongModelOutput;
  assert.equal(corrected.totalKcal, EXPECTED_TOTAL_KCAL);
  assert.equal(corrected.confidence, "high", "fully deterministic once all items are recognized");
  assert.equal(corrected.items.length, 3, "the model's own single lumped item is replaced by the three real ones");
});

test("a genuinely extra, unrecognized food in the same meal is kept, not swallowed by the backstop", () => {
  const mixedMeal = BUG_REPORT_MEAL + " and a banana";
  const modelOutput = {
    totalKcal: 999, // wrong on purpose — must be ignored in favor of the re-derived sum
    protein: 1,
    carbs: 1,
    fat: 1,
    confidence: "medium",
    items: [
      // Deliberately NOT using the exact known labels, to prove this isn't kept
      // merely by accident of matching — it survives because hasLeftoverFood
      // sees "banana" as unaccounted-for text.
      { name: "Banana", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ],
  };
  const corrected = applyFinnishFoodOverrides(mixedMeal, modelOutput) as typeof modelOutput;
  assert.equal(corrected.items.length, 4, "3 known items plus the genuinely extra banana");
  assert.ok(corrected.items.some((it) => it.name === "Banana"));
  assert.equal(corrected.totalKcal, EXPECTED_TOTAL_KCAL + 105);
});

/** Best-effort local .dev.vars loader — dev convenience only, no new dependency. */
function readAnthropicKeyFromDevVars(): string | null {
  const path = join(__dirname, "..", ".dev.vars");
  if (!existsSync(path)) return null;
  const match = readFileSync(path, "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

const liveApiKey = process.env.ANTHROPIC_API_KEY || readAnthropicKeyFromDevVars();

test(
  "LIVE: the full pipeline (real model call + override) lands on the exact real total, not ~1500 kcal",
  { skip: !liveApiKey && "no ANTHROPIC_API_KEY available (set env var or atlas-api/.dev.vars)" },
  async () => {
    const client = new Anthropic({ apiKey: liveApiKey! });
    const microUnits =
      "iron mg, calcium mg, vitaminD µg, vitaminB12 µg, zinc mg, magnesium mg, potassium mg, " +
      "fibre g, omega3 g, vitaminC mg, folate µg, creatine g";
    const prompt = buildNutritionPrompt(BUG_REPORT_MEAL, microUnits);
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              totalKcal: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fat: { type: "number" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    kcal: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                  },
                  required: ["name", "kcal", "protein", "carbs", "fat"],
                  additionalProperties: false,
                },
              },
            },
            required: ["totalKcal", "protein", "carbs", "fat", "confidence", "items"],
            additionalProperties: false,
          },
        },
      },
    });
    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
    assert.ok(text, "expected a text response from the model");
    const rawResult = JSON.parse(text!) as { totalKcal: number };

    console.log(
      `[live] raw model estimate: ${rawResult.totalKcal} kcal ` +
        `(previously reported bug: ~${BUG_REPORTED_KCAL} kcal)`,
    );

    const corrected = applyFinnishFoodOverrides(BUG_REPORT_MEAL, rawResult) as { totalKcal: number };
    console.log(`[live] after override: ${corrected.totalKcal} kcal (real total: ${EXPECTED_TOTAL_KCAL} kcal)`);

    // The override is unconditional for fully-recognized meals like this one, so
    // this must be exact — not just "in the ballpark" — regardless of what the
    // raw model call returned above.
    assert.equal(corrected.totalKcal, EXPECTED_TOTAL_KCAL);
  },
);
