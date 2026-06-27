import { user, formatToday, readiness, stats } from '../data'
import ReadinessRing from '../components/home/ReadinessRing'
import StatTile from '../components/home/StatTile'
import FocusCard from '../components/home/FocusCard'
import ProgressTile from '../components/home/ProgressTile'
import HydrationTile from '../components/home/HydrationTile'
import MoodCard from '../components/home/MoodCard'

export default function Home() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">
          {user.greeting}, {user.name}
        </h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Readiness ring */}
      <div className="mt-4 rounded-3xl border border-border bg-surface px-4 py-6">
        <ReadinessRing score={readiness.score} label={readiness.label} />
        <p className="mx-auto mt-5 max-w-[18rem] text-center text-sm leading-relaxed text-text-muted">
          {readiness.verdict}
        </p>

        {/* Three stat tiles */}
        <div className="mt-5 flex gap-2.5">
          {stats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      {/* Today's Focus */}
      <div className="mt-4">
        <FocusCard />
      </div>

      {/* Deep Work + Hydration */}
      <div className="mt-4 flex gap-3">
        <ProgressTile />
        <HydrationTile />
      </div>

      {/* Current Mood */}
      <div className="mt-4">
        <MoodCard />
      </div>
    </div>
  )
}
