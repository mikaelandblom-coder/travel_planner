import type { Leg, Place, Stay, Trip, TripData } from '../types'
import { modeEmoji, placeEmoji, timeKey, timeRange } from '../types'
import { addDays, daysBetween, fmtLong, fmtShort } from '../lib/dates'

type Props = {
  trip: Trip
  data: TripData
  editMode: boolean
  onSelectDate: (iso: string | null) => void
  onEditStay: (stay?: Stay, defaultDate?: string) => void
  onEditLeg: (leg?: Leg, defaultDate?: string) => void
  onEditPlace: (place?: Place, defaultStayId?: string | null, defaultDate?: string | null) => void
  onAssignStay: (stay: Stay, date: string) => void
  onDeleteStay: (s: Stay) => void
  onDeleteLeg: (l: Leg) => void
  onDeletePlace: (p: Place) => void
}

/** Trip summary + backup list, shown below the calendar. */
export function Overview({ trip, data, editMode, onSelectDate, onEditStay, onEditLeg, onEditPlace, onDeleteStay, onDeletePlace }: Props) {
  const stays = [...data.stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  // The backup list: everything not yet allocated to a day. General ideas
  // first, then grouped by stay in trip order.
  const stayStart = (p: Place) => stays.find(s => s.id === p.stay_id)?.start_date ?? ''
  const backup = data.places
    .filter(p => !p.date)
    .sort((a, b) => stayStart(a).localeCompare(stayStart(b)))

  return (
    <aside className="panel card">
      <h2 className="panel-title">✨ Overview</h2>
      <p className="hint">
        {editMode
          ? 'Tap ✏️ to edit a city, 🗑️ to remove it, or ＋ Stay to add one.'
          : 'Tap a day in the calendar for details.'}
      </p>
      <div className="stack">
        {stays.map(s => (
          <div
            key={s.id}
            className="row"
            role="button"
            tabIndex={0}
            onClick={() => onSelectDate(s.start_date)}
            onKeyDown={e => { if (e.key === 'Enter') onSelectDate(s.start_date) }}
          >
            <span className="dot" style={{ background: s.color }} />
            <span className="row-main">
              <span className="row-title">{s.location_name}</span>
              <span className="row-sub">
                {fmtShort(s.start_date)} – {fmtShort(s.end_date)} · {daysBetween(s.start_date, s.end_date)} nights
              </span>
            </span>
            {editMode ? (
              <span onClick={e => e.stopPropagation()}>
                <RowActions onEdit={() => onEditStay(s)} onDelete={() => onDeleteStay(s)} />
              </span>
            ) : (
              <span className="row-go">→</span>
            )}
          </div>
        ))}
        {stays.length === 0 && <p className="hint">No stays yet{editMode ? ' — add your first one below!' : '.'}</p>}
      </div>

      {(backup.length > 0 || editMode) && (
        <>
          <h3 className="panel-sub">📌 Backup list</h3>
          <p className="hint">
            Restaurants & ideas without a day yet
            {editMode ? ' — edit one to give it a day, or link a Google Maps saved list (📑).' : '.'}
          </p>
        </>
      )}
      <PlaceList places={backup} stays={stays} editMode={editMode} onEditPlace={onEditPlace} onDeletePlace={onDeletePlace} />

      {editMode && (
        <div className="btn-row">
          <button className="btn small" onClick={() => onEditStay(undefined, trip.start_date)}>＋ Stay</button>
          <button className="btn small" onClick={() => onEditLeg(undefined, trip.start_date)}>＋ Travel</button>
          <button className="btn small" onClick={() => onEditPlace(undefined, null)}>＋ Backup idea</button>
        </div>
      )}
    </aside>
  )
}

/** A day's details in a popup over the calendar. */
export function DayModal(props: Props & { date: string }) {
  return (
    <div className="overlay" onMouseDown={() => props.onSelectDate(null)}>
      <div className="modal day-modal card" onMouseDown={e => e.stopPropagation()}>
        <DayView {...props} />
      </div>
    </div>
  )
}

function DayView(props: Props & { date: string }) {
  const { trip, data, date, editMode } = props
  const dayStays = data.stays
    .filter(s => s.start_date <= date && date <= s.end_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const dayLegs = data.legs.filter(l => l.date === date || l.arrive_date === date)
  const dayVisits = data.places
    .filter(p => p.date === date)
    .sort((a, b) => timeKey(a).localeCompare(timeKey(b)))
  const dayN = daysBetween(trip.start_date, date) + 1
  const total = daysBetween(trip.start_date, trip.end_date) + 1

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{fmtLong(date)}</h2>
          {dayN >= 1 && dayN <= total && <p className="hint">Day {dayN} of {total}</p>}
        </div>
        <span className="day-nav">
          <button className="icon-btn" title="Previous day" onClick={() => props.onSelectDate(addDays(date, -1))}>‹</button>
          <button className="icon-btn" title="Next day" onClick={() => props.onSelectDate(addDays(date, 1))}>›</button>
          <button className="icon-btn" title="Close" onClick={() => props.onSelectDate(null)}>✕</button>
        </span>
      </div>

      {dayLegs.map(l => (
        <div key={l.id} className="sub-card leg-card">
          <div className="leg-line">
            <span className="leg-emoji">{modeEmoji(l.mode)}</span>
            <strong>{l.from_name}</strong>
            <span className="arrow">→</span>
            <strong>{l.to_name}</strong>
            {editMode && <RowActions onEdit={() => props.onEditLeg(l)} onDelete={() => props.onDeleteLeg(l)} />}
          </div>
          {l.arrive_date && l.arrive_date !== l.date && (
            <p className="row-sub">
              Departs {fmtShort(l.date)} · arrives {fmtShort(l.arrive_date)} (+{daysBetween(l.date, l.arrive_date)}{' '}
              {daysBetween(l.date, l.arrive_date) === 1 ? 'day' : 'days'})
            </p>
          )}
          {l.notes && <p className="notes">{l.notes}</p>}
        </div>
      ))}

      {dayStays.map(s => (
        // Just the stay itself — the full list of its places lives in the
        // ✨ Overview; this view only shows what's planned for the day.
        <div key={s.id} className="sub-card" style={{ borderColor: s.color }}>
          <div className="stay-head">
            <span className="dot" style={{ background: s.color }} />
            <div className="row-main">
              <h3 className="row-title">{s.location_name}</h3>
              <p className="row-sub">
                {fmtShort(s.start_date)} – {fmtShort(s.end_date)} · {daysBetween(s.start_date, s.end_date)} nights
              </p>
            </div>
            {editMode && <RowActions onEdit={() => props.onEditStay(s)} onDelete={() => props.onDeleteStay(s)} />}
          </div>
          {s.notes && <p className="notes">{s.notes}</p>}
          {s.map_url && (
            <a className="btn small link" href={s.map_url} target="_blank" rel="noreferrer">
              📍 Open in Google Maps
            </a>
          )}
        </div>
      ))}

      {dayVisits.length > 0 && (
        <>
          <h3 className="panel-sub">🍽️ Plans this day</h3>
          <PlaceList places={dayVisits} editMode={editMode} onEditPlace={props.onEditPlace} onDeletePlace={props.onDeletePlace} />
        </>
      )}

      {dayStays.length === 0 && dayLegs.length === 0 && dayVisits.length === 0 && (
        <p className="hint">Nothing planned this day yet {editMode ? '— add something below!' : '🌤️'}</p>
      )}

      {editMode && (
        <div className="btn-row">
          <StayPicker stays={data.stays} date={date} onAssign={props.onAssignStay} />
          <button
            className="btn small"
            onClick={() => props.onEditPlace(undefined, dayStays[0]?.id ?? null, date)}
          >＋ Visit this day</button>
          <button className="btn small" onClick={() => props.onEditLeg(undefined, date)}>＋ Travel this day</button>
        </div>
      )}
      {editMode && data.stays.length === 0 && (
        <p className="hint">Days pick from the trip's stays — add your first stay from the ✨ Overview.</p>
      )}
    </>
  )
}

/**
 * Days can only use stays that already exist on the trip: picking one
 * stretches that stay to cover this day, so the calendar bands and the
 * per-day details always agree.
 */
function StayPicker({ stays, date, onAssign }: {
  stays: Stay[]
  date: string
  onAssign: (stay: Stay, date: string) => void
}) {
  const candidates = stays
    .filter(s => !(s.start_date <= date && date <= s.end_date))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (candidates.length === 0) return null
  return (
    <select
      className="stay-picker"
      value=""
      title="Assign one of the trip's stays to this day"
      onChange={e => {
        const s = candidates.find(x => x.id === e.target.value)
        if (s) onAssign(s, date)
      }}
    >
      <option value="" disabled>🏡 Stay here…</option>
      {candidates.map(s => (
        <option key={s.id} value={s.id}>
          {s.location_name} ({fmtShort(s.start_date)} – {fmtShort(s.end_date)})
        </option>
      ))}
    </select>
  )
}

function PlaceList({ places, stays, editMode, onEditPlace, onDeletePlace }: {
  places: Place[]
  stays?: Stay[] // when given, rows show which stay each place belongs to
  editMode: boolean
  onEditPlace: (place?: Place, defaultStayId?: string | null, defaultDate?: string | null) => void
  onDeletePlace: (p: Place) => void
}) {
  if (places.length === 0) return null
  return (
    <ul className="places">
      {places.map(p => {
        const stay = stays?.find(s => s.id === p.stay_id)
        return (
          <li key={p.id}>
            <span className="place-emoji">{placeEmoji(p)}</span>
            <span className="row-main">
              <span className="row-title">{p.name}</span>
              {(p.date || timeRange(p) || stay || p.notes) && (
                <span className="row-sub sub-bits">
                  {p.date && <span>📅 {fmtShort(p.date)}</span>}
                  {timeRange(p) && <span>🕐 {timeRange(p)}</span>}
                  {stay && (
                    <span><span className="tag-dot" style={{ background: stay.color }} />{stay.location_name}</span>
                  )}
                  {p.notes && <span>{p.notes}</span>}
                </span>
              )}
            </span>
            {p.map_url && (
              <a className="icon-btn" href={p.map_url} target="_blank" rel="noreferrer" title="Open in Google Maps">📍</a>
            )}
            {editMode && <RowActions onEdit={() => onEditPlace(p)} onDelete={() => onDeletePlace(p)} />}
          </li>
        )
      })}
    </ul>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="row-actions">
      <button className="icon-btn" title="Edit" onClick={onEdit}>✏️</button>
      <button className="icon-btn" title="Delete" onClick={onDelete}>🗑️</button>
    </span>
  )
}
