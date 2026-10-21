import { useState } from 'react'
import { Coffee, Droplet, Dumbbell, MessageCircle, Scale, Utensils } from 'lucide-react'
import { useHydration } from '../../hooks/useHydration'
import Sheet from '../ui/Sheet'
import ListRow, { IconDisc } from '../ui/ListRow'

export type QuickAddTarget = 'weight' | 'meal' | 'workout' | 'caffeine' | 'assistant'

interface QuickAddSheetProps {
  onPick: (target: QuickAddTarget) => void
  onClose: () => void
}

const WATER_ML = 250

/** Today's "+" menu: two taps to log anything. Water logs in place; the rest
 *  hand off to the screen/sheet that owns that log. */
export default function QuickAddSheet({ onPick, onClose }: QuickAddSheetProps) {
  const { addDrink, totalMl } = useHydration()
  const [addedWater, setAddedWater] = useState(false)

  const addWater = () => {
    addDrink('Water', WATER_ML)
    setAddedWater(true)
  }

  return (
    <Sheet title="Quick add" onClose={onClose}>
      <div className="glass-subtle divide-y divide-white/[0.05] overflow-hidden rounded-2xl">
        <ListRow
          leading={<IconDisc><Scale size={17} strokeWidth={1.75} /></IconDisc>}
          title="Log weight"
          subtitle="Morning, after the toilet, before food"
          onClick={() => onPick('weight')}
        />
        <ListRow
          leading={<IconDisc><Utensils size={17} strokeWidth={1.75} /></IconDisc>}
          title="Log a meal"
          onClick={() => onPick('meal')}
        />
        <ListRow
          leading={<IconDisc><Droplet size={17} strokeWidth={1.75} /></IconDisc>}
          title={addedWater ? 'Water added' : `Add water · ${WATER_ML} ml`}
          subtitle={`${(totalMl / 1000).toFixed(2)} L today`}
          trailing={addedWater ? 'tap for another' : undefined}
          chevron={false}
          onClick={addWater}
        />
        <ListRow
          leading={<IconDisc><Dumbbell size={17} strokeWidth={1.75} /></IconDisc>}
          title="Start a workout"
          onClick={() => onPick('workout')}
        />
        <ListRow
          leading={<IconDisc><Coffee size={17} strokeWidth={1.75} /></IconDisc>}
          title="Log caffeine"
          subtitle="None after 14:00"
          onClick={() => onPick('caffeine')}
        />
        <ListRow
          leading={<IconDisc><MessageCircle size={17} strokeWidth={1.75} /></IconDisc>}
          title="Ask Apex"
          onClick={() => onPick('assistant')}
        />
      </div>
    </Sheet>
  )
}
