import type { Leg, Place, Stay, Trip } from '../types'
import { STAY_COLORS } from '../types'

export type DB = { trips: Trip[]; stays: Stay[]; legs: Leg[]; places: Place[] }

// Sample itinerary so the app has something lovely to show before
// Supabase is connected. Everything is editable / deletable.
export function seedData(): DB {
  const uid = () => crypto.randomUUID()
  const tripId = uid()

  const trip: Trip = {
    id: tripId,
    name: 'Vietnam & Japan',
    emoji: '🌏',
    start_date: '2026-11-12',
    end_date: '2026-12-20',
  }

  const mkStay = (
    location_name: string, start_date: string, end_date: string,
    color: string, map_url = '', notes = '',
  ): Stay => ({ id: uid(), trip_id: tripId, location_name, start_date, end_date, color, map_url, notes })

  const stays: Stay[] = [
    mkStay('Hanoi', '2026-11-13', '2026-11-17', STAY_COLORS[0],
      'https://maps.google.com/?q=Hanoi+Old+Quarter', 'Stay in the Old Quarter'),
    mkStay('Ha Long Bay', '2026-11-17', '2026-11-19', STAY_COLORS[1],
      'https://maps.google.com/?q=Ha+Long+Bay', 'Overnight cruise?'),
    mkStay('Hoi An', '2026-11-19', '2026-11-24', STAY_COLORS[4],
      'https://maps.google.com/?q=Hoi+An+Ancient+Town', 'Lantern town 🏮 tailor shops'),
    mkStay('Ho Chi Minh City', '2026-11-24', '2026-11-28', STAY_COLORS[5],
      'https://maps.google.com/?q=Ho+Chi+Minh+City+District+1'),
    mkStay('Tokyo', '2026-11-28', '2026-12-04', STAY_COLORS[2],
      'https://maps.google.com/?q=Shibuya+Tokyo'),
    mkStay('Hakone', '2026-12-04', '2026-12-06', STAY_COLORS[6],
      'https://maps.google.com/?q=Hakone', 'Onsen ryokan night ♨️'),
    mkStay('Kyoto', '2026-12-06', '2026-12-11', STAY_COLORS[3],
      'https://maps.google.com/?q=Kyoto'),
    mkStay('Osaka', '2026-12-11', '2026-12-15', STAY_COLORS[7],
      'https://maps.google.com/?q=Osaka+Namba'),
    mkStay('Tokyo', '2026-12-15', '2026-12-20', STAY_COLORS[2],
      'https://maps.google.com/?q=Tokyo+Station'),
  ]

  const mkLeg = (
    date: string, from_name: string, to_name: string,
    mode: Leg['mode'], notes = '', arrive_date: string | null = null,
  ): Leg => ({ id: uid(), trip_id: tripId, date, arrive_date, from_name, to_name, mode, notes })

  const legs: Leg[] = [
    mkLeg('2026-11-12', 'Home', 'Hanoi', 'flight', 'Overnight flight', '2026-11-13'),
    mkLeg('2026-11-17', 'Hanoi', 'Ha Long Bay', 'bus', '~2.5 h shuttle'),
    mkLeg('2026-11-19', 'Ha Long Bay', 'Hoi An', 'flight', 'Via Da Nang'),
    mkLeg('2026-11-24', 'Hoi An', 'Ho Chi Minh City', 'flight'),
    mkLeg('2026-11-28', 'Ho Chi Minh City', 'Tokyo', 'flight'),
    mkLeg('2026-12-04', 'Tokyo', 'Hakone', 'train', 'Romancecar from Shinjuku'),
    mkLeg('2026-12-06', 'Hakone', 'Kyoto', 'train', 'Shinkansen from Odawara'),
    mkLeg('2026-12-11', 'Kyoto', 'Osaka', 'train'),
    mkLeg('2026-12-15', 'Osaka', 'Tokyo', 'train', 'Shinkansen'),
    mkLeg('2026-12-20', 'Tokyo', 'Home', 'flight'),
  ]

  const mkPlace = (
    stayIdx: number | null, name: string, category: string,
    map_url = '', notes = '',
  ): Place => ({
    id: uid(), trip_id: tripId,
    stay_id: stayIdx === null ? null : stays[stayIdx].id,
    name, category, map_url, notes,
  })

  const places: Place[] = [
    mkPlace(0, 'Hoan Kiem Lake', 'sight', 'https://maps.google.com/?q=Hoan+Kiem+Lake'),
    mkPlace(0, 'Bún chả Hương Liên', 'food', 'https://maps.google.com/?q=Bun+Cha+Huong+Lien+Hanoi', 'The Obama one'),
    mkPlace(2, 'An Bang Beach', 'nature', 'https://maps.google.com/?q=An+Bang+Beach'),
    mkPlace(4, 'teamLab Planets', 'sight', 'https://maps.google.com/?q=teamLab+Planets+Tokyo', 'Book ahead!'),
    mkPlace(6, 'Fushimi Inari', 'sight', 'https://maps.google.com/?q=Fushimi+Inari+Taisha', 'Go early morning'),
    mkPlace(null, 'Try a konbini egg sando', 'food', '', 'Any 7-Eleven 🥪'),
  ]

  return { trips: [trip], stays, legs, places }
}
