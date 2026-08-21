#!/usr/bin/env node
/**
 * Generates src/fineliFoods.generated.ts from Fineli's official open food
 * composition data (Finnish Institute for Health and Welfare / THL,
 * CC-BY 4.0 — https://fineli.fi/fineli/en/avoin-data).
 *
 * Fineli's own site sits behind Cloudflare bot-challenge and blocks scripted
 * requests outright (verified directly — even a plain `curl` gets a JS
 * challenge page, not data), and its live JSON API only exposes a handful of
 * nutrients per food anyway. The official "Peruspaketti 2" CSV package
 * (4,058 foods × 74 nutrients) is mirrored verbatim on GitHub at
 * theel0ja/fineli-data, which IS fetchable — this script pulls from there.
 *
 * This is a manually-rerun refresh script, not part of `npm run deploy`/CI —
 * the generated output is committed, same as the hand-curated
 * FINNISH_FOOD_REFERENCE table in finnishFoods.ts is hand-maintained. Rerun
 * it only when refreshing from a newer Fineli release.
 *
 * Run with: node scripts/build-fineli-data.mjs
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'src', 'fineliFoods.generated.ts')

const SOURCE_BASE = 'https://raw.githubusercontent.com/theel0ja/fineli-data/master/basic-package-2'

/**
 * The 15 Fineli component codes (EUFDNAME) we ground the app's macros +
 * food-sourced micronutrients against, and the key each maps to in our own
 * MicroKey/macro model. `energyDivisor` converts Fineli's kJ energy to kcal
 * (ENERC ÷ 4.184). Everything else is a straight per-100g passthrough — units
 * already match ours (see micros.ts's own MICRO_META comment cross-checking
 * this against the Worker's schema).
 *
 * `creatine` isn't here: it has no food-source equivalent (supplement-only
 * maintenance dose, per micros.ts) — Fineli doesn't track it, and it stays
 * purely LLM-estimated for supplement logging, untouched by this pipeline.
 */
const COMPONENT_MAP = [
  { code: 'ENERC', field: 'kcal100', energyDivisor: 4.184 },
  { code: 'PROT', field: 'protein100' },
  { code: 'CHOAVL', field: 'carbs100' },
  { code: 'FAT', field: 'fat100' },
  { code: 'FE', field: 'iron100' },
  { code: 'CA', field: 'calcium100' },
  { code: 'VITD', field: 'vitaminD100' },
  { code: 'VITB12', field: 'vitaminB12_100' },
  { code: 'ZN', field: 'zinc100' },
  { code: 'MG', field: 'magnesium100' },
  { code: 'K', field: 'potassium100' },
  { code: 'FIBT', field: 'fibre100' },
  { code: 'FAPUN3', field: 'omega3_100' },
  { code: 'VITC', field: 'vitaminC100' },
  { code: 'FOL', field: 'folate100' },
]
const FIELD_ORDER = COMPONENT_MAP.map((c) => c.field)
const CODE_TO_FIELD = new Map(COMPONENT_MAP.map((c) => [c.code, c]))

async function fetchText(path) {
  const res = await fetch(`${SOURCE_BASE}/${path}`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  // Source CSVs are Windows-1252 encoded (confirmed via mis-decoded ä/ö bytes
  // when read as UTF-8) — decode explicitly rather than assuming UTF-8.
  return new TextDecoder('windows-1252').decode(buf)
}

/** Minimal semicolon-CSV split — verified none of these files use quoted fields. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const header = lines[0].split(';')
  return lines.slice(1).map((line) => {
    const cells = line.split(';')
    const row = {}
    header.forEach((h, i) => (row[h] = cells[i]))
    return row
  })
}

/** Fineli numbers use a Finnish decimal comma ("1698,30"). */
function parseFineliNumber(s) {
  if (s == null || s === '') return null
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function main() {
  console.log('Fetching Fineli source CSVs from theel0ja/fineli-data (basic-package-2)...')
  const [nameFiText, nameEnText, valueText] = await Promise.all([
    fetchText('foodname_FI.csv'),
    fetchText('foodname_EN.csv'),
    fetchText('component_value.csv'),
  ])

  const nameFiById = new Map(parseCsv(nameFiText).map((r) => [r.FOODID, r.FOODNAME]))
  const nameEnById = new Map(parseCsv(nameEnText).map((r) => [r.FOODID, r.FOODNAME]))

  // FOODID -> { field: value }. A component code with no row for a food is
  // left absent (undefined), never defaulted to 0 — Fineli records real
  // zeros explicitly (e.g. banana's "VITB12;0"), so "no row" and "measured
  // zero" are different facts and must stay distinguishable downstream:
  // applyFineliOverride (fineliMatch.ts) must only override a micro it
  // actually has a number for, leaving the model's own estimate for anything
  // genuinely unmeasured rather than silently forcing a false zero.
  const valuesById = new Map()
  for (const row of parseCsv(valueText)) {
    const mapping = CODE_TO_FIELD.get(row.EUFDNAME)
    if (!mapping) continue
    const raw = parseFineliNumber(row.BESTLOC)
    if (raw === null) continue
    let value = raw
    if (mapping.energyDivisor) value = raw / mapping.energyDivisor
    if (!valuesById.has(row.FOODID)) valuesById.set(row.FOODID, {})
    valuesById.get(row.FOODID)[mapping.field] = value
  }

  const foods = []
  for (const [id, nameFi] of nameFiById) {
    const values = valuesById.get(id)
    if (!values) continue
    // Skip anything missing a core macro — nothing useful to ground.
    if (values.kcal100 == null || values.protein100 == null || values.carbs100 == null || values.fat100 == null) {
      continue
    }
    foods.push({
      id: Number(id),
      nameFi,
      nameEn: nameEnById.get(id) ?? nameFi,
      ...values,
    })
  }

  console.log(`Built ${foods.length} food entries (of ${nameFiById.size} total Fineli foods).`)

  const fieldsTs = FIELD_ORDER.map((f) => `  ${f}?: number`).join('\n')
  const rowsTs = foods
    .map((f) => {
      const fields = FIELD_ORDER.map((key) => (f[key] != null ? `${key}: ${round(f[key])}` : null))
        .filter(Boolean)
        .join(', ')
      return `  { id: ${f.id}, nameFi: ${JSON.stringify(f.nameFi)}, nameEn: ${JSON.stringify(f.nameEn)}, ${fields} },`
    })
    .join('\n')

  const output = `/**
 * GENERATED FILE — do not hand-edit. Produced by scripts/build-fineli-data.mjs
 * from Fineli's official open food composition data (Finnish Institute for
 * Health and Welfare / THL), licensed CC-BY 4.0:
 * https://fineli.fi/fineli/en/avoin-data
 *
 * Source package: "Peruspaketti 2" (4,058 foods x 74 nutrients), mirrored at
 * https://github.com/theel0ja/fineli-data (basic-package-2) — see that
 * script's header comment for why the mirror is used instead of fineli.fi
 * directly. Regenerate with: node scripts/build-fineli-data.mjs
 *
 * Per-100g values, matching finnishFoods.ts's FinnishFoodRef units: iron/
 * calcium/zinc/magnesium/potassium/vitaminC in mg, vitaminD/vitaminB12/
 * folate in µg, carbs/protein/fat/fibre/omega3 in g, kcal from Fineli's kJ
 * energy value (÷ 4.184). A field is OMITTED (not 0) when Fineli has no
 * measured value for that food+nutrient — see build-fineli-data.mjs's
 * comment on valuesById for why that distinction matters.
 */

export interface FineliFoodRef {
  id: number
  nameFi: string
  nameEn: string
${fieldsTs}
}

export const FINELI_FOODS: FineliFoodRef[] = [
${rowsTs}
]
`
  writeFileSync(OUT_PATH, output, 'utf8')
  console.log(`Wrote ${OUT_PATH}`)
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
