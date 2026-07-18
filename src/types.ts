export type Trip = {
  id: string
  name: string
  emoji: string
  start_date: string // 'YYYY-MM-DD', inclusive
  end_date: string // inclusive
}

export type Stay = {
  id: string
  trip_id: string
  location_name: string
  start_date: string // arrival day
  end_date: string // departure day (inclusive, may overlap next stay's arrival)
  color: string
  map_url: string
  notes: string
}

export type TravelMode = 'flight' | 'train' | 'bus' | 'ferry' | 'car'

export type Leg = {
  id: string
  trip_id: string
  date: string // departure day
  arrive_date: string | null // arrival day if different (overnight flights etc.)
  from_name: string
  to_name: string
  mode: TravelMode
  notes: string
}

export type Place = {
  id: string
  trip_id: string
  stay_id: string | null // null = general idea, not tied to a stay
  date: string | null // set = a visit planned for this specific day
  start_time: string | null // 'HH:MM', optional
  end_time: string | null // 'HH:MM', optional
  name: string
  category: string
  emoji: string // custom emoji; '' = use the category's emoji
  map_url: string
  notes: string
}

export type TripData = {
  stays: Stay[]
  legs: Leg[]
  places: Place[]
}

export const EMPTY_TRIP_DATA: TripData = { stays: [], legs: [], places: [] }

export const MODES: { id: TravelMode; emoji: string; label: string }[] = [
  { id: 'flight', emoji: '✈️', label: 'Flight' },
  { id: 'train', emoji: '🚆', label: 'Train' },
  { id: 'bus', emoji: '🚌', label: 'Bus' },
  { id: 'ferry', emoji: '⛴️', label: 'Ferry' },
  { id: 'car', emoji: '🚗', label: 'Car' },
]

export const modeEmoji = (m: string) => MODES.find(x => x.id === m)?.emoji ?? '🧭'

export const STAY_COLORS = [
  '#FFD9C7', // peach
  '#C9E8D2', // mint
  '#CBE4F6', // sky
  '#E6D9F7', // lilac
  '#FBEFC3', // lemon
  '#F9D3E1', // rose
  '#D5EDE8', // seafoam
  '#F3E0CE', // sand
]

export const PLACE_CATEGORIES: { id: string; emoji: string; label: string }[] = [
  { id: 'food', emoji: '🍜', label: 'Food' },
  { id: 'cafe', emoji: '☕', label: 'Café' },
  { id: 'sight', emoji: '⛩️', label: 'Sight' },
  { id: 'nature', emoji: '🌿', label: 'Nature' },
  { id: 'shopping', emoji: '🛍️', label: 'Shopping' },
  { id: 'list', emoji: '📑', label: 'Saved list (e.g. Google Maps)' },
  { id: 'other', emoji: '✨', label: 'Other' },
]

export const categoryEmoji = (c: string) =>
  PLACE_CATEGORIES.find(x => x.id === c)?.emoji ?? '✨'

export const placeEmoji = (p: Pick<Place, 'emoji' | 'category'>) =>
  p.emoji || categoryEmoji(p.category)

/** '13:00' / '13:00–16:00' / '–16:00'; '' when no times. Trims DB seconds. */
export function timeRange(p: Pick<Place, 'start_time' | 'end_time'>): string {
  const t = (s: string | null | undefined) => (s ? s.slice(0, 5) : '')
  const a = t(p.start_time)
  const b = t(p.end_time)
  if (a && b) return `${a}–${b}`
  if (a) return a
  if (b) return `–${b}`
  return ''
}

/** Sort key: timed visits first (by start), untimed last. */
export const timeKey = (p: Pick<Place, 'start_time'>) => p.start_time ?? '~'
