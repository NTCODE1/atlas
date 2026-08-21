/**
 * Finnish grocery-food knowledge for the nutrition estimator (POST
 * /api/ai/nutrition). Left to itself, the model regularly hallucinates
 * portion sizes and macros for Finnish product names it doesn't recognize —
 * e.g. treating "ohut kaura leipä" (thin oat-rye bread, ~15-20g/slice) like a
 * thick Western sandwich slice, or guessing "meetvursti" (a thin-sliced
 * cured sausage cold cut) as a full sausage portion. That combination is what
 * turned a real ~400 kcal open sandwich (2 thin bread slices + 4 cheese
 * slices + 2 cold-cut slices) into a reported ~1500 kcal estimate — see
 * finnishFoods.test.ts for the worked-out real values.
 *
 * Two layers, because prompting alone wasn't enough — even after telling the
 * model the exact per-100g macros and portion sizes below, it still overshot
 * the true ~415 kcal by ~45% (599 kcal), i.e. it was TOLD the right numbers
 * but didn't reliably arithmetic its way to them:
 *
 *   1. A reference table of everyday Finnish products (per-100g macros
 *      sourced from public nutrition-label data — Valio, Fazer, Atria,
 *      Fineli — plus each item's typical single-serving weight), matched
 *      against the meal text and injected into the prompt so the model has
 *      real anchors instead of a blind guess.
 *   2. Deterministic extraction + multiplication in code
 *      (extractFinnishFoodItems) for any recognized item, with quantity
 *      parsed straight from the text (e.g. "4 slices Oltermanni" → 4 × 20g @
 *      330 kcal/100g). applyFinnishFoodOverrides then forces these exact
 *      numbers into the model's response after the call, regardless of what
 *      it actually returned — so known items are exact, not merely
 *      well-prompted.
 *
 * This table is deliberately small and hand-picked — for everything it
 * doesn't cover, buildNutritionPrompt/applyFinnishFoodOverrides fall back to
 * fineliMatch.ts, the same two-step "prompt + force-override" idea applied
 * automatically against ~4,050 generic and Finnish foods from Fineli's open
 * data (fineliFoods.generated.ts). This table still wins when both would
 * match the same word (see maskKnownAliases) — it exists for foods the
 * Fineli layer, by its own more conservative rules, won't confidently
 * resolve on its own (exact branded portion sizes, common Finnish products
 * whose real serving size differs sharply from a naive guess).
 */

export interface FinnishFoodRef {
  /** Canonical display name (English gloss in parentheses). */
  name: string
  /** Lowercase match terms — canonical Finnish name plus common aliases/spellings. */
  aliases: string[]
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  /** mg per 100g. */
  iron100: number
  /** mg per 100g. */
  calcium100: number
  /** mg per 100g. */
  vitaminC100: number
  /** mg per 100g. */
  potassium100: number
  /** Typical weight (g) of one common serving unit (a slice, a glass, a bowl…). */
  unitG: number
  unitLabel: string
}

/**
 * Per-100g macros for common everyday Finnish grocery items — deliberately a
 * small, high-confidence set rather than an exhaustive database. Extend this
 * list as more mis-estimated products turn up.
 */
export const FINNISH_FOOD_REFERENCE: FinnishFoodRef[] = [
  {
    // Macros: category estimate (thin Finnish oat/rye bread). Micros: no
    // thin-bread-specific figures published, so proxied from the same
    // Fineli rye-bread entry as "Ruisleipä" below (bmi.fi mirror of Fineli,
    // "Ruisleipä, ruisrouheleipä, perunainen, ruispalat") — minerals are a
    // per-100g property of the category, not the slice thickness.
    name: 'Ohut kaura-/ruisleipä (thin oat/rye bread)',
    aliases: ['ohut kaura leipä', 'ohut kauraleipä', 'ohut ruisleipä', 'ohut leipä', 'kauraleipä'],
    kcal100: 260,
    protein100: 9,
    carbs100: 44,
    fat100: 3,
    iron100: 2.2,
    calcium100: 34,
    vitaminC100: 1.0,
    potassium100: 448,
    unitG: 17,
    unitLabel: 'slice',
  },
  {
    // Source (micros): bmi.fi (Fineli mirror), "Ruisleipä, ruisrouheleipä,
    // perunainen, ruispalat" — iron 2.17mg, calcium 34.14mg, potassium
    // 447.79mg, vitaminC 1.04mg per 100g. Rye bread commonly has a little
    // vitamin C from ascorbic acid used as a dough conditioner, not fruit.
    name: 'Ruisleipä (regular rye bread)',
    aliases: ['ruisleipä', 'ruispala', 'reissumies'],
    kcal100: 220,
    protein100: 7,
    carbs100: 43,
    fat100: 1.5,
    iron100: 2.2,
    calcium100: 34,
    vitaminC100: 1.0,
    potassium100: 448,
    unitG: 30,
    unitLabel: 'slice',
  },
  {
    // Source (micros): kilokalori.net (Fineli), "Näkkileipä, kauranäkkileipä,
    // Wasa" — iron 3.5mg, calcium 40.9mg, potassium 333.9mg, vitaminC 0mg
    // per 100g.
    name: 'Näkkileipä (crispbread)',
    aliases: ['näkkileipä', 'näkkäri', 'finn crisp'],
    kcal100: 330,
    protein100: 10,
    carbs100: 65,
    fat100: 2,
    iron100: 3.5,
    calcium100: 41,
    vitaminC100: 0,
    potassium100: 334,
    unitG: 12,
    unitLabel: 'piece',
  },
  {
    // Source (micros): fatsecret.fi, Valio Oltermanni official label —
    // calcium 770mg, potassium 71mg per 100g. Iron isn't published on
    // Oltermanni's own label; proxied from Edam (below, same semi-hard
    // cheese category, 0.21mg/100g) since cheese iron content is both low
    // and fairly uniform across this category.
    name: 'Oltermanni (Valio semi-hard cheese)',
    aliases: ['oltermanni'],
    kcal100: 330,
    protein100: 25,
    carbs100: 0.5,
    fat100: 26,
    iron100: 0.21,
    calcium100: 770,
    vitaminC100: 0,
    potassium100: 71,
    unitG: 20,
    unitLabel: 'slice',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Juusto, kova pienikoloinen juusto,
    // rasvaa 24-27%, edam" — iron 0.21mg, calcium 893mg, potassium 80mg,
    // vitaminC 0mg per 100g.
    name: 'Edam/Polar-tyyppinen juusto (Edam-style cheese)',
    aliases: ['edam', 'polar juusto'],
    kcal100: 310,
    protein100: 25,
    carbs100: 0.5,
    fat100: 23,
    iron100: 0.21,
    calcium100: 893,
    vitaminC100: 0,
    potassium100: 80,
    unitG: 20,
    unitLabel: 'slice',
  },
  {
    // Source (micros): kilokalori.net (Fineli), "Meetvursti" — iron 2.2mg,
    // calcium 21.7mg, potassium 392.2mg, vitaminC 0mg per 100g.
    name: 'Meetvursti (cured sausage cold cut)',
    aliases: ['meetvursti', 'meetwursti'],
    kcal100: 350,
    protein100: 15,
    carbs100: 1,
    fat100: 32,
    iron100: 2.2,
    calcium100: 22,
    vitaminC100: 0,
    potassium100: 392,
    unitG: 9,
    unitLabel: 'slice',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Kokolihaleikkele, kinkkuleikkele,
    // vähärasvainen, rasvaa 3%" — iron 0.64mg, calcium 6.0mg, potassium
    // 260mg, vitaminC 0mg per 100g.
    name: 'Keittokinkku (cooked ham slice)',
    aliases: ['kinkku', 'keittokinkku'],
    kcal100: 120,
    protein100: 19,
    carbs100: 1,
    fat100: 4,
    iron100: 0.64,
    calcium100: 6,
    vitaminC100: 0,
    potassium100: 260,
    unitG: 15,
    unitLabel: 'slice',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Maito, kevytmaito, keitetty" — iron
    // 0.05mg, calcium 125mg, potassium 156mg, vitaminC 0.74mg per 100g
    // (boiled-milk entry; boiling doesn't meaningfully change mineral
    // content, so used as the closest available match to plain kevytmaito).
    name: 'Kevytmaito (1.5% milk)',
    aliases: ['kevytmaito', 'maito'],
    kcal100: 46,
    protein100: 3.3,
    carbs100: 4.7,
    fat100: 1.5,
    iron100: 0.05,
    calcium100: 125,
    vitaminC100: 0.7,
    potassium100: 156,
    unitG: 200,
    unitLabel: 'glass',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Piimä, rasvaton, vl, d-vit 0,5 ug"
    // — iron 0.04mg, calcium 121mg, potassium 160mg, vitaminC 1.23mg per
    // 100g.
    name: 'Piimä (buttermilk)',
    aliases: ['piimä'],
    kcal100: 39,
    protein100: 3.3,
    carbs100: 4.3,
    fat100: 1,
    iron100: 0.04,
    calcium100: 121,
    vitaminC100: 1.2,
    potassium100: 160,
    unitG: 200,
    unitLabel: 'glass',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Kaurapuuro, vesi, suolaa" — iron
    // 0.59mg, calcium 9.53mg, potassium 52.18mg, vitaminC 0mg per 100g.
    name: 'Kaurapuuro (cooked oat porridge)',
    aliases: ['kaurapuuro'],
    kcal100: 60,
    protein100: 2,
    carbs100: 10,
    fat100: 1.3,
    iron100: 0.59,
    calcium100: 10,
    vitaminC100: 0,
    potassium100: 52,
    unitG: 250,
    unitLabel: 'bowl',
  },
  {
    // Source (micros): bmi.fi (Fineli), "Karjalanpiirakka, perinteinen,
    // voideltu, riisi, ruisvehnäkuori" — iron 0.63mg, calcium 74.61mg,
    // potassium 160.39mg, vitaminC 0.43mg per 100g.
    name: 'Karjalanpiirakka (Karelian pie)',
    aliases: ['karjalanpiirakka'],
    kcal100: 210,
    protein100: 5,
    carbs100: 35,
    fat100: 5,
    iron100: 0.63,
    calcium100: 75,
    vitaminC100: 0.4,
    potassium100: 160,
    unitG: 60,
    unitLabel: 'piece',
  },
  {
    // Macros source: valio.fi official product page (Valio Raejuusto) — 85
    // kcal, 15g protein, 1.8g carbs, 2.0g fat per 100g. unitG assumes the
    // common single 200g tub as the default "1 serving" fallback when no
    // explicit gram quantity is given (see resolveQuantity — "200g
    // raejuusto" uses the literal 200g instead of this default).
    // Micros source: bmi.fi (Fineli), "Raejuusto, rasvaa 1,5%" (closest fat%
    // match to Valio's 2.0g/100g) — iron 0.09mg, calcium 84.5mg, potassium
    // 99.2mg, vitaminC 0.22mg per 100g.
    name: 'Raejuusto (cottage cheese)',
    aliases: ['raejuusto'],
    kcal100: 85,
    protein100: 15,
    carbs100: 1.8,
    fat100: 2.0,
    iron100: 0.09,
    calcium100: 85,
    vitaminC100: 0.2,
    potassium100: 99,
    unitG: 200,
    unitLabel: 'purkki',
  },
  {
    // "Valio Aino jogurtti" isn't an actual current Valio product — "Aino" is
    // a Valio-adjacent cleaning-products brand, not a yoghurt line (checked
    // against valio.fi's product listings). Mapped instead to Valio's real
    // standard "Luonnon jogurtti" (plain natural yoghurt) label values, from
    // fi.openfoodfacts.org/product/6408430024995: 58 kcal, 4.2g protein, 4g
    // carbs, 2.5g fat per 100g. unitG is a standard single-serve tub (~150g).
    // Micros source: bmi.fi (Fineli), "Jogurtti, maustamaton, rasvaa 2,5%"
    // (exact fat% match) — iron 0.06mg, calcium 122mg, potassium 155mg,
    // vitaminC 1.04mg per 100g.
    name: 'Luonnonjogurtti (Valio natural yoghurt)',
    aliases: ['aino jogurtti', 'valio aino', 'luonnonjogurtti', 'luonnon jogurtti'],
    kcal100: 58,
    protein100: 4.2,
    carbs100: 4,
    fat100: 2.5,
    iron100: 0.06,
    calcium100: 122,
    vitaminC100: 1.0,
    potassium100: 155,
    unitG: 150,
    unitLabel: 'purkki',
  },
  {
    // Macros source: kalori.info, "Atria uudistettu suomalainen nakki 500g"
    // — 271 kcal, 12g protein, 0.5g carbs, 24g fat per 100g. Package is
    // confirmed 15 kpl / 500g (openfoodfacts + atria.fi), so unitG ≈
    // 500/15 ≈ 33g per sausage.
    // Micros source: bmi.fi (Fineli), "Nakki, tuotekeskiarvo" (cross-brand
    // average, since Atria doesn't publish sausage minerals separately) —
    // iron 0.75mg, calcium 17.29mg, potassium 203.63mg, vitaminC 0mg per
    // 100g.
    name: 'Nakki (Atria sausage)',
    aliases: ['atria nakit', 'atria nakki', 'nakit', 'nakki'],
    kcal100: 271,
    protein100: 12,
    carbs100: 0.5,
    fat100: 24,
    iron100: 0.75,
    calcium100: 17,
    vitaminC100: 0,
    potassium100: 204,
    unitG: 33,
    unitLabel: 'kpl',
  },
  {
    // Macros source: kaloreita.fi, "Ruisleipä, puikula ruis, fazer" (Fazer's
    // ring-shaped "hole bread" rye loaf) — 258 kcal, 10g protein, 45.7g
    // carbs, 0.18g fat per 100g; manufacturer-stated slice weight 28g.
    // Micros: no Fazer-specific figures published, so proxied from the same
    // generic Fineli rye-bread entry as "Ruisleipä" above (rye bread's
    // mineral content is fairly consistent within the category regardless
    // of shape/brand).
    name: 'Ruisreikäleipä (Fazer ring-shaped rye "hole" bread)',
    aliases: ['ruisreikäleipä', 'reikäleipä', 'fazer ruisreikäleipä', 'fazer puikula'],
    kcal100: 258,
    protein100: 10,
    carbs100: 45.7,
    fat100: 0.2,
    iron100: 2.2,
    calcium100: 34,
    vitaminC100: 1.0,
    potassium100: 448,
    unitG: 28,
    unitLabel: 'slice',
  },
]

import { resolveQuantity as resolveQuantityShared, QUANTITY_WORDS, type ResolvedQuantity } from './foodQuantity.ts'
import { matchFineliFoods, fineliItemLabel, type FineliMatchedItem, type FoodMicroKey } from './fineliMatch.ts'

/** Lowercase for matching (Finnish ä/ö/å fold correctly under plain JS lowercasing). */
const norm = (s: string) => s.toLowerCase()

/** Display unit for each food-sourced micro, for the "these items already contribute..." prompt sentence — mirrors micros.ts's MICRO_META units (mg/µg/g), duplicated locally since atlas-api and the frontend are separate packages. */
const MICRO_UNIT: Record<FoodMicroKey, string> = {
  iron: 'mg',
  calcium: 'mg',
  vitaminD: 'µg',
  vitaminB12: 'µg',
  zinc: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  fibre: 'g',
  omega3: 'g',
  vitaminC: 'mg',
  folate: 'µg',
}
const FOOD_MICRO_KEYS = Object.keys(MICRO_UNIT) as FoodMicroKey[]

/** "iron 2.2mg, calcium 34mg, ..." for whichever keys are present — used both in the prompt and (rounded) as the forced micros output. */
function describeMicros(micros: Partial<Record<FoodMicroKey, number>>): string {
  return FOOD_MICRO_KEYS.filter((k) => micros[k] != null)
    .map((k) => `${k} ${micros[k]}${MICRO_UNIT[k]}`)
    .join(', ')
}

/** Sums the manual table's 4 tracked micros (iron/calcium/vitaminC/potassium) plus the Fineli layer's up-to-11, into one combined per-meal total. */
function combineMicroTotals(
  known: FinnishFoodItem[],
  fineliItems: FineliMatchedItem[],
): Partial<Record<FoodMicroKey, number>> {
  const total: Partial<Record<FoodMicroKey, number>> = {}
  const add = (key: FoodMicroKey, amount: number) => {
    total[key] = round2((total[key] ?? 0) + amount)
  }
  for (const it of known) {
    add('iron', it.iron)
    add('calcium', it.calcium)
    add('vitaminC', it.vitaminC)
    add('potassium', it.potassium)
  }
  for (const it of fineliItems) {
    for (const key of FOOD_MICRO_KEYS) {
      const amount = it.micros[key]
      if (amount != null) add(key, amount)
    }
  }
  return total
}

/**
 * Blanks out every alias of each already-recognized manual-table item from
 * `t` (length-preserving, so any other item's quantity phrase elsewhere in
 * the text keeps its original character offsets) — run before handing text
 * to the Fineli matcher so it doesn't re-match words the manual table
 * already claimed (e.g. "maito" is a manual-table alias; without masking,
 * the Fineli layer would also try to match the same word).
 */
function maskKnownAliases(t: string, known: FinnishFoodItem[]): string {
  let out = t
  for (const it of known) {
    for (const alias of it.ref.aliases) {
      out = out.split(alias).join(' '.repeat(alias.length))
    }
  }
  return out
}

/**
 * Reference entries whose alias appears in `text`, longest-alias-first so a
 * specific match (e.g. "ohut kaura leipä") is found before a shorter,
 * unrelated entry's alias could coincidentally also appear in the same text.
 */
export function matchFinnishFoods(text: string): FinnishFoodRef[] {
  const t = norm(text)
  const byLongestAlias = [...FINNISH_FOOD_REFERENCE].sort(
    (a, b) => Math.max(...b.aliases.map((s) => s.length)) - Math.max(...a.aliases.map((s) => s.length)),
  )
  return byLongestAlias.filter((ref) => ref.aliases.some((alias) => t.includes(alias)))
}

/**
 * A prompt-ready block of known reference values for whatever Finnish foods
 * `text` mentions, or '' if none matched. Kept (alongside the deterministic
 * path below) so the model has real per-100g anchors for judging anything in
 * the same meal that ISN'T an exact table match — e.g. a slightly different
 * pack size or a related product.
 */
export function finnishFoodReferenceBlock(text: string): string {
  const matches = matchFinnishFoods(text)
  if (matches.length === 0) return ''
  const lines = matches.map(
    (m) =>
      `- ${m.name}: ${m.kcal100} kcal, ${m.protein100}g protein, ${m.carbs100}g carbs, ${m.fat100}g fat ` +
      `per 100g; one typical ${m.unitLabel} ≈ ${m.unitG}g.`,
  )
  return (
    '\n\nReference values for Finnish products in this general category (for anything below ' +
    "that isn't an exact match, e.g. a different pack size of the same product):\n" +
    lines.join('\n')
  )
}

/**
 * Resolves how much of `ref` is actually meant — delegates to the shared
 * resolveQuantity (see foodQuantity.ts) with this table's own typical
 * single-serving weight (`ref.unitG`/`ref.unitLabel`) as the default.
 */
function resolveQuantity(t: string, index: number, aliasLen: number, ref: FinnishFoodRef): ResolvedQuantity {
  return resolveQuantityShared(t, index, aliasLen, ref.unitG, ref.unitLabel)
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

export interface FinnishFoodItem {
  ref: FinnishFoodRef
  /** Human-readable quantity actually used, e.g. "4 kpl", "200 g", "1 dl", "2 slice" — see resolveQuantity. */
  quantityLabel: string
  /** Grams the macros/micros below were computed from. */
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** mg. */
  iron: number
  /** mg. */
  calcium: number
  /** mg. */
  vitaminC: number
  /** mg. */
  potassium: number
}

/** Stable, deterministic item name/label used both in the prompt and to match the model's response back up. */
export function finnishItemLabel(it: Pick<FinnishFoodItem, 'ref' | 'quantityLabel'>): string {
  return `${it.ref.name} x${it.quantityLabel}`
}

/**
 * Finnish reference foods mentioned in `text`, each with the quantity
 * resolved by resolveQuantity (kpl / grams / dl / discrete unit count) and
 * the resulting macros for that quantity — computed here in plain
 * arithmetic, not left to the model. One entry per matched reference item
 * (not per alias, so "ohut kaura leipä" and "kauraleipä" both matching the
 * same entry doesn't double-count it).
 */
export function extractFinnishFoodItems(text: string): FinnishFoodItem[] {
  const t = norm(text)
  const items: FinnishFoodItem[] = []
  for (const ref of FINNISH_FOOD_REFERENCE) {
    let bestIndex = -1
    let bestAliasLen = 0
    for (const alias of ref.aliases) {
      const idx = t.indexOf(alias)
      if (idx !== -1 && alias.length > bestAliasLen) {
        bestIndex = idx
        bestAliasLen = alias.length
      }
    }
    if (bestIndex === -1) continue
    const { grams, label } = resolveQuantity(t, bestIndex, bestAliasLen, ref)
    items.push({
      ref,
      quantityLabel: label,
      grams,
      kcal: Math.round((ref.kcal100 / 100) * grams),
      protein: round1((ref.protein100 / 100) * grams),
      carbs: round1((ref.carbs100 / 100) * grams),
      fat: round1((ref.fat100 / 100) * grams),
      iron: round2((ref.iron100 / 100) * grams),
      calcium: Math.round((ref.calcium100 / 100) * grams),
      vitaminC: round1((ref.vitaminC100 / 100) * grams),
      potassium: Math.round((ref.potassium100 / 100) * grams),
    })
  }
  return items
}

/**
 * Words that commonly trail or accompany a Finnish product name without
 * naming a separate food — unit/quantity words ("Oltermanni CHEESE", "4
 * VIIPALE Oltermanni", "1 PKT ... 4 KPL"), and common brand/qualifier words
 * that show up alongside a branded item's name ("VALIO Aino jogurtti,
 * LUONNOLLINEN"). Used only to tell "nothing left to describe" apart from
 * "there's more food in this text", see hasLeftoverFood — matches the unit
 * words resolveQuantity itself understands (kpl/pkt/g/dl/…) so a quantity
 * that's already been consumed there isn't mistaken for leftover food.
 */
const DESCRIPTOR_STOPWORDS = new Set([
  'slice', 'slices', 'piece', 'pieces', 'pcs', 'pc', 'of', 'and', 'with', 'the', 'a', 'an',
  'cheese', 'bread', 'sausage', 'ham', 'milk',
  'viipale', 'viipaletta', 'pala', 'palaa', 'kpl', 'kappale', 'kappaletta',
  'pkt', 'purkki', 'purkkia', 'paketti', 'pakettia',
  'g', 'kg', 'dl', 'ml', 'l', 'gramma', 'grammaa',
  'juusto', 'valio', 'atria', 'fazer', 'luonnollinen', 'luonnon',
])

/**
 * True if `text` mentions any food beyond what's already in `known` and
 * `fineliItems` — i.e. whether there's something the model legitimately
 * still needs to estimate. Works by stripping every known item's matched
 * alias (and, for the Fineli layer, its exact matched text), all
 * digits/quantity words/percentages, and descriptor stopwords, then checking
 * whether any words remain. Used as a safety backstop in
 * applyFinnishFoodOverrides: when nothing is left, ANY item in the model's
 * response that isn't one of our exact known items can only be a stray
 * duplicate/mis-description of one we already have — not genuinely
 * different food — so it's safe to drop. Fineli's reference-only matches
 * (unambiguous identity, no stated amount) are deliberately NOT stripped
 * here — we don't know how much of them was eaten, so that food is still
 * "unaccounted for" for the purposes of forcing a total.
 */
function hasLeftoverFood(text: string, known: FinnishFoodItem[], fineliItems: FineliMatchedItem[]): boolean {
  let t = norm(text)
  for (const it of known) {
    for (const alias of it.ref.aliases) t = t.split(alias).join(' ')
  }
  for (const it of fineliItems) {
    t = t.split(it.matchedText).join(' ')
  }
  const words = t
    .replace(/[.,!?;:()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    // Plain numbers, decimals, and fat-percentage figures (e.g. "1.5%", "1,5%").
    .filter((w) => !/^\d+([.,]\d+)?%?$/.test(w))
    // A quantity+unit written with no space, e.g. "200g" ("200g raejuusto") —
    // already consumed by resolveQuantity's gram/dl/kpl detectors, so this is
    // the same "already accounted for" check as the space-separated case,
    // just for the no-space spelling.
    .filter((w) => !/^\d+([.,]\d+)?(?:g|kg|dl|ml|l|kpl|pkt)$/i.test(w))
    .filter((w) => !(w in QUANTITY_WORDS))
    .filter((w) => !DESCRIPTOR_STOPWORDS.has(w))
  return words.length > 0
}

/**
 * Builds the full /api/ai/nutrition prompt for `text`, including a
 * deterministic-items block (exact numbers, already multiplied by the
 * parsed quantity) for any recognized Finnish foods — from the hand-curated
 * FINNISH_FOOD_REFERENCE table first, then (for anything it doesn't cover)
 * the generated Fineli data via fineliMatch.ts. Exported (rather than
 * inlined in the route handler) so finnishFoods.test.ts exercises the exact
 * prompt the server sends, not a re-implementation of it. `microUnits` is
 * passed in rather than imported to avoid a circular import with index.ts,
 * which owns the micronutrient schema.
 */
export function buildNutritionPrompt(text: string, microUnits: string): string {
  const known = extractFinnishFoodItems(text)
  const fineli = matchFineliFoods(maskKnownAliases(norm(text), known))
  const combinedMicros = combineMicroTotals(known, fineli.items)

  const knownLines = [
    ...known.map(
      (it) =>
        `- name: "${finnishItemLabel(it)}" — kcal: ${it.kcal}, protein: ${it.protein}, ` +
        `carbs: ${it.carbs}, fat: ${it.fat} (iron ${it.iron}mg, calcium ${it.calcium}mg, ` +
        `vitaminC ${it.vitaminC}mg, potassium ${it.potassium}mg)`,
    ),
    ...fineli.items.map(
      (it) =>
        `- name: "${fineliItemLabel(it)}" — kcal: ${it.kcal}, protein: ${it.protein}, ` +
        `carbs: ${it.carbs}, fat: ${it.fat}` +
        (Object.keys(it.micros).length > 0 ? ` (${describeMicros(it.micros)})` : ''),
    ),
  ]

  const knownBlock =
    knownLines.length > 0
      ? '\n\nThese items are already computed exactly — for each, add ONE entry to your items[] ' +
        'array with `name` set to EXACTLY the label given (character-for-character, unchanged) ' +
        'and kcal/protein/carbs/fat set to EXACTLY the numbers given (do not recompute, round ' +
        'differently, or adjust them):\n' +
        knownLines.join('\n') +
        '\nAdd separate items[] entries only for any OTHER food in the meal description not ' +
        'listed above, with your own best estimate for those. Set totalKcal/protein/carbs/fat ' +
        'to the sum of every item in items[] (the ones given above plus anything else you add). ' +
        `These items alone already contribute ${describeMicros(combinedMicros)} — your total ` +
        'micronutrient estimate must be at least this much, plus whatever any other food in the meal adds.'
      : ''

  const fineliReferenceBlock =
    fineli.references.length > 0
      ? '\n\nReference per-100g values for these foods, mentioned without a stated amount — use ' +
        'your own judgement for the portion size actually eaten:\n' +
        fineli.references
          .map(
            (f) =>
              `- ${f.nameFi}: ${f.kcal100 ?? 0} kcal, ${f.protein100 ?? 0}g protein, ` +
              `${f.carbs100 ?? 0}g carbs, ${f.fat100 ?? 0}g fat per 100g.`,
          )
          .join('\n')
      : ''

  return (
    'You are a concise nutrition estimator. Estimate the calories (kcal) and ' +
    'macronutrients (grams of protein, carbs, fat) for the meal described below. ' +
    'Break it into individual food items, estimate each, and set the totals to the ' +
    "sum of the items. Also estimate the meal's total micronutrients in these exact " +
    'units: ' +
    microUnits +
    '. Use typical serving sizes when quantities are vague. ' +
    'The meal may be described in Finnish or name Finnish grocery products — read those ' +
    'names accurately and use authentic Finnish portion sizes (e.g. a Finnish bread ' +
    'slice is thin, roughly 15-30g, not a thick ~40g+ Western sandwich slice; deli ' +
    'cold-cut and cheese slices are thin, roughly 10-20g each), never a generic Western ' +
    'default serving. Set confidence accordingly.' +
    finnishFoodReferenceBlock(text) +
    fineliReferenceBlock +
    knownBlock +
    ' Meal description:\n\n' +
    text
  )
}

interface NutritionItemLike {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface MicrosLike extends Partial<Record<FoodMicroKey, number>> {
  [key: string]: unknown
}

interface NutritionResultLike {
  totalKcal: number
  protein: number
  carbs: number
  fat: number
  items?: unknown
  confidence?: unknown
  micros?: MicrosLike
  [key: string]: unknown
}

function isNutritionItemLike(v: unknown): v is NutritionItemLike {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.name === 'string' && typeof o.kcal === 'number'
}

/**
 * Forces the model's /api/ai/nutrition response to use exact, deterministic
 * values for any recognized foods in `text` — regardless of what the model
 * actually returned for them — from the hand-curated FINNISH_FOOD_REFERENCE
 * table first, then (for anything it doesn't cover) the generated Fineli
 * data via fineliMatch.ts. Prompting alone (buildNutritionPrompt) wasn't
 * sufficient on its own: told the exact numbers, the model still drifted
 * (observed ~599 kcal vs. a true ~415 kcal for the reported meal). This
 * closes that gap unconditionally in two steps:
 *   1. Any item exactly labeled as one of ours is overwritten with the exact
 *      computed numbers; missing ones are added.
 *   2. If `text` has no food left unaccounted for (hasLeftoverFood), ANY
 *      other item the model still returned can only be a stray duplicate or
 *      mis-description of a known item (there's nothing else in the text for
 *      it to legitimately be) — so it's dropped rather than double-counted.
 *      When there IS unaccounted-for text, those extra items are kept, since
 *      they may be genuinely different food the model correctly estimated.
 * Totals are always re-derived as the sum of the resulting items array, never
 * trusted from the model's own totalKcal.
 *
 * Micronutrients (all 11 food-sourced keys — see FoodMicroKey) are forced
 * the same way, with one difference: the schema reports them as a single
 * whole-meal total, not broken out per item (unlike kcal/protein/carbs/fat),
 * so there's no way to cleanly add "the known items' share" to "the model's
 * own share for anything else" without risking double-counting or
 * under-counting. So they're only overridden when the meal has NO food left
 * unaccounted for (same `noLeftover` check as the items backstop) — in that
 * case the known items ARE the whole meal, and the deterministic sum is
 * exactly correct. When there's other food in the meal too, micros are left
 * as the model's own whole-meal estimate, same as before this override
 * existed. A Fineli reference-only match (unambiguous identity, no stated
 * amount — see fineliMatch.ts) never counts as "known" here: without a
 * weight there's nothing deterministic to force, so it only ever affects the
 * prompt (buildNutritionPrompt), never this override step.
 *
 * A no-op — returns `raw` unchanged — when `text` names no known items at all.
 */
export function applyFinnishFoodOverrides(text: string, raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const known = extractFinnishFoodItems(text)
  const fineli = matchFineliFoods(maskKnownAliases(norm(text), known))
  if (known.length === 0 && fineli.items.length === 0) return raw

  const result = raw as NutritionResultLike
  const modelItems: NutritionItemLike[] = Array.isArray(result.items)
    ? result.items.filter(isNutritionItemLike)
    : []

  const noLeftover = !hasLeftoverFood(text, known, fineli.items)
  const knownLabels = new Set([
    ...known.map((it) => finnishItemLabel(it)),
    ...fineli.items.map((it) => fineliItemLabel(it)),
  ])
  const extraItems = noLeftover ? [] : modelItems.filter((it) => !knownLabels.has(it.name))

  const items: NutritionItemLike[] = [
    ...known.map((it) => ({
      name: finnishItemLabel(it),
      kcal: it.kcal,
      protein: it.protein,
      carbs: it.carbs,
      fat: it.fat,
    })),
    ...fineli.items.map((it) => ({
      name: fineliItemLabel(it),
      kcal: it.kcal,
      protein: it.protein,
      carbs: it.carbs,
      fat: it.fat,
    })),
    ...extraItems,
  ]

  const totals = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + (Number.isFinite(it.kcal) ? it.kcal : 0),
      protein: acc.protein + (Number.isFinite(it.protein) ? it.protein : 0),
      carbs: acc.carbs + (Number.isFinite(it.carbs) ? it.carbs : 0),
      fat: acc.fat + (Number.isFinite(it.fat) ? it.fat : 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  // Every item is one of ours (nothing left over from the model) → the result is
  // fully deterministic, so the confidence label should say so.
  const confidence = items.length === known.length + fineli.items.length ? 'high' : result.confidence

  const combinedMicros = combineMicroTotals(known, fineli.items)
  const micros: MicrosLike | undefined = noLeftover ? { ...(result.micros ?? {}), ...combinedMicros } : result.micros

  return {
    ...result,
    items,
    confidence,
    micros,
    totalKcal: Math.round(totals.kcal),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  }
}
