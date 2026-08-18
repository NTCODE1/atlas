/**
 * Wipes every key this app owns (all localStorage keys are prefixed "atlas.")
 * and reloads, so the app boots exactly as it would on a fresh install —
 * onboarding included, since atlas.settings (which holds onboardingComplete)
 * is cleared too.
 */
export function resetAppData(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('atlas.'))
  for (const key of keys) localStorage.removeItem(key)
  window.location.reload()
}
