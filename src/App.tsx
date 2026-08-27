import { useState } from 'react'
import Header from './components/Header'
import TabBar from './components/TabBar'
import type { TabId } from './components/TabBar'
import Home from './screens/Home'
import Energy from './screens/Energy'
import Sleep from './screens/Sleep'
import Training from './screens/Training'
import Nutrition from './screens/Nutrition'
import Journal from './screens/Journal'
import Motivation from './screens/Motivation'
import Finance from './screens/Finance'
import Social from './screens/Social'
import Settings from './screens/Settings'
import Assistant from './screens/Assistant'
import AssistantFab from './components/AssistantFab'
import { useDailyNotifications } from './hooks/useDailyNotifications'
import { useDailySnapshot } from './hooks/useDailySnapshot'
import { useSettings } from './settingsContext'

/** Per-page ambient top glow — monochrome, varied position/strength per tab so
    switching tabs still cross-fades with a sense of motion. */
const TAB_GRADIENTS: Record<TabId, string> = {
  home: 'radial-gradient(135% 100% at 85% -12%, rgba(255,255,255,0.14), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(200,205,215,0.08), transparent 52%)',
  energy:
    'radial-gradient(135% 100% at 88% -12%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(255,255,255,0.07), transparent 52%)',
  sleep:
    'radial-gradient(135% 100% at 85% -12%, rgba(211,214,221,0.12), transparent 55%), radial-gradient(120% 95% at 6% -6%, rgba(20,22,28,0.55), transparent 50%)',
  training:
    'radial-gradient(135% 100% at 88% -12%, rgba(255,255,255,0.13), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(154,160,171,0.08), transparent 52%)',
  nutrition:
    'radial-gradient(135% 100% at 88% -12%, rgba(255,255,255,0.14), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(199,203,212,0.09), transparent 52%), radial-gradient(90% 70% at 60% 0%, rgba(255,255,255,0.06), transparent 60%)',
  journal:
    'radial-gradient(135% 100% at 85% -12%, rgba(199,203,212,0.11), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(58,63,74,0.30), transparent 52%)',
  motivation:
    'radial-gradient(135% 100% at 85% -12%, rgba(255,255,255,0.15), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(199,203,212,0.10), transparent 52%)',
  finance:
    'radial-gradient(135% 100% at 88% -12%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(154,160,171,0.09), transparent 52%)',
  social:
    'radial-gradient(135% 100% at 85% -12%, rgba(255,255,255,0.13), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(199,203,212,0.09), transparent 52%)',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const { settings, setSettings } = useSettings()

  useDailyNotifications()
  useDailySnapshot()

  return (
    <div className="flex min-h-full justify-center bg-bg">
      {/* Phone-width column */}
      <div
        className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Ambient blue glow behind each page's header — one layer per tab so
            switching cross-fades (background-image itself can't transition). */}
        {(Object.keys(TAB_GRADIENTS) as TabId[]).map((id) => (
          <div
            key={id}
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-[360px] transition-opacity duration-500 ${
              id === activeTab ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background: TAB_GRADIENTS[id],
              maskImage: 'linear-gradient(to bottom, black 50%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent)',
            }}
          />
        ))}

        <Header onOpenSettings={() => setSettingsOpen(true)} />

        {/* Screen region — keyed remount so each tab springs in. */}
        <div key={activeTab} className="screen-enter flex min-h-0 flex-1 flex-col">
          {activeTab === 'home' ? (
            <Home />
          ) : activeTab === 'energy' ? (
            <Energy />
          ) : activeTab === 'sleep' ? (
            <Sleep />
          ) : activeTab === 'training' ? (
            <Training />
          ) : activeTab === 'nutrition' ? (
            <Nutrition />
          ) : activeTab === 'journal' ? (
            <Journal />
          ) : activeTab === 'motivation' ? (
            <Motivation />
          ) : activeTab === 'finance' ? (
            <Finance />
          ) : activeTab === 'social' ? (
            <Social />
          ) : (
            <div className="flex-1 overflow-y-auto px-6" />
          )}
        </div>

        {settings.showAssistantButton && (
          <AssistantFab
            onClick={() => setAssistantOpen(true)}
            onHide={() => setSettings((s) => ({ ...s, showAssistantButton: false }))}
          />
        )}

        <TabBar active={activeTab} onChange={setActiveTab} />

        {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

        {assistantOpen && <Assistant onClose={() => setAssistantOpen(false)} />}
      </div>
    </div>
  )
}
