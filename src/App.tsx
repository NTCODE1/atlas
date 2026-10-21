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
import More, { type MoreScreenId } from './screens/More'
import Body from './screens/Body'
import { ChevronLeft } from 'lucide-react'
import AssistantFab from './components/AssistantFab'
import { useDailyNotifications } from './hooks/useDailyNotifications'
import { useDailySnapshot } from './hooks/useDailySnapshot'
import { useSettings } from './settingsContext'

/** Every routable screen: the five tabs plus the screens nested under More. */
type ScreenId = TabId | MoreScreenId

const MORE_SCREENS: Record<MoreScreenId, true> = {
  body: true,
  sleep: true,
  energy: true,
  motivation: true,
  finance: true,
  social: true,
}

const isMoreScreen = (id: ScreenId): id is MoreScreenId => id in MORE_SCREENS

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('today')
  // More's sub-screens keep the More tab highlighted.
  const activeTab: TabId = isMoreScreen(screen) ? 'more' : screen
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const { settings, setSettings } = useSettings()

  useDailyNotifications()
  useDailySnapshot()

  return (
    <div className="flex min-h-full justify-center bg-bg">
      {/* Phone-width column — one shared gradient backdrop (see .app-bg),
          so it stays put while screens change on top of it. */}
      <div
        className="app-bg relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header onOpenSettings={() => setSettingsOpen(true)} />

        {/* Screen region — keyed remount so each tab springs in. */}
        <div key={screen} className="screen-enter fade-top flex min-h-0 flex-1 flex-col">
          {/* Sub-screens under More get a back link to the list. */}
          {isMoreScreen(screen) && (
            <button
              type="button"
              onClick={() => setScreen('more')}
              className="press -mt-1 mb-1 flex items-center gap-0.5 self-start px-5 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              <ChevronLeft size={18} strokeWidth={1.9} />
              More
            </button>
          )}

          {screen === 'today' ? (
            <Home
              onOpenSleep={() => setScreen('sleep')}
              onOpenBody={() => setScreen('body')}
              onQuickAdd={(target) =>
                target === 'assistant'
                  ? setAssistantOpen(true)
                  : setScreen(target === 'meal' ? 'food' : target === 'workout' ? 'train' : 'energy')
              }
            />
          ) : screen === 'train' ? (
            <Training />
          ) : screen === 'food' ? (
            <Nutrition />
          ) : screen === 'plan' ? (
            <Journal />
          ) : screen === 'more' ? (
            <More onOpen={setScreen} onOpenSettings={() => setSettingsOpen(true)} />
          ) : screen === 'body' ? (
            <Body />
          ) : screen === 'sleep' ? (
            <Sleep />
          ) : screen === 'energy' ? (
            <Energy />
          ) : screen === 'motivation' ? (
            <Motivation />
          ) : screen === 'finance' ? (
            <Finance />
          ) : (
            <Social />
          )}
        </div>

        {settings.showAssistantButton && (
          <AssistantFab
            onClick={() => setAssistantOpen(true)}
            onHide={() => setSettings((s) => ({ ...s, showAssistantButton: false }))}
          />
        )}

        <TabBar active={activeTab} onChange={setScreen} />

        {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

        {assistantOpen && <Assistant onClose={() => setAssistantOpen(false)} />}
      </div>
    </div>
  )
}
