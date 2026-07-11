import { useCallback, useEffect, useMemo, useState } from 'react'
import { createStore } from './data/store'
import { supabase } from './supabaseClient'
import {
  EMPTY_TRIP_DATA,
  type Leg, type Place, type Stay, type Trip, type TripData,
} from './types'
import { daysBetween, fmtShort } from './lib/dates'
import { Calendar } from './components/Calendar'
import { DayPanel } from './components/DayPanel'
import { LegForm, LoginForm, Modal, PlaceForm, StayForm, TripForm } from './components/Forms'

type ModalState =
  | { type: 'trip'; trip?: Trip }
  | { type: 'stay'; stay?: Stay; defaultDate?: string }
  | { type: 'leg'; leg?: Leg; defaultDate?: string }
  | { type: 'place'; place?: Place; defaultStayId?: string | null }
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isEditor, setIsEditor] = useState(false)
  const [wantEdit, setWantEdit] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [offline, setOffline] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const trip = trips?.find(t => t.id === tripId) ?? null

  const refreshTrips = useCallback(async () => {
    try {
      const list = await store.listTrips()
      setTrips(list)
      setOffline(store.offline)
      setLoadError(null)
      setTripId(prev => (prev && list.some(t => t.id === prev)) ? prev : (list[0]?.id ?? null))
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

  useEffect(() => { void refreshTrips() }, [refreshTrips])
  useEffect(() => { void refreshData() }, [refreshData])

  // Pick up edits made on another device when returning to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') { void refreshTrips(); void refreshData() }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshTrips, refreshData])

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
      setModal(null)
    } catch (e) {
      alert('Could not save: ' + errMsg(e))
    }
  }

  function deleteTrip(t: Trip) {
    if (!confirm(`Delete the whole trip “${t.name}”?\nThis removes all of its stays, travel days and places.`)) return
    void persist(() => store.deleteTrip(t.id), { trips: true })
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

  function renderModal() {
    if (!modal) return null
    switch (modal.type) {
      case 'trip':
        return (
          <Modal title={modal.trip ? '✏️ Edit trip' : '🧳 New trip'} onClose={() => setModal(null)}>
            <TripForm
              initial={modal.trip}
              onSave={v => {
                const t: Trip = { id: modal.trip?.id ?? uid(), ...v }
                void persist(async () => { await store.saveTrip(t); setTripId(t.id) }, { trips: true })
              }}
              onDelete={modal.trip ? () => deleteTrip(modal.trip!) : undefined}
            />
          </Modal>
        )
      case 'stay':
        return (
          <Modal title={modal.stay ? '✏️ Edit stay' : '🏡 New stay'} onClose={() => setModal(null)}>
            <StayForm
              initial={modal.stay}
              defaultDate={modal.defaultDate}
              onSave={v => {
                const s: Stay = { id: modal.stay?.id ?? uid(), trip_id: trip!.id, ...v }
                void persist(() => store.saveStay(s))
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
              defaultStayId={modal.defaultStayId}
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

  const totalDays = trip ? daysBetween(trip.start_date, trip.end_date) + 1 : 0

  return (
    <div className="app">
      <header className="header card">
        <div className="brand">
          <span className="brand-emoji">{trip?.emoji || '🧳'}</span>
          <div>
            <h1>{trip?.name ?? 'Travel Planner'}</h1>
            {trip && (
              <p className="sub">
                {fmtShort(trip.start_date)} – {fmtShort(trip.end_date)} · {totalDays} days
              </p>
            )}
          </div>
        </div>
        <div className="actions">
          {trips && trips.length > 1 && (
            <select
              className="trip-select"
              value={tripId ?? ''}
              onChange={e => { setTripId(e.target.value); setSelectedDate(null) }}
              title="Switch trip"
            >
              {trips.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
          )}
          {editMode && trip && (
            <button className="btn ghost" onClick={() => setModal({ type: 'trip', trip })}>✏️ Trip</button>
          )}
          {editMode && (
            <button className="btn ghost" onClick={() => setModal({ type: 'trip' })}>＋ New trip</button>
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
            selectedDate={selectedDate}
            onSelect={iso => setSelectedDate(cur => (cur === iso ? null : iso))}
          />
          <DayPanel
            trip={trip}
            data={data}
            selectedDate={selectedDate}
            editMode={editMode}
            onSelectDate={setSelectedDate}
            onEditStay={(stay, defaultDate) => setModal({ type: 'stay', stay, defaultDate })}
            onEditLeg={(leg, defaultDate) => setModal({ type: 'leg', leg, defaultDate })}
            onEditPlace={(place, defaultStayId) => setModal({ type: 'place', place, defaultStayId })}
            onDeleteStay={deleteStay}
            onDeleteLeg={deleteLeg}
            onDeletePlace={deletePlace}
          />
        </main>
      ) : trips === null ? (
        <div className="empty card">Loading…</div>
      ) : (
        <div className="empty card">
          <p className="empty-emoji">🗺️</p>
          <p>No trips yet — time to dream one up!</p>
          {editMode ? (
            <button className="btn primary" onClick={() => setModal({ type: 'trip' })}>＋ Create a trip</button>
          ) : (
            <button className="btn primary" onClick={onEditClick}>🖊️ Sign in to start planning</button>
          )}
        </div>
      )}

      <footer className="footer">made with 💛 for our adventures</footer>

      {renderModal()}
    </div>
  )
}
