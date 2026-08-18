import SegmentedControl from '../../components/ui/SegmentedControl'
import type { Sex } from '../../settings'

interface SexStepProps {
  value: Sex | null
  onChange: (value: Sex) => void
}

/** Used only for the Mifflin-St Jeor BMR formula, which is sex-specific. */
export default function SexStep({ value, onChange }: SexStepProps) {
  return (
    <SegmentedControl
      options={[
        { id: 'female', label: 'Female' },
        { id: 'male', label: 'Male' },
      ]}
      value={value ?? 'female'}
      onChange={onChange}
    />
  )
}
