import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useSyncedStorage } from './hooks/useSyncedStorage'
import { DEFAULT_SETTINGS, type Settings } from './settings'

/** PWA browser-chrome color per theme (matches --color-bg). */
const THEME_COLOR = { dark: '#08090C', light: '#f4f5f7' } as const

interface SettingsContextValue {
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  avatar: string | null
  setAvatar: React.Dispatch<React.SetStateAction<string | null>>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/**
 * Single owner of the persisted settings + avatar. useLocalStorage instances
 * don't sync across components, so everything reads through this context.
 * Synced through the Worker (see hooks/useSyncedStorage.ts /
 * atlas-api/src/sync/settingsSync.ts's "settings"/"settingsAvatar" domains)
 * so a preference changed on one device follows to another.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setSettings] = useSyncedStorage<Settings>('atlas.settings', DEFAULT_SETTINGS, 'settings')
  const [avatar, setAvatar] = useSyncedStorage<string | null>('atlas.settings.avatar', null, 'settingsAvatar')

  // Merge over defaults so settings saved by older app versions gain new fields.
  const settings = { ...DEFAULT_SETTINGS, ...stored }

  // Apply the theme to the document root; CSS variables do the rest.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[settings.theme])
  }, [settings.theme])

  return (
    <SettingsContext.Provider value={{ settings, setSettings, avatar, setAvatar }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
