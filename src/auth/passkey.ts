/**
 * Passkey (WebAuthn) enrollment + unlock for the Apex PWA.
 *
 * Thin wrappers over @simplewebauthn/browser that talk to the Worker's
 * `/api/auth/*` routes. `register` enrolls this device (guarded by the one-time
 * SETUP_CODE); `login` proves the passkey and stores the returned session token.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { setToken } from './session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined

function apiUrl(path: string): string {
  return (API_BASE ?? '').replace(/\/+$/, '') + path
}

async function postJSON<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `request failed (${res.status})`)
  }
  return data as T
}

/** True when the API URL is configured and the browser can do WebAuthn. */
export function passkeyReady(): boolean {
  return !!API_BASE && browserSupportsWebAuthn()
}

/** Enroll this device's passkey. Requires the one-time SETUP_CODE. */
export async function register(setupCode: string, label?: string): Promise<void> {
  const { options, challengeId } = await postJSON<{ options: never; challengeId: string }>(
    '/api/auth/register/options',
    { setupCode, label },
  )
  const response = await startRegistration({ optionsJSON: options })
  await postJSON('/api/auth/register/verify', { challengeId, response })
}

/** Unlock: prove the passkey with Face ID / fingerprint and store the session token. */
export async function login(): Promise<void> {
  const { options, challengeId } = await postJSON<{ options: never; challengeId: string }>(
    '/api/auth/login/options',
    {},
  )
  const response = await startAuthentication({ optionsJSON: options })
  const { token } = await postJSON<{ token?: string }>('/api/auth/login/verify', {
    challengeId,
    response,
  })
  if (!token) throw new Error('no token returned')
  setToken(token)
}
