import { useEffect, useRef, useState } from 'react'

/**
 * Thin wrapper over the browser Web Speech API (free, no key, no backend). It is
 * feature-detected — `supported` is false where the API is unavailable (e.g.
 * Firefox) so callers can hide the mic. While listening, `onTranscript` is called
 * with the cumulative text of the current dictation. Audio is processed by the
 * browser vendor (Chrome → Google, Safari → Apple), not on-device.
 */

// The webkit-prefixed constructor isn't in TS's lib.dom, so type it minimally.
interface SpeechAlt {
  transcript: string
}
interface SpeechResult {
  0: SpeechAlt
  isFinal: boolean
}
interface SpeechEvent {
  results: { length: number; [i: number]: SpeechResult }
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface UseSpeechRecognition {
  supported: boolean
  listening: boolean
  start: () => void
  stop: () => void
}

export function useSpeechRecognition(
  onTranscript: (text: string) => void,
): UseSpeechRecognition {
  const [supported] = useState(() => getCtor() !== null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<Recognition | null>(null)
  // Keep the latest callback without re-creating the recognition instance.
  const cbRef = useRef(onTranscript)
  cbRef.current = onTranscript

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      cbRef.current(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => {
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
      recRef.current = null
    }
  }, [])

  const start = () => {
    const rec = recRef.current
    if (!rec || listening) return
    try {
      rec.start()
      setListening(true)
    } catch {
      /* start() throws if already running — ignore */
    }
  }

  const stop = () => {
    try {
      recRef.current?.stop()
    } catch {
      /* not running */
    }
    setListening(false)
  }

  return { supported, listening, start, stop }
}
