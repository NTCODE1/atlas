/**
 * Assistant AI client — drives a tool-calling conversation with the atlas-api
 * Worker, grounded in today's data snapshot (the Worker proxies Anthropic
 * Claude and injects the snapshot into the system prompt; the key never
 * reaches the browser).
 *
 * The wire format mirrors Anthropic's Messages API content-block shape
 * directly (text / tool_use / tool_result) so the running conversation
 * round-trips through the Worker with no translation — see Assistant.tsx for
 * the loop that drives multi-turn tool calls to completion.
 *
 * Mirrors nutritionAI.ts conventions otherwise: reads the Worker base URL from
 * env, uses an AbortController timeout, and never throws — any failure
 * resolves to `null` so the Assistant screen can show a graceful fallback.
 */

import type { TodaySnapshot } from '../hooks/useTodaySnapshot'
import { authHeaders } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
/** Low-privilege read/AI key sent to the Worker (rate-limited server-side). */
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

/** Chat is a multi-turn LLM call — allow generous headroom. */
const TIMEOUT_MS = 20000

/** A persisted, human-readable chat turn — what's rendered in the thread. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

/** One Anthropic tool call the assistant wants to make. */
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

/** One turn of the live tool-calling conversation sent to/received from the Worker. */
export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export type AssistantTurnResult =
  | { done: true; reply: string }
  | { done: false; content: ContentBlock[] }

/** Join base URL + path without a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

function isToolUseBlock(v: unknown): v is ToolUseBlock {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return o.type === 'tool_use' && typeof o.id === 'string' && typeof o.name === 'string'
}

function isTextBlock(v: unknown): v is TextBlock {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return o.type === 'text' && typeof o.text === 'string'
}

/**
 * Send the running conversation (already including the user's latest turn) to
 * the assistant, grounded in `snapshot`. Returns either a final text reply
 * (`done: true`) or the raw content blocks of a tool-calling turn for the
 * caller to execute and continue (`done: false`), or `null` on any failure
 * (unset config, network, timeout, non-OK status, bad shape).
 */
export async function sendAssistantTurn(
  turns: AssistantTurn[],
  snapshot: TodaySnapshot,
): Promise<AssistantTurnResult | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[assistantAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping AI chat')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ messages: turns, snapshot }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { reply?: unknown; done?: unknown; content?: unknown }

    if (json.done === false) {
      const blocks = Array.isArray(json.content) ? json.content : []
      const content = blocks.filter((b): b is ContentBlock => isTextBlock(b) || isToolUseBlock(b))
      if (content.length === 0) {
        console.warn('[assistantAI] tool-use turn had no usable content', json)
        return null
      }
      return { done: false, content }
    }

    if (typeof json.reply !== 'string' || json.reply.trim() === '') {
      console.warn('[assistantAI] unexpected response shape', json)
      return null
    }
    return { done: true, reply: json.reply }
  } catch (err) {
    console.warn('[assistantAI] chat failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
