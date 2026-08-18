import type { ReactNode } from 'react'
import { useSettings } from '../settingsContext'
import OnboardingFlow from './OnboardingFlow'

/**
 * Gates the app behind a one-time setup flow, mirroring AuthGate's pattern:
 * renders `children` once `onboardingComplete` is set, otherwise shows the flow.
 */
export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { settings, setSettings } = useSettings()

  if (settings.onboardingComplete) return <>{children}</>

  return <OnboardingFlow onComplete={() => setSettings((prev) => ({ ...prev, onboardingComplete: true }))} />
}
