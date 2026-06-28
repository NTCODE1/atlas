import { useState } from 'react'
import Header from './components/Header'
import TabBar from './components/TabBar'
import type { TabId } from './components/TabBar'
import Home from './screens/Home'
import Energy from './screens/Energy'
import Sleep from './screens/Sleep'
import Training from './screens/Training'
import Journal from './screens/Journal'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')

  return (
    <div className="flex min-h-full justify-center bg-bg">
      {/* Phone-width column */}
      <div
        className="flex h-dvh w-full max-w-[420px] flex-col bg-bg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
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
