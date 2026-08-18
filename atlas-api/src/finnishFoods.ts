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
 *      well-prompted. The model still owns anything the table doesn't cover
 *      (other foods in the same meal) and all micronutrient estimates.
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

/** Lowercase for matching (Finnish ä/ö/å fold correctly under plain JS lowercasing). */
const norm = (s: string) => s.toLowerCase()

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

/** 1-10 in English and Finnish, for quantities written as words rather than digits. */
const QUANTITY_WORDS: Record<string, number> = {
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
const UNIT_WORD = '(?:slices?|pieces?|pcs?|viipale\\w*|pala\\w*|kpl|kappale\\w*|pkt|purkki\\w*|paketti\\w*)'

/** Quantity immediately preceding position `index` in normalized text `t`; defaults to 1 if none found. */
function quantityBefore(t: string, index: number): number {
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
function trailingKplCount(t: string, from: number): number | null {
  const after = t.slice(from, from + 24)
  const match = /^[^\d]{0,16}?(\d+)\s*(?:kpl|kappaletta?)\b/i.exec(after)
  return match ? parseInt(match[1], 10) : null
}

/** An explicit "N g"/"N grammaa" weight immediately before the food name, e.g. "200g raejuusto". */
function gramQuantityBefore(t: string, index: number): number | null {
  const before = t.slice(Math.max(0, index - 40), index)
  const match = /(\d+(?:[.,]\d+)?)\s*(?:g|grammaa?)\s*$/i.exec(before)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

/**
 * Grams per 1 dl (100ml) — the standard practical approximation used for
 * both liquids and porridge-like foods (≈ water density; the difference for
 * milk/porridge is negligible at this precision).
 */
const G_PER_DL = 100

/** An explicit "N dl"/"N desilitraa" volume immediately before the food name, e.g. "1 dl kaurapuuro". */
function dlQuantityBefore(t: string, index: number): number | null {
  const before = t.slice(Math.max(0, index - 40), index)
  const match = /(\d+(?:[.,]\d+)?)\s*(?:dl|desilitraa?|desiä?)\s*$/i.exec(before)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

interface ResolvedQuantity {
  grams: number
  /** Human-readable quantity for the item label, e.g. "4 kpl", "200 g", "1 dl", "2 slice". */
  label: string
}

/**
 * Resolves how much of `ref` is actually meant, trying the most explicit /
 * unambiguous signal in the text first:
 *   1. a trailing "N kpl" piece-count (wins over a leading package word)
 *   2. an explicit gram weight ("200g raejuusto")
 *   3. an explicit volume in dl ("1 dl kaurapuuro" → 100g, not a full "bowl")
 *   4. a discrete unit count immediately before the name ("4 viipale X")
 *   5. default: exactly one of ref.unitG
 */
function resolveQuantity(t: string, index: number, aliasLen: number, ref: FinnishFoodRef): ResolvedQuantity {
  const kpl = trailingKplCount(t, index + aliasLen)
  if (kpl !== null) return { grams: ref.unitG * kpl, label: `${kpl} kpl` }

  const grams = gramQuantityBefore(t, index)
  if (grams !== null) return { grams, label: `${grams} g` }

  const dl = dlQuantityBefore(t, index)
  if (dl !== null) return { grams: dl * G_PER_DL, label: `${dl} dl` }

  const count = quantityBefore(t, index)
  return { grams: ref.unitG * count, label: `${count} ${ref.unitLabel}` }
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
 * True if `text` mentions any food beyond what's already in `known` — i.e.
 * whether there's something the model legitimately still needs to estimate.
 * Works by stripping every known item's matched alias, all digits/quantity
 * words/percentages, and descriptor stopwords, then checking whether any
 * words remain. Used as a safety backstop in applyFinnishFoodOverrides: when
 * nothing is left, ANY item in the model's response that isn't one of our
 * exact known items can only be a stray duplicate/mis-description of one we
 * already have — not genuinely different food — so it's safe to drop.
 */
function hasLeftoverFood(text: string, known: FinnishFoodItem[]): boolean {
  let t = norm(text)
  for (const it of known) {
    for (const alias of it.ref.aliases) t = t.split(alias).join(' ')
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
 * parsed quantity) for any recognized Finnish foods. Exported (rather than
 * inlined in the route handler) so finnishFoods.test.ts exercises the exact
 * prompt the server sends, not a re-implementation of it. `microUnits` is
 * passed in rather than imported to avoid a circular import with index.ts,
 * which owns the micronutrient schema.
 */
export function buildNutritionPrompt(text: string, microUnits: string): string {
  const known = extractFinnishFoodItems(text)
  const knownMicros = known.reduce(
    (acc, it) => ({
      iron: acc.iron + it.iron,
      calcium: acc.calcium + it.calcium,
      vitaminC: acc.vitaminC + it.vitaminC,
      potassium: acc.potassium + it.potassium,
    }),
    { iron: 0, calcium: 0, vitaminC: 0, potassium: 0 },
  )
  const knownBlock =
    known.length > 0
      ? '\n\nThese items are already computed exactly — for each, add ONE entry to your items[] ' +
        'array with `name` set to EXACTLY the label given (character-for-character, unchanged) ' +
        'and kcal/protein/carbs/fat set to EXACTLY the numbers given (do not recompute, round ' +
        'differently, or adjust them):\n' +
        known
          .map(
            (it) =>
              `- name: "${finnishItemLabel(it)}" — kcal: ${it.kcal}, protein: ${it.protein}, ` +
              `carbs: ${it.carbs}, fat: ${it.fat} (iron ${it.iron}mg, calcium ${it.calcium}mg, ` +
              `vitaminC ${it.vitaminC}mg, potassium ${it.potassium}mg)`,
          )
          .join('\n') +
        '\nAdd separate items[] entries only for any OTHER food in the meal description not ' +
        'listed above, with your own best estimate for those. Set totalKcal/protein/carbs/fat ' +
        'to the sum of every item in items[] (the ones given above plus anything else you add). ' +
        `These items alone already contribute iron ${round1(knownMicros.iron)}mg, calcium ` +
        `${Math.round(knownMicros.calcium)}mg, vitaminC ${round1(knownMicros.vitaminC)}mg, ` +
        `potassium ${Math.round(knownMicros.potassium)}mg — your total micronutrient estimate ` +
        'must be at least this much, plus whatever any other food in the meal adds.'
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

interface MicrosLike {
  iron?: number
  calcium?: number
  vitaminC?: number
  potassium?: number
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
 * values for any recognized Finnish foods in `text` — regardless of what the
 * model actually returned for them. Prompting alone (buildNutritionPrompt)
 * wasn't sufficient on its own: told the exact numbers, the model still
 * drifted (observed ~599 kcal vs. a true ~415 kcal for the reported meal).
 * This closes that gap unconditionally in two steps:
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
 * Micronutrients (iron/calcium/vitaminC/potassium) are forced the same way,
 * with one difference: the schema reports them as a single whole-meal total,
 * not broken out per item (unlike kcal/protein/carbs/fat), so there's no way
 * to cleanly add "the known items' share" to "the model's own share for
 * anything else" without risking double-counting or under-counting. So they're
 * only overridden when the meal has NO food left unaccounted for (same
 * `noLeftover` check as the items backstop) — in that case the known items
 * ARE the whole meal, and the deterministic sum is exactly correct. When
 * there's other food in the meal too, micros are left as the model's own
 * whole-meal estimate, same as before this override existed.
 *
 * A no-op — returns `raw` unchanged — when `text` names no known items at all.
 */
export function applyFinnishFoodOverrides(text: string, raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  const known = extractFinnishFoodItems(text)
  if (known.length === 0) return raw

  const result = raw as NutritionResultLike
  const modelItems: NutritionItemLike[] = Array.isArray(result.items)
    ? result.items.filter(isNutritionItemLike)
    : []

  const noLeftover = !hasLeftoverFood(text, known)
  const knownLabels = new Set(known.map((it) => finnishItemLabel(it)))
  const extraItems = noLeftover ? [] : modelItems.filter((it) => !knownLabels.has(it.name))

  const items: NutritionItemLike[] = [
    ...known.map((it) => ({
      name: finnishItemLabel(it),
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
  const confidence = items.length === known.length ? 'high' : result.confidence

  const knownMicros = known.reduce(
    (acc, it) => ({
      iron: acc.iron + it.iron,
      calcium: acc.calcium + it.calcium,
      vitaminC: acc.vitaminC + it.vitaminC,
      potassium: acc.potassium + it.potassium,
    }),
    { iron: 0, calcium: 0, vitaminC: 0, potassium: 0 },
  )
  const micros: MicrosLike | undefined = noLeftover
    ? {
        ...(result.micros ?? {}),
        iron: round2(knownMicros.iron),
        calcium: Math.round(knownMicros.calcium),
        vitaminC: round1(knownMicros.vitaminC),
        potassium: Math.round(knownMicros.potassium),
      }
    : result.micros

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
