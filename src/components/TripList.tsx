import type { Trip } from '../types'
import { daysBetween, fmtShort, todayISO } from '../lib/dates'

/** Upcoming and ongoing trips first (soonest first), finished ones last (most recent first). */
function sortTrips(trips: Trip[], today: string): Trip[] {
  const past = (t: Trip) => t.end_date < today
  return [...trips].sort((a, b) => {
    if (past(a) !== past(b)) return past(a) ? 1 : -1
    return past(a)
      ? b.start_date.localeCompare(a.start_date)
      : a.start_date.localeCompare(b.start_date)
  })
}

/** Friendly one-liner: 'in 51 days' / 'day 3 of 12' / 'finished'. */
function status(trip: Trip, today: string): { text: string; tone: 'soon' | 'now' | 'past' } {
  const total = daysBetween(trip.start_date, trip.end_date) + 1
  if (today < trip.start_date) {
    const left = daysBetween(today, trip.start_date)
    if (left === 1) return { text: '✨ tomorrow!', tone: 'now' }
    return { text: `⏳ in ${left} days`, tone: 'soon' }
  }
  if (today <= trip.end_date) {
    return { text: `🌞 day ${daysBetween(trip.start_date, today) + 1} of ${total}`, tone: 'now' }
  }
  return { text: '📮 finished', tone: 'past' }
}

export function TripList({ trips, editMode, onOpen, onEdit, onNew, onSignIn }: {
  trips: Trip[]
  editMode: boolean
  onOpen: (trip: Trip) => void
  onEdit: (trip: Trip) => void
  onNew: () => void
  onSignIn: () => void
}) {
  const today = todayISO()

  if (trips.length === 0) {
    return (
      <div className="empty card">
        <p className="empty-emoji">🗺️</p>
        <p>No trips yet — time to dream one up!</p>
        {editMode ? (
          <button className="btn primary" onClick={onNew}>＋ Create a trip</button>
        ) : (
          <button className="btn primary" onClick={onSignIn}>🖊️ Sign in to start planning</button>
        )}
      </div>
    )
  }

  return (
    <section className="trip-picker">
      <p className="hint trip-picker-hint">Pick a plan to open it 🌸</p>
      <div className="trips">
        {sortTrips(trips, today).map(t => {
          const s = status(t, today)
          const total = daysBetween(t.start_date, t.end_date) + 1
          return (
            <div key={t.id} className={'trip-card card tone-' + s.tone}>
              <button className="trip-card-open" onClick={() => onOpen(t)}>
                <span className="trip-card-emoji">{t.emoji || '🧳'}</span>
                <span className="trip-card-main">
                  <span className="trip-card-name">{t.name}</span>
                  <span className="row-sub">
                    {fmtShort(t.start_date)} – {fmtShort(t.end_date)} · {total} days
                  </span>
                  <span className="trip-card-status">{s.text}</span>
                </span>
              </button>
              {editMode && (
                <button
                  className="icon-btn trip-card-edit"
                  title="Edit trip"
                  onClick={() => onEdit(t)}
                >✏️</button>
              )}
            </div>
          )
        })}
        {editMode && (
          <button className="trip-card card trip-card-new" onClick={onNew}>
            <span className="trip-card-emoji">＋</span>
            <span className="trip-card-name">New trip</span>
          </button>
        )}
      </div>
    </section>
  )
}
