/**
 * Shared "how much of this food does the text actually mean" parsing, used
 * by both finnishFoods.ts (the hand-curated table) and fineliMatch.ts (the
 * generated Fineli lookup) so the two matchers can't drift on quantity
 * parsing. Extracted unchanged from finnishFoods.ts — see that file's header
 * for the original context (the "2 slices ohut kaura leipä..." bug report).
 */

/** 1-10 in English and Finnish, for quantities written as words rather than digits. */
export const QUANTITY_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  yksi: 1,
  kaksi: 2,
  kolme: 3,
  neljä: 4,
  viisi: 5,
  kuusi: 6,
  seitsemän: 7,
  kahdeksan: 8,
  yhdeksän: 9,
  kymmenen: 10,
}

/**
 * Serving-unit words that may sit between a quantity and the food name
 * ("2 slices X", "4 viipale Y"). `\w*` suffixes on the Finnish stems (rather
 * than enumerating "viipale"/"viipaletta"/"viipaleen"/… one by one) so any
 * case-inflected form matches — the earlier bug here was matching only
 * "viipaletta" and missing the far more common bare "viipale", which
 * silently defaulted affected items' quantity to 1.
 */
export const UNIT_WORD = '(?:slices?|pieces?|pcs?|viipale\\w*|pala\\w*|kpl|kappale\\w*|pkt|purkki\\w*|paketti\\w*)'

/** Quantity immediately preceding position `index` in normalized text `t`; defaults to 1 if none found. */
export function quantityBefore(t: string, index: number): number {
  const before = t.slice(Math.max(0, index - 40), index)
  const digitMatch = new RegExp(`(\\d+)\\s*${UNIT_WORD}?\\s*$`, 'i').exec(before)
  if (digitMatch) return parseInt(digitMatch[1], 10)
  const numberWords = Object.keys(QUANTITY_WORDS).join('|')
  const wordMatch = new RegExp(`\\b(${numberWords})\\s*${UNIT_WORD}?\\s*$`, 'i').exec(before)
  if (wordMatch) return QUANTITY_WORDS[wordMatch[1].toLowerCase()] ?? 1
  return 1
}

/**
 * A trailing "N kpl"/"N kappaletta" — Finnish for "N pieces" — is the
 * definitive per-unit count and overrides any vaguer package quantifier
 * before the food name (e.g. "1 pkt Atria nakit, 4 kpl" is 4 sausages, not
 * 1). Bounded to a short lookahead so it can't bleed into a later, unrelated
 * item's own "N kpl" in a longer list.
 */
export function trailingKplCount(t: string, from: number): number | null {
  const after = t.slice(from, from + 24)
  const match = /^[^\d]{0,16}?(\d+)\s*(?:kpl|kappaletta?)\b/i.exec(after)
  return match ? parseInt(match[1], 10) : null
}

/** An explicit "N g"/"N grammaa" weight immediately before the food name, e.g. "200g raejuusto". */
export function gramQuantityBefore(t: string, index: number): number | null {
  const before = t.slice(Math.max(0, index - 40), index)
  const match = /(\d+(?:[.,]\d+)?)\s*(?:g|grammaa?)\s*$/i.exec(before)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

/**
 * Grams per 1 dl (100ml) — the standard practical approximation used for
 * both liquids and porridge-like foods (≈ water density; the difference for
 * milk/porridge is negligible at this precision).
 */
export const G_PER_DL = 100

/** An explicit "N dl"/"N desilitraa" volume immediately before the food name, e.g. "1 dl kaurapuuro". */
export function dlQuantityBefore(t: string, index: number): number | null {
  const before = t.slice(Math.max(0, index - 40), index)
  const match = /(\d+(?:[.,]\d+)?)\s*(?:dl|desilitraa?|desiä?)\s*$/i.exec(before)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

export interface ResolvedQuantity {
  grams: number
  /** Human-readable quantity for the item label, e.g. "4 kpl", "200 g", "1 dl", "2 slice". */
  label: string
}

/**
 * Resolves how much of a food (with a known typical single-serving weight
 * `unitG`/`unitLabel`, e.g. one slice, one glass) is actually meant, trying
 * the most explicit/unambiguous signal in the text first:
 *   1. a trailing "N kpl" piece-count (wins over a leading package word)
 *   2. an explicit gram weight ("200g raejuusto")
 *   3. an explicit volume in dl ("1 dl kaurapuuro" → 100g, not a full "bowl")
 *   4. a discrete unit count immediately before the name ("4 viipale X")
 *   5. default: exactly one of `unitG`
 */
export function resolveQuantity(
  t: string,
  index: number,
  aliasLen: number,
  unitG: number,
  unitLabel: string,
): ResolvedQuantity {
  const kpl = trailingKplCount(t, index + aliasLen)
  if (kpl !== null) return { grams: unitG * kpl, label: `${kpl} kpl` }

  const grams = gramQuantityBefore(t, index)
  if (grams !== null) return { grams, label: `${grams} g` }

  const dl = dlQuantityBefore(t, index)
  if (dl !== null) return { grams: dl * G_PER_DL, label: `${dl} dl` }

  const count = quantityBefore(t, index)
  return { grams: unitG * count, label: `${count} ${unitLabel}` }
}

/**
 * Resolves an EXPLICIT weight only — an actual gram or dl amount stated in
 * the text — without any "default to one serving" fallback. Used for foods
 * with no known typical-serving weight (the generated Fineli table has no
 * per-item serving-size data, unlike the hand-curated FINNISH_FOOD_REFERENCE
 * table's `unitG`), where guessing a default portion would silently
 * reintroduce the same kind of inaccuracy this whole mechanism exists to
 * remove. Returns `null` (not a fallback guess) when the text states no
 * explicit amount — callers should fall back to giving the model reference
 * numbers rather than forcing a total.
 */
export function resolveExplicitWeightGrams(t: string, index: number): ResolvedQuantity | null {
  const grams = gramQuantityBefore(t, index)
  if (grams !== null) return { grams, label: `${grams} g` }

  const dl = dlQuantityBefore(t, index)
  if (dl !== null) return { grams: dl * G_PER_DL, label: `${dl} dl` }

  return null
}
