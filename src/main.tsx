import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthGate from './auth/AuthGate.tsx'
import { HealthProvider } from './api/healthContext.tsx'
import { WorkoutProvider } from './api/workoutContext.tsx'
import { SettingsProvider } from './settingsContext.tsx'
import { NotificationProvider } from './notificationContext.tsx'
import OnboardingGate from './onboarding/OnboardingGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <HealthProvider>
        <WorkoutProvider>
          <SettingsProvider>
            <OnboardingGate>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </OnboardingGate>
          </SettingsProvider>
        </WorkoutProvider>
      </HealthProvider>
    </AuthGate>
  </StrictMode>,
)
