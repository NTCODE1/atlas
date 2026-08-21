/**
 * Matches meal text against the generated Fineli food-composition data
 * (fineliFoods.generated.ts) — the fallback grounding layer behind
 * finnishFoods.ts's hand-curated FINNISH_FOOD_REFERENCE table. See that
 * file's header for the overall two-layer design (manual table wins when it
 * matches; this covers everything else, generic staples included).
 *
 * At ~4,000 entries, naive substring matching (fine for finnishFoods.ts's
 * ~15 hand-picked aliases) would false-positive constantly on short generic
 * names ("vesi"/water, "riisi"/rice embedded in unrelated words). Instead:
 *
 *   1. Tokenize the text into words and try each Fineli food's "head" — its
 *      FOODNAME up to the first comma (Fineli names are formal, comma-
 *      qualified lab-catalog strings, e.g. "Broileri, rintafilee, paistettu,
 *      nahaton" — casual meal text names the head, not the full qualifier
 *      chain) — as a contiguous, whole-word phrase match. Both the Finnish
 *      and English name are indexed.
 *   2. Tolerate simple Finnish/English case endings and plurals by trying a
 *      text token with 0-3 trailing characters stripped (partitive -a/-ä,
 *      genitive -n, English -s, ...) against the exact stored head — an
 *      approximation, not a real morphological analyzer; it won't catch a
 *      genuine stem change (e.g. "lohta", the irregular partitive of "lohi").
 *   3. Many Fineli foods share the same head (20+ "Riisi, ..." variants —
 *      raw/cooked/salted/fried/...). When the text gives no way to tell
 *      which one is meant, this is deliberately NOT resolved by guessing —
 *      same "only force what we're actually certain about" rule as the rest
 *      of this override pipeline. fineliAliases.ts hand-picks a sensible
 *      default for the common staples where that would otherwise block
 *      everything (a bare "riisiä" would never resolve); everything else
 *      with an ambiguous head is left for the model, unchanged from today.
 *   4. Even for a food whose identity IS unambiguous, an amount is only
 *      forced when the text states one explicitly (grams or dl — see
 *      foodQuantity.ts's resolveExplicitWeightGrams). Fineli's dataset has
 *      no "typical serving size" field (unlike FINNISH_FOOD_REFERENCE's
 *      hand-picked `unitG`), so guessing a default portion for a generic
 *      staple would silently reintroduce the same kind of inaccuracy this
 *      mechanism exists to remove. Without an explicit amount, the match is
 *      still useful — its per-100g numbers go into the prompt as a reference
 *      anchor (real numbers instead of a blind guess) — just not force-
 *      overridden into the response.
 */

import { FINELI_FOODS, type FineliFoodRef } from './fineliFoods.generated.ts'
import { FINELI_ALIASES } from './fineliAliases.ts'
import { resolveExplicitWeightGrams } from './foodQuantity.ts'

const round2 = (n: number) => Math.round(n * 100) / 100

/** The 11 food-sourced micronutrients we ground (everything MICRO_META tracks except supplement-only creatine — see micros.ts). */
export type FoodMicroKey =
  | 'iron'
  | 'calcium'
  | 'vitaminD'
  | 'vitaminB12'
  | 'zinc'
  | 'magnesium'
  | 'potassium'
  | 'fibre'
  | 'omega3'
  | 'vitaminC'
  | 'folate'

/** Clean micro key -> the generated data's per-100g field name it's sourced from. */
const MICRO_FIELD: Record<FoodMicroKey, keyof FineliFoodRef> = {
  iron: 'iron100',
  calcium: 'calcium100',
  vitaminD: 'vitaminD100',
  vitaminB12: 'vitaminB12_100',
  zinc: 'zinc100',
  magnesium: 'magnesium100',
  potassium: 'potassium100',
  fibre: 'fibre100',
  omega3: 'omega3_100',
  vitaminC: 'vitaminC100',
  folate: 'folate100',
}
const MICRO_KEYS = Object.keys(MICRO_FIELD) as FoodMicroKey[]

interface MatchEntry {
  candidates: FineliFoodRef[]
  /** True only when exactly one food owns this key (directly, or via a hand-picked alias). */
  overrideEligible: boolean
}

/** A food's FOODNAME up to the first comma, lowercased and word-split — Fineli's qualifier chain (raw/cooked/salted/...) starts after that comma. */
function headWords(name: string): string[] {
  return name
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/** Built once per Worker isolate (module scope persists across requests) — see this file's header for the matching strategy. */
function buildIndex(): { index: Map<string, MatchEntry>; maxWords: number } {
  const index = new Map<string, MatchEntry>()
  let maxWords = 1

  const addHead = (words: string[], food: FineliFoodRef) => {
    // Keep matching bounded to short, meal-text-realistic phrases — Fineli's
    // longer head phrases (still qualifier-heavy even before the first
    // comma) aren't what casual meal text names.
    if (words.length === 0 || words.length > 3) return
    const key = words.join(' ')
    const existing = index.get(key)
    if (existing) existing.candidates.push(food)
    else index.set(key, { candidates: [food], overrideEligible: true })
    maxWords = Math.max(maxWords, words.length)
  }

  for (const food of FINELI_FOODS) {
    addHead(headWords(food.nameFi), food)
    addHead(headWords(food.nameEn), food)
  }
  for (const entry of index.values()) {
    if (entry.candidates.length > 1) entry.overrideEligible = false
  }

  const byId = new Map(FINELI_FOODS.map((f) => [f.id, f]))
  for (const [alias, id] of Object.entries(FINELI_ALIASES)) {
    const food = byId.get(id)
    if (!food) throw new Error(`fineliAliases.ts: unknown FINELI_FOODS id ${id} for "${alias}"`)
    const words = alias.toLowerCase().split(/\s+/).filter(Boolean)
    // Aliases are hand-picked, so they always win outright and are always
    // override-eligible — overwriting whatever ambiguous/unambiguous head
    // group happened to already occupy the same key.
    index.set(words.join(' '), { candidates: [food], overrideEligible: true })
    maxWords = Math.max(maxWords, words.length)
  }

  return { index, maxWords }
}

const { index: FOOD_INDEX, maxWords: MAX_WORDS } = buildIndex()

interface TextToken {
  word: string
  /** Character offset of this token's first character in the normalized text. */
  start: number
  /** Character offset just past this token's last character. */
  end: number
}

function tokenize(t: string): TextToken[] {
  const tokens: TextToken[] = []
  const re = /[a-zäöå]+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    tokens.push({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length })
  }
  return tokens
}

const STRIP_LENGTHS = [0, 1, 2, 3]

/** Plausible base-form stems for one text token, least-stripped (most exact) first — see this file's header for what this can and can't tolerate. */
function stemsOf(word: string): string[] {
  const stems: string[] = []
  for (const n of STRIP_LENGTHS) {
    if (word.length - n < 3) break
    stems.push(word.slice(0, word.length - n))
  }
  return stems.length > 0 ? stems : [word]
}

/** All stemmed forms of the phrase spanning tokens[start..start+len), tried least-stripped-first per word (see stemsOf), as space-joined keys for a FOOD_INDEX lookup. */
function* phraseStems(tokens: TextToken[], start: number, len: number): Generator<string> {
  if (len === 1) {
    for (const s of stemsOf(tokens[start].word)) yield s
    return
  }
  if (len === 2) {
    for (const s1 of stemsOf(tokens[start].word)) {
      for (const s2 of stemsOf(tokens[start + 1].word)) yield `${s1} ${s2}`
    }
    return
  }
  for (const s1 of stemsOf(tokens[start].word)) {
    for (const s2 of stemsOf(tokens[start + 1].word)) {
      for (const s3 of stemsOf(tokens[start + 2].word)) yield `${s1} ${s2} ${s3}`
    }
  }
}

interface FoundMatch {
  entry: MatchEntry
  tokenStart: number
  tokenEnd: number
  textStart: number
  textEnd: number
}

/** All index hits in `tokens`, longest phrase first (so a 2-3 word match is preferred over a shorter one at the same position), not yet de-overlapped. */
function findMatches(tokens: TextToken[]): FoundMatch[] {
  const found: FoundMatch[] = []
  for (let len = Math.min(MAX_WORDS, tokens.length); len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      for (const key of phraseStems(tokens, i, len)) {
        const entry = FOOD_INDEX.get(key)
        if (entry) {
          found.push({
            entry,
            tokenStart: i,
            tokenEnd: i + len,
            textStart: tokens[i].start,
            textEnd: tokens[i + len - 1].end,
          })
          break // first (least-stripped) hit for this position+length wins
        }
      }
    }
  }
  return found
}

/** Greedily keeps found matches left-to-right, preferring longer phrases, dropping anything that overlaps an already-claimed token range. */
function dedupeOverlaps(matches: FoundMatch[]): FoundMatch[] {
  const byLengthDesc = [...matches].sort((a, b) => b.tokenEnd - b.tokenStart - (a.tokenEnd - a.tokenStart))
  const claimed: [number, number][] = []
  const kept: FoundMatch[] = []
  for (const m of byLengthDesc) {
    const overlaps = claimed.some(([s, e]) => m.tokenStart < e && s < m.tokenEnd)
    if (overlaps) continue
    claimed.push([m.tokenStart, m.tokenEnd])
    kept.push(m)
  }
  return kept.sort((a, b) => a.tokenStart - b.tokenStart)
}

export interface FineliMatchedItem {
  food: FineliFoodRef
  grams: number
  quantityLabel: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Only the food-sourced micros Fineli actually has a value for (see this file's header, point 4, and fineliFoods.generated.ts's field-omission comment) — never a false zero for an unmeasured one. */
  micros: Partial<Record<FoodMicroKey, number>>
  /** The exact substring of the (already-normalized) text this item was matched from — lets a caller merging this with another matcher's results (finnishFoods.ts) mask it out so the same words aren't double-counted or flagged as unaccounted-for. */
  matchedText: string
}

export interface FineliMatchResult {
  /** Unambiguous identity AND an explicit weight in the text — deterministic, override-eligible. */
  items: FineliMatchedItem[]
  /** Unambiguous identity but no explicit weight — real per-100g numbers for the prompt, not forced into the response. */
  references: FineliFoodRef[]
}

/** Stable label used both in the prompt and to match the model's response back up, mirroring finnishItemLabel's role for the manual table. */
export function fineliItemLabel(item: Pick<FineliMatchedItem, 'food' | 'quantityLabel'>): string {
  return `${item.food.nameFi} x${item.quantityLabel}`
}

/**
 * Finds Fineli foods mentioned in `text` (already lowercased/normalized —
 * callers pass the same normalized text used elsewhere in this override
 * pipeline). See this file's header for the full matching + override-
 * eligibility rules.
 */
export function matchFineliFoods(text: string): FineliMatchResult {
  const tokens = tokenize(text)
  const matches = dedupeOverlaps(findMatches(tokens))

  const items: FineliMatchedItem[] = []
  const references: FineliFoodRef[] = []

  for (const m of matches) {
    if (!m.entry.overrideEligible) continue // ambiguous head, no alias to break the tie — leave to the model
    const food = m.entry.candidates[0]

    const weight = resolveExplicitWeightGrams(text, m.textStart)
    if (!weight) {
      references.push(food)
      continue
    }

    const micros: FineliMatchedItem['micros'] = {}
    for (const key of MICRO_KEYS) {
      const per100 = food[MICRO_FIELD[key]]
      if (typeof per100 === 'number') micros[key] = round2((per100 / 100) * weight.grams)
    }

    items.push({
      food,
      grams: weight.grams,
      quantityLabel: weight.label,
      kcal: Math.round(((food.kcal100 ?? 0) / 100) * weight.grams),
      protein: round2(((food.protein100 ?? 0) / 100) * weight.grams),
      carbs: round2(((food.carbs100 ?? 0) / 100) * weight.grams),
      fat: round2(((food.fat100 ?? 0) / 100) * weight.grams),
      micros,
      matchedText: text.slice(m.textStart, m.textEnd),
    })
  }

  return { items, references }
}
