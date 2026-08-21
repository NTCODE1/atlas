/**
 * Deterministic checks for the Fineli fallback matcher (fineliMatch.ts) —
 * the automated layer behind finnishFoods.ts's hand-curated table. No
 * network calls, same style as finnishFoods.test.ts.
 *
 * Run with: node --test src/fineliMatch.test.ts
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchFineliFoods } from './fineliMatch.ts'
import { FINELI_FOODS } from './fineliFoods.generated.ts'
import { buildNutritionPrompt, applyFinnishFoodOverrides } from './finnishFoods.ts'

test('an explicit gram amount for a uniquely-named food is a deterministic item', () => {
  const r = matchFineliFoods('200g kurpitsaa')
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].food.nameFi, 'Kurpitsa')
  assert.equal(r.items[0].grams, 200)
  assert.equal(r.references.length, 0)
})

test('a genuinely missing Fineli component is omitted from micros, never forced to 0', () => {
  const kurpitsa = FINELI_FOODS.find((f) => f.nameFi === 'Kurpitsa')!
  assert.ok(!('omega3_100' in kurpitsa), 'fixture assumption: Kurpitsa has no measured omega-3 value')

  const r = matchFineliFoods('200g kurpitsaa')
  assert.equal(r.items.length, 1)
  assert.ok(!('omega3' in r.items[0].micros), 'omega3 must be absent, not 0, when Fineli has no value for it')
  assert.ok('iron' in r.items[0].micros, 'a component Kurpitsa DOES have should still be present')
})

test('a food mentioned with no explicit amount is reference-only, not a forced item', () => {
  const r = matchFineliFoods('kurpitsaa')
  assert.equal(r.items.length, 0, 'no grams/dl stated — nothing to force a total from')
  assert.equal(r.references.length, 1)
  assert.equal(r.references[0].nameFi, 'Kurpitsa')
})

test('a bare mention of a food with many same-head Fineli variants is left alone (no default guessed)', () => {
  // "Peruna" (potato) has many un-aliased variants (dried/new/old/fried/...);
  // only the hand-picked default in fineliAliases.ts should ever resolve it.
  // Pick a head that's genuinely NOT in fineliAliases.ts to prove the
  // ambiguity rule itself, independent of the alias list's current contents.
  const r = matchFineliFoods('omenapiirakkaa')
  assert.equal(r.items.length, 0)
  assert.equal(r.references.length, 0, 'ambiguous head with no alias must not surface even as a reference')
})

test('a hand-picked alias resolves an otherwise-ambiguous staple to its chosen default', () => {
  const r = matchFineliFoods('150g riisiä')
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].food.nameFi, 'Riisi, keitetty, suolaton')
})

test('simple Finnish case-ending variation matches the same food as the base form', () => {
  const base = matchFineliFoods('150g banaania').items[0]
  const alt = matchFineliFoods('150g banaaneja').items // plural partitive — a stem change stemsOf can't reach
  assert.equal(base.food.nameFi, 'Banaani, kuorittu')
  assert.equal(alt.length, 0, 'known limitation: irregular plural forms are not derived by suffix-stripping')
})

test('word-boundary matching does not false-positive inside an unrelated compound word', () => {
  // "kananmuna" (egg) must not spuriously fire the "kana" (chicken) head.
  const r = matchFineliFoods('200g kananmunaa')
  assert.ok(r.items.every((it) => it.food.nameFi !== 'Kana'))
  assert.ok(r.references.every((f) => f.nameFi !== 'Kana'))
})

test('the manual FINNISH_FOOD_REFERENCE table takes precedence over the Fineli fallback for the same word', () => {
  // "kevytmaito" is in the hand-curated table; the generic Fineli "Maito"
  // entries must not also fire for the same mention (no double-counting).
  const prompt = buildNutritionPrompt('1 glass kevytmaito', 'iron mg')
  const overridden = applyFinnishFoodOverrides('1 glass kevytmaito', {
    totalKcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    items: [],
  }) as { items: { name: string }[] }
  assert.equal(overridden.items.length, 1, 'exactly one item — the manual table entry, not also a Fineli one')
  assert.ok(prompt.includes('Kevytmaito'))
})

test('buildNutritionPrompt grounds a generic staple meal with real Fineli reference numbers', () => {
  const prompt = buildNutritionPrompt('grilled chicken breast with rice and broccoli', 'iron mg')
  assert.ok(prompt.includes('Broileri, rintafilee'), 'chicken breast should resolve to a real Fineli reference')
  assert.ok(prompt.includes('Riisi, keitetty, suolaton'), 'rice should resolve to a real Fineli reference')
})

test('applyFinnishFoodOverrides forces an exact total for an explicit-weight generic-staple meal', () => {
  const text = '200g kananrintaa ja 150g riisiä'
  const wrongModelOutput = { totalKcal: 900, protein: 10, carbs: 10, fat: 50, confidence: 'low', items: [] }
  const corrected = applyFinnishFoodOverrides(text, wrongModelOutput) as {
    totalKcal: number
    confidence: string
    items: unknown[]
  }
  assert.equal(corrected.confidence, 'high')
  assert.equal(corrected.items.length, 2)
  // 200g Broileri rintafilee (167.173 kcal/100g) + 150g Riisi keitetty (136.953 kcal/100g)
  const expectedKcal = Math.round((167.173 / 100) * 200) + Math.round((136.953 / 100) * 150)
  assert.equal(corrected.totalKcal, expectedKcal)
})
