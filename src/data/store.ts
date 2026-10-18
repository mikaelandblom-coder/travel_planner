import { supabase, cloudEnabled } from '../supabaseClient'
import type { City, Leg, Place, Stay, Todo, Trip, TripData } from '../types'
import { citiesFromStays, seedData, type DB } from './demo'

export interface Store {
  mode: 'demo' | 'cloud'
  /** true when the last load came from the local cache (no connection) */
  offline: boolean
  listTrips(): Promise<Trip[]>
  loadTrip(tripId: string): Promise<TripData>
  /**
   * Every place flagged "next time", across all trips. `city` is filled in
   * from the place's stay when it has one.
   */
  listLeftovers(): Promise<Place[]>
  /** The shared city list, by name. */
  listCities(): Promise<City[]>
  /**
   * Save a city. Renaming or recolouring one (`prev` = how it was) carries
   * the change to every stay and place that uses it.
   */
  saveCity(c: City, prev?: City): Promise<void>
  /** Off the list only — stays already in that city keep it. */
  deleteCity(id: string): Promise<void>
  saveTrip(t: Trip): Promise<void>
  deleteTrip(id: string): Promise<void>
  saveStay(s: Stay): Promise<void>
  deleteStay(id: string): Promise<void>
  saveLeg(l: Leg): Promise<void>
  deleteLeg(id: string): Promise<void>
  savePlace(p: Place): Promise<void>
  deletePlace(id: string): Promise<void>
  saveTodo(t: Todo): Promise<void>
  deleteTodo(id: string): Promise<void>
}

/** Rows saved before a column existed (or cached then) get its default. */
const withTripDefaults = (t: Trip): Trip => ({ ...t, planned_days: t.planned_days ?? [], col_widths: t.col_widths ?? {} })
const withLegDefaults = (l: Leg): Leg => ({ ...l, depart_time: l.depart_time ?? null, arrive_time: l.arrive_time ?? null })

export function createStore(): Store {
  return cloudEnabled ? createCloudStore() : createDemoStore()
}

// ---------- demo: everything lives in localStorage ----------

const DEMO_KEY = 'travel-planner-demo'

function createDemoStore(): Store {
  const load = (): DB => {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      try {
        const db = JSON.parse(raw) as DB
        // Saved before the city list existed: start it from the stays.
        db.cities ??= citiesFromStays(db.stays)
        db.places = db.places.map(p => ({ ...p, city: p.city ?? '' }))
        db.trips = db.trips.map(withTripDefaults)
        db.legs = db.legs.map(withLegDefaults)
        db.todos ??= []
        return db
      } catch { /* re-seed below */ }
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
        todos: db.todos.filter(t => t.trip_id === tripId),
      })
    },
    listLeftovers: () => {
      const db = load()
      return Promise.resolve(db.places
        .filter(p => p.leftover)
        .map(p => ({ ...p, city: db.stays.find(s => s.id === p.stay_id)?.location_name ?? p.city }))
        .sort((a, b) => a.name.localeCompare(b.name)))
    },
    listCities: () => Promise.resolve(
      [...load().cities].sort((a, b) => a.name.localeCompare(b.name)),
    ),
    saveCity: (c, prev) => mutate(db => {
      put(db.cities, c)
      if (!prev) return
      db.stays = db.stays.map(s => s.location_name === prev.name ? { ...s, location_name: c.name, color: c.color } : s)
      db.places = db.places.map(p => p.city === prev.name ? { ...p, city: c.name } : p)
    }),
    deleteCity: (id) => mutate(db => { db.cities = db.cities.filter(c => c.id !== id) }),
    saveTrip: (t) => mutate(db => put(db.trips, t)),
    deleteTrip: (id) => mutate(db => {
      db.trips = db.trips.filter(t => t.id !== id)
      db.stays = db.stays.filter(s => s.trip_id !== id)
      db.legs = db.legs.filter(l => l.trip_id !== id)
      db.places = db.places.filter(p => p.trip_id !== id)
      db.todos = db.todos.filter(t => t.trip_id !== id)
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
    saveTodo: (t) => mutate(db => put(db.todos, t)),
    deleteTodo: (id) => mutate(db => { db.todos = db.todos.filter(t => t.id !== id) }),
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
        return (data as Trip[]).map(withTripDefaults)
      } catch (e) {
        const cached = cacheGet<Trip[]>('trips')
        if (cached) { store.offline = true; return cached.map(withTripDefaults) }
        throw e
      }
    },

    async loadTrip(tripId) {
      try {
        const [stays, legs, places, todos] = await Promise.all([
          sb.from('stays').select('*').eq('trip_id', tripId).order('start_date'),
          sb.from('legs').select('*').eq('trip_id', tripId).order('date'),
          sb.from('places').select('*').eq('trip_id', tripId).order('name'),
          sb.from('todos').select('*').eq('trip_id', tripId).order('created_at'),
        ])
        for (const r of [stays, legs, places]) if (r.error) throw r.error
        const data: TripData = {
          stays: stays.data as Stay[],
          legs: (legs.data as Leg[]).map(withLegDefaults),
          places: places.data as Place[],
          // Not fatal: before the to-do migration has run there's no table.
          todos: todos.error ? [] : todos.data as Todo[],
        }
        store.offline = false
        cachePut('trip:' + tripId, data)
        return data
      } catch (e) {
        const cached = cacheGet<TripData>('trip:' + tripId)
        if (cached) {
          store.offline = true
          return { ...cached, legs: cached.legs.map(withLegDefaults), todos: cached.todos ?? [] }
        }
        throw e
      }
    },

    async listLeftovers() {
      try {
        const { data, error } = await sb.from('places')
          .select('*, stay:stays(location_name)').eq('leftover', true).order('name')
        if (error) throw error
        type Row = Place & { stay: { location_name: string } | null }
        const places = (data as Row[]).map(({ stay, ...p }) => ({ ...p, city: stay?.location_name ?? p.city }))
        store.offline = false
        cachePut('leftovers', places)
        return places
      } catch (e) {
        const cached = cacheGet<Place[]>('leftovers')
        if (cached) { store.offline = true; return cached }
        throw e
      }
    },

    async listCities() {
      try {
        const { data, error } = await sb.from('cities').select('id, name, color').order('name')
        if (error) throw error
        store.offline = false
        cachePut('cities', data)
        return data as City[]
      } catch (e) {
        const cached = cacheGet<City[]>('cities')
        if (cached) { store.offline = true; return cached }
        throw e
      }
    },

    async saveCity(c, prev) {
      const { error } = await sb.from('cities').upsert(c)
      if (error) throw error
      if (!prev) return
      const [stays, places] = await Promise.all([
        sb.from('stays').update({ location_name: c.name, color: c.color }).eq('location_name', prev.name),
        sb.from('places').update({ city: c.name }).eq('city', prev.name),
      ])
      for (const r of [stays, places]) if (r.error) throw r.error
    },
    async deleteCity(id) {
      const { error } = await sb.from('cities').delete().eq('id', id)
      if (error) throw error
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
    async saveTodo(t) {
      const { error } = await sb.from('todos').upsert(t)
      if (error) throw error
    },
    async deleteTodo(id) {
      const { error } = await sb.from('todos').delete().eq('id', id)
      if (error) throw error
    },
  }

  return store
}
