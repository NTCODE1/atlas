import { useState } from 'react'
import { Bell, ChevronLeft, MessageCircleMore, Trash2 } from 'lucide-react'
import { useSettings } from '../settingsContext'
import { notificationsSupported, requestNotificationPermission } from '../notifications'
import { resetAppData } from '../resetApp'
import { useGoalHistory, useNutritionTargets } from '../nutritionTargets'
import { kgToDisplay, displayToKg, type Settings as SettingsModel, type ActivityLevel, type GoalType } from '../settings'
import AvatarUpload from '../components/settings/AvatarUpload'
import SegmentedControl from '../components/ui/SegmentedControl'

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string }[] = [
  { id: 'sedentary', label: 'Sedentary' },
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'active', label: 'Active' },
  { id: 'very_active', label: 'Very active' },
]

const GOAL_OPTIONS: { id: GoalType; label: string }[] = [
  { id: 'cut', label: 'Cut' },
  { id: 'maintain', label: 'Maintain' },
  { id: 'bulk', label: 'Bulk' },
]

interface SettingsProps {
  onClose: () => void
}

/** Full-screen settings overlay: profile, units, targets, notifications. */
export default function Settings({ onClose }: SettingsProps) {
  const { settings, setSettings, avatar, setAvatar } = useSettings()
  const [goalHistory] = useGoalHistory()
  const { targets, setTargets } = useNutritionTargets()
  const [permissionHint, setPermissionHint] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const patch = (fields: Partial<SettingsModel>) =>
    setSettings((prev) => ({ ...prev, ...fields }))

  const numberOrNull = (raw: string) => {
    const v = Number(raw)
    return raw.trim() === '' || !Number.isFinite(v) ? null : v
  }

  const toggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      patch({ notificationsEnabled: false })
      setPermissionHint(null)
      return
    }
    if (!notificationsSupported()) {
      setPermissionHint('Notifications are not supported in this browser.')
      return
    }
    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      patch({ notificationsEnabled: true })
      setPermissionHint(null)
    } else {
      setPermissionHint('Blocked in browser settings — allow notifications for this site first.')
    }
  }

  return (
    <div className="panel-enter-right glass-strong absolute inset-0 z-50 flex flex-col !rounded-none !border-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="press grid h-9 w-9 place-items-center rounded-full text-text-muted hover:text-text"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="font-display text-2xl font-bold text-text">Settings</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10">
        {/* Profile */}
        <SectionLabel>PROFILE</SectionLabel>
        <div className="glass-subtle mt-2 flex flex-col gap-4 rounded-2xl p-4">
          <AvatarUpload avatar={avatar} onChange={setAvatar} />
          <Field label="Name">
            <input
              type="text"
              value={settings.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Age">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={settings.age ?? ''}
                placeholder="—"
                onChange={(e) => patch({ age: numberOrNull(e.target.value) })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
              />
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={settings.heightCm ?? ''}
                placeholder="—"
                onChange={(e) => patch({ heightCm: numberOrNull(e.target.value) })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <Field label="Sex">
              <SegmentedControl
                options={[
                  { id: 'female', label: 'Female' },
                  { id: 'male', label: 'Male' },
                ]}
                value={settings.sex ?? 'female'}
                onChange={(sex) => patch({ sex })}
              />
            </Field>
            <Field label={`Weight (${settings.weightUnit})`}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={settings.weightKg !== null ? kgToDisplay(settings.weightKg, settings.weightUnit) : ''}
                placeholder="—"
                onChange={(e) => {
                  const v = numberOrNull(e.target.value)
                  patch({ weightKg: v === null ? null : displayToKg(v, settings.weightUnit) })
                }}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
              />
            </Field>
          </div>
        </div>

        {/* Activity & goal */}
        <SectionLabel className="mt-6">ACTIVITY &amp; GOAL</SectionLabel>
        <div className="glass-subtle mt-2 flex flex-col gap-4 rounded-2xl p-4">
          <Field label="Activity level">
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_OPTIONS.map((opt) => {
                const active = opt.id === settings.activityLevel
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ activityLevel: opt.id })}
                    aria-pressed={active}
                    className={`press rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${
                      active ? 'bg-accent/20 text-accent' : 'bg-fill text-text-muted hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Goal">
            <SegmentedControl
              options={GOAL_OPTIONS}
              value={settings.goalType ?? 'maintain'}
              onChange={(goalType) => patch({ goalType })}
            />
          </Field>
        </div>

        {/* Units */}
        <SectionLabel className="mt-6">UNITS</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          <Field label="Weight unit">
            <SegmentedControl
              options={[
                { id: 'kg', label: 'Kilograms' },
                { id: 'lb', label: 'Pounds' },
              ]}
              value={settings.weightUnit}
              onChange={(weightUnit) => patch({ weightUnit })}
            />
          </Field>
        </div>

        {/* Targets */}
        <SectionLabel className="mt-6">DAILY TARGETS</SectionLabel>
        <div className="glass-subtle mt-2 flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex gap-3">
            <Field label="Water (L)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={settings.waterGoalL}
                onChange={(e) => patch({ waterGoalL: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
            </Field>
            <Field label="Calories (kcal)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                value={targets.kcal}
                onChange={(e) => setTargets({ ...targets, kcal: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Deep work goal (hours)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={Math.round((settings.deepWorkGoalMinutes / 60) * 10) / 10}
              onChange={(e) => patch({ deepWorkGoalMinutes: Math.round((Number(e.target.value) || 0) * 60) })}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
          </Field>
          <Field label="Training sessions / week">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={settings.weeklySessionTarget}
              onChange={(e) => patch({ weeklySessionTarget: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
          </Field>
        </div>

        {/* Recovery */}
        <SectionLabel className="mt-6">RECOVERY</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          <p className="text-xs text-text-muted">
            Your normal overnight HRV range — readiness and sleep score treat anything
            outside it (too low or too high) as a sign something's off.
          </p>
          <div className="mt-3 flex gap-3">
            <Field label="HRV low (ms)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={settings.hrvRangeLowMs}
                onChange={(e) => patch({ hrvRangeLowMs: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
            </Field>
            <Field label="HRV high (ms)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={settings.hrvRangeHighMs}
                onChange={(e) => patch({ hrvRangeHighMs: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
            </Field>
          </div>
        </div>

        {/* Assistant */}
        <SectionLabel className="mt-6">ASSISTANT</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MessageCircleMore size={18} strokeWidth={2} className="text-accent" />
              <div>
                <p className="text-sm font-medium text-text">Assistant button</p>
                <p className="text-xs text-text-muted">
                  The floating chat button. Long-press it for 3 seconds to hide it.
                </p>
              </div>
            </div>
            <Toggle
              on={settings.showAssistantButton}
              onToggle={() => patch({ showAssistantButton: !settings.showAssistantButton })}
            />
          </div>
        </div>

        {/* Notifications */}
        <SectionLabel className="mt-6">NOTIFICATIONS</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bell size={18} strokeWidth={2} className="text-accent" />
              <div>
                <p className="text-sm font-medium text-text">Enable notifications</p>
                <p className="text-xs text-text-muted">
                  Important calendar entries and low sleep scores.
                </p>
              </div>
            </div>
            <Toggle on={settings.notificationsEnabled} onToggle={() => void toggleNotifications()} />
          </div>

          {permissionHint && <p className="mt-3 text-xs text-rose">{permissionHint}</p>}

          {/* In-app alerts — the header bell notification center. Independent of
              the browser toggle above, so these controls are always available. */}
          <div className="mt-4 border-t border-border pt-4">
            <Field label={`Sleep alert below score: ${settings.sleepAlertThreshold}`}>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={settings.sleepAlertThreshold}
                onChange={(e) => patch({ sleepAlertThreshold: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </Field>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">Habit streak reminders</p>
                <p className="text-xs text-text-muted">Alert when a streak is about to break.</p>
              </div>
              <Toggle
                on={settings.habitRemindersEnabled}
                onToggle={() => patch({ habitRemindersEnabled: !settings.habitRemindersEnabled })}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Apex has no server — reminders fire while the app is open.
          </p>
        </div>

        {/* Goals & targets history (set from the assistant chat) */}
        <SectionLabel className="mt-6">GOALS &amp; TARGETS</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          {goalHistory.length === 0 ? (
            <p className="text-sm text-text-muted">
              No goals set yet. Ask the assistant to set your targets — e.g. “I want to lose fat”.
            </p>
          ) : (
            <ul className="flex flex-col">
              {[...goalHistory].reverse().map((g, i) => (
                <li
                  key={g.id}
                  className={`flex flex-col gap-0.5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-text">{g.goal}</span>
                    <span className="text-xs text-text-muted">{formatSettingsDate(g.date)}</span>
                  </div>
                  <span className="font-display text-sm text-text-muted">
                    {g.kcal.toLocaleString()} kcal · {g.protein}P / {g.carbs}C / {g.fat}F
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Danger zone */}
        <SectionLabel className="mt-6">DANGER ZONE</SectionLabel>
        <div className="glass-subtle mt-2 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Trash2 size={18} strokeWidth={2} className="text-rose" />
            <div>
              <p className="text-sm font-medium text-text">Delete all data</p>
              <p className="text-xs text-text-muted">
                Wipes everything stored on this device — profile, targets, journal, nutrition,
                workouts, goals — and restarts onboarding. Cannot be undone.
              </p>
            </div>
          </div>

          {confirmingReset ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="press flex-1 rounded-lg border border-border bg-fill py-2 text-sm font-medium text-text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetAppData}
                className="press flex-1 rounded-lg bg-rose py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Yes, delete everything
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="press mt-3 w-full rounded-lg border border-rose/40 bg-rose/10 py-2 text-sm font-semibold text-rose transition-colors hover:bg-rose/20"
            >
              Delete all data
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Short "day month" for the goal history list. */
function formatSettingsDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SectionLabel({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className={`block text-[11px] font-medium tracking-wider text-text-muted ${className}`}>
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`press relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-fill-2'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-spring)' }}
      />
    </button>
  )
}
