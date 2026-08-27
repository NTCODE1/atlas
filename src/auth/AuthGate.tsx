/**
 * Gates the whole app behind a passkey unlock. Renders `children` only once a
 * valid session token is present; otherwise shows the unlock screen (Face ID /
 * fingerprint), with a SETUP_CODE-guarded "set up this device" flow for
 * enrolling a new passkey.
 *
 * A live `atlas:unauthorized` event (dispatched from `onUnauthorized` when the
 * Worker returns 401) drops the gate back to locked without a full reload.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { Fingerprint, Loader2 } from 'lucide-react'
import { ApexWordmark } from '../components/Header'
import { hasValidToken } from './session'
import { login, register, passkeyReady } from './passkey'

type Mode = 'unlock' | 'setup'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(hasValidToken)
  const [mode, setMode] = useState<Mode>('unlock')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [label, setLabel] = useState('')

  // Re-lock if the Worker rejects a token mid-session.
  useEffect(() => {
    const onUnauth = () => setUnlocked(false)
    window.addEventListener('atlas:unauthorized', onUnauth)
    return () => window.removeEventListener('atlas:unauthorized', onUnauth)
  }, [])

  if (unlocked) return <>{children}</>

  const ready = passkeyReady()

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setUnlocked(true)
    } catch (err) {
      // A user cancelling the Face ID / fingerprint sheet throws — keep it quiet.
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full justify-center bg-bg text-text">
      <div
        className="flex h-dvh w-full max-w-[420px] flex-col items-center justify-center px-8"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <ApexWordmark className="h-9 w-auto text-text" />
        <p className="mt-5 text-center text-sm text-text-muted">
          {ready
            ? mode === 'unlock'
              ? 'Unlock with Face ID or your fingerprint.'
              : 'Enter your setup code to enroll this device.'
            : 'Passkeys are unavailable here — set VITE_HEALTH_API_URL and use a browser that supports WebAuthn.'}
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-rose/10 px-3 py-2 text-center text-xs text-rose">
            {error}
          </p>
        )}

        {ready && mode === 'unlock' && (
          <div className="mt-8 w-full">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(login)}
              className="press flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null)
                setMode('setup')
              }}
              className="press mt-3 w-full py-2 text-xs font-medium text-text-muted transition-colors hover:text-text disabled:opacity-60"
            >
              Set up this device
            </button>
          </div>
        )}

        {ready && mode === 'setup' && (
          <form
            className="mt-8 w-full"
            onSubmit={(e) => {
              e.preventDefault()
              if (setupCode.trim()) run(async () => {
                await register(setupCode.trim(), label.trim() || undefined)
                await login()
              })
            }}
          >
            <input
              type="password"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              placeholder="Setup code"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-fill px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Device name (optional)"
              autoComplete="off"
              className="mt-3 w-full rounded-xl border border-border bg-fill px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !setupCode.trim()}
              className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {busy ? 'Enrolling…' : 'Enroll passkey'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null)
                setMode('unlock')
              }}
              className="press mt-3 w-full py-2 text-xs font-medium text-text-muted transition-colors hover:text-text disabled:opacity-60"
            >
              Back to unlock
            </button>
          </form>
        )}

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => setUnlocked(true)}
            className="mt-10 text-[11px] text-text-muted/60 underline"
          >
            Skip (dev only)
          </button>
        )}
      </div>
    </div>
  )
}
