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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')

  return (
    <div className="flex min-h-full justify-center bg-bg">
      {/* Phone-width column */}
      <div
        className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Ambient colour glow behind the Nutrition header */}
        {activeTab === 'nutrition' && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-80"
            style={{
              background:
                'radial-gradient(120% 90% at 82% -10%, rgba(124,58,237,0.30), transparent 55%), radial-gradient(110% 80% at 8% 8%, rgba(20,160,140,0.22), transparent 55%)',
              maskImage: 'linear-gradient(to bottom, black 55%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent)',
            }}
          />
        )}

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
