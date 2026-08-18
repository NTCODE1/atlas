import {
  Apple,
  Bed,
  Beer,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Cake,
  Camera,
  Check,
  Cigarette,
  Coffee,
  Droplet,
  Dumbbell,
  FileText,
  Footprints,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Moon,
  Mountain,
  Music,
  NotebookPen,
  PartyPopper,
  PersonStanding,
  Phone,
  Pill,
  Pizza,
  Plane,
  Plus,
  Settings,
  ShoppingBag,
  Smartphone,
  SquarePen,
  Star,
  Stethoscope,
  Sun,
  Target,
  Trash2,
  Users,
  Utensils,
  Wallet,
  Waves,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Curated icon registry for journal days and habits.
 * The first six ids are exactly the legacy `JournalActivity` values with the
 * same icons, so old journal data maps over without any translation.
 */
export type IconId =
  | 'run'
  | 'strength'
  | 'swim'
  | 'rest'
  | 'sleep'
  | 'journal'
  | 'bike'
  | 'hike'
  | 'heart'
  | 'mind'
  | 'read'
  | 'music'
  | 'travel'
  | 'work'
  | 'study'
  | 'social'
  | 'party'
  | 'meal'
  | 'coffee'
  | 'drinks'
  | 'health'
  | 'doctor'
  | 'shopping'
  | 'sunshine'
  | 'photo'
  | 'gaming'
  | 'call'
  | 'gift'
  | 'birthday'
  | 'star'
  | 'smoking'
  | 'wine'
  | 'phone-free'
  | 'junk-food'

export const ICONS: Record<IconId, LucideIcon> = {
  run: Footprints,
  strength: Dumbbell,
  swim: Waves,
  rest: Moon,
  sleep: Bed,
  journal: FileText,
  bike: Bike,
  hike: Mountain,
  heart: Heart,
  mind: Brain,
  read: BookOpen,
  music: Music,
  travel: Plane,
  work: Briefcase,
  study: GraduationCap,
  social: Users,
  party: PartyPopper,
  meal: Utensils,
  coffee: Coffee,
  drinks: Beer,
  health: Pill,
  doctor: Stethoscope,
  shopping: ShoppingBag,
  sunshine: Sun,
  photo: Camera,
  gaming: Gamepad2,
  call: Phone,
  gift: Gift,
  birthday: Cake,
  star: Star,
  smoking: Cigarette,
  wine: Wine,
  'phone-free': Smartphone,
  'junk-food': Pizza,
}

export const ICON_LABEL: Record<IconId, string> = {
  run: 'Run',
  strength: 'Strength',
  swim: 'Swim',
  rest: 'Rest',
  sleep: 'Sleep',
  journal: 'Journal',
  bike: 'Bike',
  hike: 'Hike',
  heart: 'Heart',
  mind: 'Mind',
  read: 'Read',
  music: 'Music',
  travel: 'Travel',
  work: 'Work',
  study: 'Study',
  social: 'Social',
  party: 'Party',
  meal: 'Meal',
  coffee: 'Coffee',
  drinks: 'Drinks',
  health: 'Health',
  doctor: 'Doctor',
  shopping: 'Shopping',
  sunshine: 'Sunshine',
  photo: 'Photo',
  gaming: 'Gaming',
  call: 'Call',
  gift: 'Gift',
  birthday: 'Birthday',
  star: 'Star',
  smoking: 'Smoking',
  wine: 'Wine',
  'phone-free': 'Phone',
  'junk-food': 'Junk food',
}

/** All icon ids in display order (registry insertion order). */
export const ICON_IDS = Object.keys(ICONS) as IconId[]

/**
 * Shared action icons for quick-actions and logging buttons across the app.
 * Kept SEPARATE from the journal `ICONS` registry so they don't appear in the
 * journal `IconPicker` (which iterates `ICON_IDS`).
 */
export type ActionIconId =
  | 'run'
  | 'dumbbell'
  | 'barbell'
  | 'bike'
  | 'swim'
  | 'yoga'
  | 'book'
  | 'journal'
  | 'money'
  | 'food'
  | 'water'
  | 'apple'
  | 'pills'
  | 'heart'
  | 'target'
  | 'settings'
  | 'edit'
  | 'delete'
  | 'add'
  | 'check'

export const ACTION_ICONS: Record<ActionIconId, LucideIcon> = {
  run: Footprints,
  dumbbell: Dumbbell,
  barbell: Dumbbell,
  bike: Bike,
  swim: Waves,
  yoga: PersonStanding,
  book: BookOpen,
  journal: NotebookPen,
  money: Wallet,
  food: Utensils,
  water: Droplet,
  apple: Apple,
  pills: Pill,
  heart: Heart,
  target: Target,
  settings: Settings,
  edit: SquarePen,
  delete: Trash2,
  add: Plus,
  check: Check,
}

export const ACTION_ICON_LABEL: Record<ActionIconId, string> = {
  run: 'Run',
  dumbbell: 'Dumbbell',
  barbell: 'Barbell',
  bike: 'Bike',
  swim: 'Swim',
  yoga: 'Yoga',
  book: 'Book',
  journal: 'Journal',
  money: 'Money',
  food: 'Food',
  water: 'Water',
  apple: 'Nutrition',
  pills: 'Supplement',
  heart: 'Health',
  target: 'Goal',
  settings: 'Settings',
  edit: 'Edit',
  delete: 'Delete',
  add: 'Add',
  check: 'Complete',
}

/** All action icon ids in display order (registry insertion order). */
export const ACTION_ICON_IDS = Object.keys(ACTION_ICONS) as ActionIconId[]
