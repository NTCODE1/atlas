/**
 * Curated defaults bridging two gaps fineliMatch.ts's automated matcher
 * can't resolve on its own from the generated Fineli data alone:
 *
 *  1. Colloquial terms that don't textually match their Fineli FOODNAME at
 *     all — e.g. "kananrinta" (colloquial "chicken breast") vs Fineli's
 *     poultry-industry term "Broileri, rintafilee, ..." ("broiler, breast
 *     fillet, ..."). No amount of word-boundary/suffix-tolerance matching
 *     bridges genuinely different words.
 *
 *  2. Common staples where MANY Fineli entries share the same head word —
 *     e.g. "Riisi" (rice) has 20+ variants (raw/cooked/salted/fried/...).
 *     fineliMatch.ts deliberately refuses to guess among same-head
 *     candidates when the text gives it nothing to disambiguate with (same
 *     "only force what we're actually certain about" rule as everywhere
 *     else in this override pipeline) — a bare "riisiä" would otherwise only
 *     ever get reference-only treatment, never a deterministic override.
 *     These entries pick the sensible everyday-eaten default by hand (cooked
 *     unsalted rice, a peeled banana, a whole shelled egg, ...), the same
 *     kind of judgment call FINNISH_FOOD_REFERENCE already makes for its
 *     hand-picked items in finnishFoods.ts.
 *
 * Each key is matched the same way a Fineli head is — whole-word,
 * suffix-tolerant, and (for the two-word keys below) as a contiguous phrase
 * — see fineliMatch.ts's stemsOf/buildIndex. When a key fires it points at
 * exactly one FINELI_FOODS id: always unambiguous, always override-eligible.
 * Finnish and English keys are both included (meals are logged in either
 * language — see buildNutritionPrompt's own instruction to that effect);
 * simple English plurals ("bananas", "eggs") aren't listed separately since
 * fineliMatch.ts's suffix-stripping already reaches the singular key.
 * Small and deliberately narrow: extend as more common gaps turn up, don't
 * try to cover everything here.
 */
export const FINELI_ALIASES: Record<string, number> = {
  // Colloquial term -> industry/lab term mismatch.
  kananrinta: 7530, // Broileri, rintafilee, paistettu, nahaton (chicken breast, fried, skinless)
  kananrintafilee: 7530,
  broilerinrintafilee: 7530,
  'chicken breast': 7530,
  jauheliha: 711, // Jauheliha, sika-nauta (generic pork-beef mince, raw)
  'ground beef': 711,
  'minced beef': 711,

  // Common staple, many same-head Fineli variants -> the sensible everyday default.
  banaani: 11049, // Banaani, kuorittu (peeled)
  banana: 11049,
  omena: 28916, // Omena, keskiarvo, punnittu kuorineen (average apple, weighed with skin)
  apple: 28916,
  appelsiini: 11045, // Appelsiini, kuorittu (peeled)
  orange: 11045,
  peruna: 11511, // Peruna, kuorittu, keitetty, suolaton (peeled, boiled, unsalted)
  potato: 11511,
  riisi: 1370, // Riisi, keitetty, suolaton (cooked, unsalted)
  rice: 1370,
  kananmuna: 858, // Kananmuna, kuoreton (whole egg, no shell)
  kananmunia: 858,
  muna: 858, // colloquial short form of kananmuna
  egg: 858,
  lohi: 817, // Lohi, kokonainen (whole salmon, raw)
  lohta: 817, // irregular partitive of "lohi" (consonant gradation: i -> nothing, +ta) — stemsOf's plain suffix-stripping can't derive this from "lohi", so it's listed explicitly
  salmon: 817,
}
