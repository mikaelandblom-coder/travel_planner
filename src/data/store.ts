import { supabase, cloudEnabled } from '../supabaseClient'
import type { Leg, Place, Stay, Trip, TripData } from '../types'
import { seedData, type DB } from './demo'

export interface Store {
  mode: 'demo' | 'cloud'
  /** true when the last load came from the local cache (no connection) */
  offline: boolean
  listTrips(): Promise<Trip[]>
  loadTrip(tripId: string): Promise<TripData>
  saveTrip(t: Trip): Promise<void>
  deleteTrip(id: string): Promise<void>
  saveStay(s: Stay): Promise<void>
  deleteStay(id: string): Promise<void>
  saveLeg(l: Leg): Promise<void>
  deleteLeg(id: string): Promise<void>
  savePlace(p: Place): Promise<void>
  deletePlace(id: string): Promise<void>
}

export function createStore(): Store {
  return cloudEnabled ? createCloudStore() : createDemoStore()
}

// ---------- demo: everything lives in localStorage ----------

const DEMO_KEY = 'travel-planner-demo'

function createDemoStore(): Store {
  const load = (): DB => {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      try { return JSON.parse(raw) as DB } catch { /* re-seed below */ }
    }
    const db = seedData()
    localStorage.setItem(DEMO_KEY, JSON.stringify(db))
    return db
  }
  const save = (db: DB) => localStorage.setItem(DEMO_KEY, JSON.stringify(db))

  const put = <T extends { id: string }>(arr: T[], item: T) => {
    const i = arr.findIndex(x => x.id === item.id)
    if (i >= 0) arr[i] = item
    else arr.push(item)
  }

  const mutate = (fn: (db: DB) => void): Promise<void> => {
    const db = load()
    fn(db)
    save(db)
    return Promise.resolve()
  }

  return {
    mode: 'demo',
    offline: false,
    listTrips: () => Promise.resolve(
      [...load().trips].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    ),
    loadTrip: (tripId) => {
      const db = load()
      return Promise.resolve({
        stays: db.stays.filter(s => s.trip_id === tripId),
        legs: db.legs.filter(l => l.trip_id === tripId),
        places: db.places.filter(p => p.trip_id === tripId),
      })
    },
    saveTrip: (t) => mutate(db => put(db.trips, t)),
    deleteTrip: (id) => mutate(db => {
      db.trips = db.trips.filter(t => t.id !== id)
      db.stays = db.stays.filter(s => s.trip_id !== id)
      db.legs = db.legs.filter(l => l.trip_id !== id)
      db.places = db.places.filter(p => p.trip_id !== id)
    }),
    saveStay: (s) => mutate(db => put(db.stays, s)),
    deleteStay: (id) => mutate(db => {
      db.stays = db.stays.filter(s => s.id !== id)
      db.places = db.places.map(p => p.stay_id === id ? { ...p, stay_id: null } : p)
    }),
    saveLeg: (l) => mutate(db => put(db.legs, l)),
    deleteLeg: (id) => mutate(db => { db.legs = db.legs.filter(l => l.id !== id) }),
    savePlace: (p) => mutate(db => put(db.places, p)),
    deletePlace: (id) => mutate(db => { db.places = db.places.filter(p => p.id !== id) }),
  }
}

// ---------- cloud: Supabase, with a local read-cache for offline viewing ----------

const CACHE_PREFIX = 'travel-planner-cache:'

function createCloudStore(): Store {
  const sb = supabase!

  const cachePut = (key: string, value: unknown) => {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)) } catch { /* full/blocked */ }
  }
  const cacheGet = <T>(key: string): T | null => {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }

  const store: Store = {
    mode: 'cloud',
    offline: false,

    async listTrips() {
      try {
        const { data, error } = await sb.from('trips').select('*').order('start_date')
        if (error) throw error
        store.offline = false
        cachePut('trips', data)
        return data as Trip[]
      } catch (e) {
        const cached = cacheGet<Trip[]>('trips')
        if (cached) { store.offline = true; return cached }
        throw e
      }
    },

    async loadTrip(tripId) {
      try {
        const [stays, legs, places] = await Promise.all([
          sb.from('stays').select('*').eq('trip_id', tripId).order('start_date'),
          sb.from('legs').select('*').eq('trip_id', tripId).order('date'),
          sb.from('places').select('*').eq('trip_id', tripId).order('name'),
        ])
        for (const r of [stays, legs, places]) if (r.error) throw r.error
        const data: TripData = {
          stays: stays.data as Stay[],
          legs: legs.data as Leg[],
          places: places.data as Place[],
        }
        store.offline = false
        cachePut('trip:' + tripId, data)
        return data
      } catch (e) {
        const cached = cacheGet<TripData>('trip:' + tripId)
        if (cached) { store.offline = true; return cached }
        throw e
      }
    },

    async saveTrip(t) {
      const { error } = await sb.from('trips').upsert(t)
      if (error) throw error
    },
    async deleteTrip(id) {
      const { error } = await sb.from('trips').delete().eq('id', id)
      if (error) throw error
    },
    async saveStay(s) {
      const { error } = await sb.from('stays').upsert(s)
      if (error) throw error
    },
    async deleteStay(id) {
      const { error } = await sb.from('stays').delete().eq('id', id)
      if (error) throw error
    },
    async saveLeg(l) {
      const { error } = await sb.from('legs').upsert(l)
      if (error) throw error
    },
    async deleteLeg(id) {
      const { error } = await sb.from('legs').delete().eq('id', id)
      if (error) throw error
    },
    async savePlace(p) {
      const { error } = await sb.from('places').upsert(p)
      if (error) throw error
    },
    async deletePlace(id) {
      const { error } = await sb.from('places').delete().eq('id', id)
      if (error) throw error
    },
  }

  return store
}
