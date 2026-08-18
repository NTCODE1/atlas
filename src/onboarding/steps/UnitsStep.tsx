import SegmentedControl from '../../components/ui/SegmentedControl'

export type UnitSystem = 'metric' | 'imperial'

interface UnitsStepProps {
  value: UnitSystem
  onChange: (value: UnitSystem) => void
}

export default function UnitsStep({ value, onChange }: UnitsStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        options={[
          { id: 'metric', label: 'Metric (kg, cm)' },
          { id: 'imperial', label: 'Imperial (lb, ft/in)' },
        ]}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
