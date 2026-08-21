import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useSettings } from '../settingsContext'
import { useNutritionTargets, useGoalHistory } from '../nutritionTargets'
import { useWeightLog } from '../hooks/useWeightLog'
import { todayISO } from '../workouts'
import type { ActivityLevel, GoalType, Sex } from '../settings'
import { DEFAULT_MACRO_SPLIT, estimateCalorieGoal, macroGramsFromSplit } from '../onboardingCalc'
import UnitsStep, { type UnitSystem } from './steps/UnitsStep'
import SexStep from './steps/SexStep'
import BodyStep from './steps/BodyStep'
import ActivityStep from './steps/ActivityStep'
import GoalStep from './steps/GoalStep'
import TargetsStep from './steps/TargetsStep'

const STEPS = ['units', 'sex', 'body', 'activity', 'goal', 'targets'] as const
type StepId = (typeof STEPS)[number]

const STEP_COPY: Record<StepId, { title: string; subtitle: string }> = {
  units: { title: 'Units', subtitle: 'How should Atlas show your measurements?' },
  sex: { title: 'Sex', subtitle: 'Used for your calorie estimate (Mifflin-St Jeor).' },
  body: { title: 'About you', subtitle: 'Age, height, and current weight.' },
  activity: { title: 'Activity level', subtitle: 'How active is your typical week?' },
  goal: { title: 'Your goal', subtitle: "What are you working towards?" },
  targets: { title: 'Daily targets', subtitle: 'A starting point — tune it any time.' },
}

interface OnboardingFlowProps {
  onComplete: () => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { setSettings } = useSettings()
  const { setTargets } = useNutritionTargets()
  const [, setGoalHistory] = useGoalHistory()
  const [weightEntries, setWeightEntries] = useWeightLog()

  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]

  const [unit, setUnit] = useState<UnitSystem>('metric')
  const [sex, setSex] = useState<Sex | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [kcal, setKcal] = useState(2000)
  const [kcalTouched, setKcalTouched] = useState(false)
  const [split, setSplit] = useState(DEFAULT_MACRO_SPLIT.maintain)

  const computedKcal = useMemo(() => {
    if (!sex || !weightKg || !heightCm || !age || !activityLevel || !goalType) return null
    return estimateCalorieGoal({ sex, weightKg, heightCm, age, activityLevel, goalType })
  }, [sex, weightKg, heightCm, age, activityLevel, goalType])

  // Track the calorie estimate until the user edits it directly.
  useEffect(() => {
    if (computedKcal !== null && !kcalTouched) setKcal(computedKcal)
  }, [computedKcal, kcalTouched])

  // Reset the macro split to the goal's default whenever the goal changes.
  useEffect(() => {
    if (goalType) setSplit(DEFAULT_MACRO_SPLIT[goalType])
  }, [goalType])

  const stepValid: Record<StepId, boolean> = {
    units: true,
    sex: sex !== null,
    body: age !== null && age > 0 && heightCm !== null && heightCm > 0 && weightKg !== null && weightKg > 0,
    activity: activityLevel !== null,
    goal: goalType !== null,
    targets: kcal > 0 && split.protein + split.carbs + split.fat === 100,
  }

  const canAdvance = stepValid[step]
  const isLast = stepIndex === STEPS.length - 1

  const finish = () => {
    if (!sex || !activityLevel || !goalType || !weightKg || !heightCm || !age) return
    const grams = macroGramsFromSplit(kcal, split)

    setSettings((prev) => ({
      ...prev,
      sex,
      activityLevel,
      goalType,
      weightKg,
      age,
      heightCm,
      weightUnit: unit === 'metric' ? 'kg' : 'lb',
      onboardingComplete: true,
    }))

    setTargets({ kcal, protein: grams.protein, carbs: grams.carbs, fat: grams.fat })

    setGoalHistory((prev) => [
      ...prev,
      {
        id: `ob-${Date.now()}`,
        date: todayISO(),
        goal: `${goalType[0].toUpperCase()}${goalType.slice(1)} · onboarding`,
        kcal,
        protein: grams.protein,
        carbs: grams.carbs,
        fat: grams.fat,
      },
    ])

    if (!weightEntries.some((e) => e.date === todayISO())) {
      setWeightEntries((prev) => [...prev, { date: todayISO(), kg: weightKg }])
    }

    onComplete()
  }

  const next = () => {
    if (!canAdvance) return
    if (isLast) return finish()
    setStepIndex((i) => i + 1)
  }

  const back = () => setStepIndex((i) => Math.max(0, i - 1))

  return (
    <div className="flex min-h-full justify-center bg-bg text-text">
      <div
        className="flex h-dvh w-full max-w-[420px] flex-col px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header: back + progress */}
        <div className="flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            aria-label="Back"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted hover:text-text disabled:opacity-0"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-accent' : 'bg-fill-2'
                }`}
              />
            ))}
          </div>
        </div>

        <div key={step} className="screen-enter min-h-0 flex-1 overflow-y-auto py-6">
          <h1 className="font-display text-2xl font-bold text-text">{STEP_COPY[step].title}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{STEP_COPY[step].subtitle}</p>

          <div className="mt-6">
            {step === 'units' && <UnitsStep value={unit} onChange={setUnit} />}
            {step === 'sex' && <SexStep value={sex} onChange={setSex} />}
            {step === 'body' && (
              <BodyStep
                unit={unit}
                age={age}
                heightCm={heightCm}
                weightKg={weightKg}
                onChange={(patch) => {
                  if (patch.age !== undefined) setAge(patch.age)
                  if (patch.heightCm !== undefined) setHeightCm(patch.heightCm)
                  if (patch.weightKg !== undefined) setWeightKg(patch.weightKg)
                }}
              />
            )}
            {step === 'activity' && <ActivityStep value={activityLevel} onChange={setActivityLevel} />}
            {step === 'goal' && <GoalStep value={goalType} onChange={setGoalType} />}
            {step === 'targets' && (
              <TargetsStep
                computedKcal={computedKcal}
                kcal={kcal}
                onKcalChange={(v) => {
                  setKcalTouched(true)
                  setKcal(v)
                }}
                split={split}
                onSplitChange={setSplit}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!canAdvance}
          onClick={next}
          className="press mb-[calc(1.5rem+env(safe-area-inset-bottom))] flex w-full items-center justify-center rounded-full bg-accent py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isLast ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
