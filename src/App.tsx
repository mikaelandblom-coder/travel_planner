import { useCallback, useEffect, useMemo, useState } from 'react'
import { createStore } from './data/store'
import { supabase } from './supabaseClient'
import {
  EMPTY_TRIP_DATA, STAY_COLORS,
  type City, type Leg, type Place, type Stay, type Todo, type Trip, type TripData,
} from './types'
import { daysBetween, fmtShort } from './lib/dates'
import { Calendar, CityChips } from './components/Calendar'
import { DayModal, Overview } from './components/DayPanel'
import { CityForm, LegForm, LoginForm, Modal, PlaceForm, StayForm, TripForm } from './components/Forms'
import { TripList } from './components/TripList'

type ModalState =
  | { type: 'trip'; trip?: Trip }
  | { type: 'city'; city?: City }
  | { type: 'stay'; stay?: Stay; defaultDate?: string }
  | { type: 'leg'; leg?: Leg; defaultDate?: string }
  | { type: 'place'; place?: Place; defaultStayId?: string | null; defaultDate?: string | null; defaultLeftover?: boolean }
  | { type: 'login' }

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message
    : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message)
    : String(e)

const uid = () => crypto.randomUUID()

export default function App() {
  const store = useMemo(() => createStore(), [])
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [tripId, setTripId] = useState<string | null>(null)
  const [data, setData] = useState<TripData>(EMPTY_TRIP_DATA)
  const [leftovers, setLeftovers] = useState<Place[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isEditor, setIsEditor] = useState(false)
  const [wantEdit, setWantEdit] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [offline, setOffline] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // The planner's width while a calendar column is being dragged.
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)

  const trip = trips?.find(t => t.id === tripId) ?? null

  const refreshTrips = useCallback(async () => {
    try {
      const list = await store.listTrips()
      setTrips(list)
      setOffline(store.offline)
      setLoadError(null)
      // No auto-open: the start page is the trip picker.
      setTripId(prev => (prev && list.some(t => t.id === prev)) ? prev : null)
    } catch (e) {
      setTrips([])
      setLoadError(errMsg(e))
    }
  }, [store])

  const refreshData = useCallback(async () => {
    if (!tripId) { setData(EMPTY_TRIP_DATA); return }
    try {
      setData(await store.loadTrip(tripId))
      setOffline(store.offline)
    } catch (e) {
      setLoadError(errMsg(e))
    }
  }, [store, tripId])

  // Every trip's "next time" list, so this trip can pick ideas up from the
  // earlier ones. Never fatal: without it you just don't get the suggestions.
  const refreshLeftovers = useCallback(async () => {
    try { setLeftovers(await store.listLeftovers()) } catch { setLeftovers([]) }
  }, [store])

  // The shared city list stays pick from. Never fatal either: stays then
  // just offer the cities they already use.
  const refreshCities = useCallback(async () => {
    try { setCities(await store.listCities()) } catch { setCities([]) }
  }, [store])

  useEffect(() => { void refreshTrips() }, [refreshTrips])
  useEffect(() => { void refreshData() }, [refreshData])
  useEffect(() => { void refreshLeftovers() }, [refreshLeftovers])
  useEffect(() => { void refreshCities() }, [refreshCities])

  // Pick up edits made on another device when returning to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshTrips(); void refreshData(); void refreshLeftovers(); void refreshCities()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshTrips, refreshData, refreshLeftovers, refreshCities])

  // Auth (cloud mode only).
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !userEmail) { setIsEditor(false); return }
    supabase.from('editors').select('email').eq('email', userEmail).maybeSingle()
      .then(({ data }) => setIsEditor(Boolean(data)))
  }, [userEmail])

  // After a login that was started via the Edit button, continue into edit mode.
  useEffect(() => {
    if (!wantEdit || !userEmail) return
    setModal(m => (m?.type === 'login' ? null : m))
    if (isEditor) { setEditMode(true); setWantEdit(false) }
  }, [wantEdit, userEmail, isEditor])

  function openTrip(t: Trip) {
    setTripId(t.id)
    setSelectedDate(null)
  }

  function closeTrip() {
    setTripId(null)
    setSelectedDate(null)
  }

  function onEditClick() {
    if (editMode) { setEditMode(false); return }
    if (store.mode === 'demo') { setEditMode(true); return }
    if (!userEmail) { setWantEdit(true); setModal({ type: 'login' }); return }
    if (!isEditor) {
      alert(`${userEmail} does not have edit access.\nAdd this email to the "editors" table in Supabase (see SETUP.md).`)
      return
    }
    setEditMode(true)
  }

  async function persist(action: () => Promise<void>, opts: { trips?: boolean } = {}) {
    try {
      await action()
      if (opts.trips) await refreshTrips()
      await refreshData()
      await refreshLeftovers()
      await refreshCities()
      setModal(null)
    } catch (e) {
      alert('Could not save: ' + errMsg(e))
    }
  }

  function deleteTrip(t: Trip) {
    if (!confirm(`Delete the whole trip “${t.name}”?\nThis removes all of its stays, travel days and places.`)) return
    void persist(() => store.deleteTrip(t.id), { trips: true })
  }
  function deleteCity(c: City) {
    if (!confirm(`Remove ${c.name} from the city list?\nStays already in ${c.name} keep it.`)) return
    void persist(() => store.deleteCity(c.id))
  }
  function deleteStay(s: Stay) {
    if (!confirm(`Remove the stay in ${s.location_name}? Its places become general ideas.`)) return
    void persist(() => store.deleteStay(s.id))
  }
  function deleteLeg(l: Leg) {
    if (!confirm(`Remove travel ${l.from_name} → ${l.to_name}?`)) return
    void persist(() => store.deleteLeg(l.id))
  }
  function deletePlace(p: Place) {
    if (!confirm(`Remove “${p.name}”?`)) return
    void persist(() => store.deletePlace(p.id))
  }

  /**
   * Move a place on / off this trip's "next time" list. Something saved for
   * next time isn't happening on this trip, so it gives up its day and times.
   */
  function toggleLeftover(p: Place) {
    const next: Place = p.leftover
      ? { ...p, leftover: false }
      : { ...p, leftover: true, date: null, start_time: null, end_time: null }
    void persist(() => store.savePlace(next))
  }

  function saveTodo(t: Todo) {
    void persist(() => store.saveTodo(t))
  }
  function addTodo(text: string) {
    if (!trip) return
    saveTodo({ id: uid(), trip_id: trip.id, text, notes: '', done: false })
  }
  function deleteTodo(t: Todo) {
    if (!confirm(`Remove “${t.text}” from the to-do list?`)) return
    void persist(() => store.deleteTodo(t.id))
  }

  /** A backup idea that is really a chore (“book tickets”) becomes a to-do. */
  function placeToTodo(p: Place) {
    const todo: Todo = { id: uid(), trip_id: p.trip_id, text: p.name, notes: p.notes, done: false }
    void persist(async () => {
      await store.saveTodo(todo)
      await store.deletePlace(p.id)
    })
  }

  /** Make the planner exactly as wide as this window (columns keep their proportions). */
  function fitToScreen() {
    if (!trip) return
    const page_width = document.documentElement.clientWidth
    void persist(() => store.saveTrip({ ...trip, page_width }), { trips: true })
  }

  /** Tick a day as fully planned (or un-tick it). */
  function togglePlanned(date: string) {
    if (!trip) return
    const planned_days = trip.planned_days.includes(date)
      ? trip.planned_days.filter(d => d !== date)
      : [...trip.planned_days, date].sort()
    void persist(() => store.saveTrip({ ...trip, planned_days }), { trips: true })
  }

  /**
   * Hand-set column widths for one month (null = back to automatic) and the
   * planner width they need (null = standard, undefined = leave as is).
   */
  function saveColWidths(month: string, widths: number[] | null, pageWidth?: number | null) {
    if (!trip) return
    const col_widths = { ...trip.col_widths }
    if (widths) col_widths[month] = widths
    else delete col_widths[month]
    const page_width = pageWidth === undefined ? trip.page_width : pageWidth
    // Keep the dragged width showing until the saved trip comes back.
    void persist(() => store.saveTrip({ ...trip, col_widths, page_width }), { trips: true })
      .then(() => setPreviewWidth(null))
  }

  /**
   * Bring an older trip's leftover along on this one: it becomes a fresh
   * backup idea here, and drops off that trip's next-time list — it found
   * its next time.
   */
  function carryOver(p: Place) {
    if (!trip) return
    const copy: Place = {
      ...p,
      id: uid(),
      trip_id: trip.id,
      // The old trip's stays mean nothing here — join this trip's first
      // stay in the same city instead.
      stay_id: [...data.stays]
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .find(s => s.location_name === p.city)?.id ?? null,
      date: null,
      start_time: null,
      end_time: null,
      leftover: false,
    }
    void persist(async () => {
      await store.savePlace(copy)
      await store.savePlace({ ...p, leftover: false })
    })
  }

  /**
   * Assign a day to a stay (keeps days and stays in sync). Adjacent days
   * stretch the stay; if the itinerary shows you leave in between (other
   * stays or travel days), offer a separate return visit instead so the
   * stay never bridges a period spent elsewhere.
   */
  function assignStayToDay(s: Stay, date: string) {
    const [lo, hi] = date < s.start_date ? [date, s.start_date] : [s.end_date, date]
    const gap = daysBetween(lo, hi)
    const awayBetween =
      data.stays.some(o => o.id !== s.id && o.start_date < hi && o.end_date > lo) ||
      data.legs.some(l => lo <= l.date && l.date <= hi)

    if (gap > 1 && awayBetween) {
      if (!confirm(
        `${s.location_name} is ${fmtShort(s.start_date)} – ${fmtShort(s.end_date)} and you have other plans in between.\nAdd a separate ${s.location_name} visit on ${fmtShort(date)}?`,
      )) return
      const revisit: Stay = { ...s, id: uid(), start_date: date, end_date: date }
      void persist(() => store.saveStay(revisit))
      return
    }

    if (gap > 1 && !confirm(
      `${s.location_name} currently runs ${fmtShort(s.start_date)} – ${fmtShort(s.end_date)}.\nExtend it to cover ${fmtShort(date)}?`,
    )) return
    const extended: Stay = {
      ...s,
      start_date: date < s.start_date ? date : s.start_date,
      end_date: date > s.end_date ? date : s.end_date,
    }
    void persist(() => store.saveStay(extended))
  }

  function renderModal() {
    if (!modal) return null
    switch (modal.type) {
      case 'trip':
        return (
          <Modal title={modal.trip ? '✏️ Edit trip' : '🧳 New trip'} onClose={() => setModal(null)}>
            <TripForm
              initial={modal.trip}
              onSave={v => {
                const t: Trip = {
                  id: modal.trip?.id ?? uid(),
                  planned_days: modal.trip?.planned_days ?? [],
                  col_widths: modal.trip?.col_widths ?? {},
                  page_width: modal.trip?.page_width ?? null,
                  ...v,
                }
                void persist(async () => { await store.saveTrip(t); openTrip(t) }, { trips: true })
              }}
              onDelete={modal.trip ? () => deleteTrip(modal.trip!) : undefined}
            />
          </Modal>
        )
      case 'city':
        return (
          <Modal title={modal.city ? '✏️ Edit city' : '🏙️ New city'} onClose={() => setModal(null)}>
            <CityForm
              initial={modal.city}
              cities={cities}
              onSave={v => {
                const c: City = { id: modal.city?.id ?? uid(), ...v }
                void persist(() => store.saveCity(c, modal.city))
              }}
              onDelete={modal.city ? () => deleteCity(modal.city!) : undefined}
            />
          </Modal>
        )
      case 'stay':
        return (
          <Modal title={modal.stay ? '✏️ Edit stay' : '🏡 New stay'} onClose={() => setModal(null)}>
            <StayForm
              initial={modal.stay}
              defaultDate={modal.defaultDate}
              cities={cities}
              onSave={v => {
                const s: Stay = { id: modal.stay?.id ?? uid(), trip_id: trip!.id, ...v }
                // A city typed in here joins the shared list too.
                const isNew = !cities.some(c => c.name === s.location_name)
                void persist(async () => {
                  if (isNew) await store.saveCity({ id: uid(), name: s.location_name, color: s.color })
                  await store.saveStay(s)
                })
              }}
              onDelete={modal.stay ? () => deleteStay(modal.stay!) : undefined}
            />
          </Modal>
        )
      case 'leg':
        return (
          <Modal title={modal.leg ? '✏️ Edit travel day' : '✈️ New travel day'} onClose={() => setModal(null)}>
            <LegForm
              initial={modal.leg}
              defaultDate={modal.defaultDate}
              cities={cities}
              onSave={v => {
                const l: Leg = { id: modal.leg?.id ?? uid(), trip_id: trip!.id, ...v }
                void persist(() => store.saveLeg(l))
              }}
              onDelete={modal.leg ? () => deleteLeg(modal.leg!) : undefined}
            />
          </Modal>
        )
      case 'place':
        return (
          <Modal title={modal.place ? '✏️ Edit place' : '📍 New place'} onClose={() => setModal(null)}>
            <PlaceForm
              initial={modal.place}
              stays={data.stays}
              cities={cities}
              defaultStayId={modal.defaultStayId}
              defaultDate={modal.defaultDate}
              defaultLeftover={modal.defaultLeftover}
              onSave={v => {
                const p: Place = { id: modal.place?.id ?? uid(), trip_id: trip!.id, ...v }
                void persist(() => store.savePlace(p))
              }}
              onDelete={modal.place ? () => deletePlace(modal.place!) : undefined}
            />
          </Modal>
        )
      case 'login':
        return (
          <Modal title="💌 Sign in" onClose={() => { setModal(null); setWantEdit(false) }}>
            <LoginForm />
          </Modal>
        )
    }
  }

  // A trip can ask for a wider (or narrower) planner than the standard one.
  const pageWidth = trip ? previewWidth ?? trip.page_width : null

  const totalDays = trip ? daysBetween(trip.start_date, trip.end_date) + 1 : 0
  const tripCities = new Set(data.stays.map(s => s.location_name))

  return (
    <div
      className={'app' + (pageWidth ? ' wide' : '')}
      // An exact width, even wider than the window (the page scrolls sideways).
      style={pageWidth ? { width: pageWidth, maxWidth: 'none' } : undefined}
    >
      <header className="header card">
        <div className="brand">
          <span className="brand-emoji">{trip?.emoji || '🧳'}</span>
          <div>
            <h1>{trip?.name ?? 'Travel Planner'}</h1>
            {trip ? (
              <p className="sub">
                {fmtShort(trip.start_date)} – {fmtShort(trip.end_date)} · {totalDays} days
              </p>
            ) : trips && trips.length > 0 ? (
              <p className="sub">{trips.length} {trips.length === 1 ? 'plan' : 'plans'}</p>
            ) : null}
            {trip && (
              <CityChips stays={data.stays} selectedDate={selectedDate} onSelect={setSelectedDate} />
            )}
          </div>
        </div>
        <div className="actions">
          {trip && (
            <button className="btn ghost" onClick={closeTrip} title="Back to all trips">← All trips</button>
          )}
          {editMode && trip && (
            <button className="btn ghost" onClick={() => setModal({ type: 'trip', trip })}>✏️ Trip</button>
          )}
          {editMode && trip && (
            <button className="btn ghost" title="Make the planner as wide as this window" onClick={fitToScreen}>
              ↔️ Fit screen
            </button>
          )}
          <button className={'btn' + (editMode ? ' primary' : '')} onClick={onEditClick}>
            {editMode ? '✓ Done' : '🖊️ Edit'}
          </button>
          {userEmail && (
            <button
              className="btn ghost"
              title={`Signed in as ${userEmail} — click to sign out`}
              onClick={() => void supabase?.auth.signOut()}
            >👋</button>
          )}
        </div>
      </header>

      {store.mode === 'demo' && (
        <div className="banner">
          🌱 Demo mode — changes are saved in this browser only. Connect Supabase to sync between devices (see SETUP.md).
        </div>
      )}
      {offline && <div className="banner">📡 Offline — showing the last saved copy.</div>}
      {loadError && <div className="banner error">😿 Could not load data: {loadError}</div>}

      {trip ? (
        <main className="layout">
          <Calendar
            trip={trip}
            stays={data.stays}
            legs={data.legs}
            places={data.places}
            selectedDate={selectedDate}
            editMode={editMode}
            onSelect={setSelectedDate}
            onSaveColWidths={saveColWidths}
            onPreviewPageWidth={setPreviewWidth}
          />
          <Overview
            trip={trip}
            data={data}
            trips={trips ?? []}
            // Only ideas for cities this trip actually goes to.
            pastLeftovers={leftovers.filter(p => p.trip_id !== trip.id && tripCities.has(p.city))}
            editMode={editMode}
            onSelectDate={setSelectedDate}
            onEditStay={(stay, defaultDate) => setModal({ type: 'stay', stay, defaultDate })}
            onEditLeg={(leg, defaultDate) => setModal({ type: 'leg', leg, defaultDate })}
            onEditPlace={(place, defaultStayId, defaultDate, defaultLeftover) =>
              setModal({ type: 'place', place, defaultStayId, defaultDate, defaultLeftover })}
            onAssignStay={assignStayToDay}
            onDeleteStay={deleteStay}
            onDeleteLeg={deleteLeg}
            onDeletePlace={deletePlace}
            onToggleLeftover={toggleLeftover}
            onCarryOver={carryOver}
            onAddTodo={addTodo}
            onSaveTodo={saveTodo}
            onDeleteTodo={deleteTodo}
            onPlaceToTodo={placeToTodo}
          />
        </main>
      ) : trips === null ? (
        <div className="empty card">Loading…</div>
      ) : (
        <TripList
          trips={trips}
          cities={cities}
          editMode={editMode}
          onOpen={openTrip}
          onEditCity={city => setModal({ type: 'city', city })}
          onEdit={t => setModal({ type: 'trip', trip: t })}
          onNew={() => setModal({ type: 'trip' })}
          onSignIn={onEditClick}
        />
      )}

      <footer className="footer">made with 💛 for our adventures</footer>

      {trip && selectedDate && !modal && (
        <DayModal
          trip={trip}
          data={data}
          date={selectedDate}
          editMode={editMode}
          onSelectDate={setSelectedDate}
          onEditStay={(stay, defaultDate) => setModal({ type: 'stay', stay, defaultDate })}
          onEditLeg={(leg, defaultDate) => setModal({ type: 'leg', leg, defaultDate })}
          onEditPlace={(place, defaultStayId, defaultDate) => setModal({ type: 'place', place, defaultStayId, defaultDate })}
          onAssignStay={assignStayToDay}
          onDeleteStay={deleteStay}
          onDeleteLeg={deleteLeg}
          onDeletePlace={deletePlace}
          onToggleLeftover={toggleLeftover}
          onTogglePlanned={togglePlanned}
        />
      )}
      {renderModal()}
    </div>
  )
}
