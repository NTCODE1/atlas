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

/** Per-page ambient top gradient — varied shades of blue for visual interest. */
const TAB_GRADIENTS: Record<TabId, string> = {
  home: 'radial-gradient(135% 100% at 85% -12%, rgba(46,91,255,0.40), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(0,164,255,0.26), transparent 52%)',
  energy:
    'radial-gradient(135% 100% at 88% -12%, rgba(0,164,255,0.36), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(0,231,255,0.24), transparent 52%)',
  sleep:
    'radial-gradient(135% 100% at 85% -12%, rgba(138,147,255,0.34), transparent 55%), radial-gradient(120% 95% at 6% -6%, rgba(4,4,74,0.55), transparent 50%)',
  training:
    'radial-gradient(135% 100% at 88% -12%, rgba(46,91,255,0.38), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(0,231,255,0.22), transparent 52%)',
  nutrition:
    'radial-gradient(135% 100% at 88% -12%, rgba(46,91,255,0.40), transparent 55%), radial-gradient(120% 95% at 4% -4%, rgba(0,164,255,0.28), transparent 52%), radial-gradient(90% 70% at 60% 0%, rgba(103,186,244,0.20), transparent 60%)',
  journal:
    'radial-gradient(135% 100% at 85% -12%, rgba(103,186,244,0.32), transparent 55%), radial-gradient(120% 95% at 6% -4%, rgba(30,70,107,0.45), transparent 52%)',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')

  return (
    <div className="flex min-h-full justify-center bg-bg">
      {/* Phone-width column */}
      <div
        className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Ambient blue glow behind each page's header */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
          style={{
            background: TAB_GRADIENTS[activeTab],
            maskImage: 'linear-gradient(to bottom, black 50%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent)',
          }}
        />

        <Header />

        {/* Screen region */}
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
        ) : (
          <div className="flex-1 overflow-y-auto px-6" />
        )}

        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  )
}
