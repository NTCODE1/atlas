/**
 * Micronutrient model — canonical keys, units, and recommended daily amounts
 * (RDA), so meal/supplement estimates can be shown as current-vs-recommended.
 *
 * Keys and units MUST match the Worker's MICRO_PROPS / MICRO_UNITS
 * (atlas-api/src/index.ts): iron/zinc/magnesium/potassium/calcium/vitaminC in
 * mg, vitaminD/vitaminB12/folate in µg, fibre/omega3/creatine in g. Creatine's
 * "rda" isn't an official nutritional RDA (it doesn't have one) — it's the
 * standard 5g/day maintenance dose, used the same way for a current-vs-target read.
 */

export type MicroKey =
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
  | 'creatine'

export interface MicroMeta {
  label: string
  unit: 'mg' | 'µg' | 'g'
  /** Recommended daily amount (adult), in `unit`. */
  rda: number
}

/** Display order + reference values. RDAs are typical adult daily targets. */
export const MICRO_META: Record<MicroKey, MicroMeta> = {
  iron: { label: 'Iron', unit: 'mg', rda: 18 },
  calcium: { label: 'Calcium', unit: 'mg', rda: 1000 },
  vitaminD: { label: 'Vitamin D', unit: 'µg', rda: 20 },
  vitaminB12: { label: 'Vitamin B12', unit: 'µg', rda: 2.4 },
  zinc: { label: 'Zinc', unit: 'mg', rda: 11 },
  magnesium: { label: 'Magnesium', unit: 'mg', rda: 400 },
  potassium: { label: 'Potassium', unit: 'mg', rda: 3500 },
  fibre: { label: 'Fibre', unit: 'g', rda: 30 },
  omega3: { label: 'Omega-3', unit: 'g', rda: 1.6 },
  vitaminC: { label: 'Vitamin C', unit: 'mg', rda: 90 },
  folate: { label: 'Folate', unit: 'µg', rda: 400 },
  creatine: { label: 'Creatine', unit: 'g', rda: 5 },
}

/** Micronutrient amounts (in each key's unit); any subset may be present. */
export type MicroAmounts = Partial<Record<MicroKey, number>>

/** All micro keys in display order. */
export const MICRO_KEYS = Object.keys(MICRO_META) as MicroKey[]

/** Sum multiple micro sources (meals + supplements) into one total. */
export function sumMicros(sources: (MicroAmounts | undefined)[]): MicroAmounts {
  const total: MicroAmounts = {}
  for (const src of sources) {
    if (!src) continue
    for (const key of MICRO_KEYS) {
      const v = src[key]
      if (typeof v === 'number') total[key] = (total[key] ?? 0) + v
    }
  }
  return total
}

/** Percent of RDA met for a key (0–999, rounded). */
export function microPercent(key: MicroKey, amount: number | undefined): number {
  if (!amount || amount <= 0) return 0
  return Math.min(Math.round((amount / MICRO_META[key].rda) * 100), 999)
}
