import { useEffect, useRef } from 'react'
import type { Leg, Place, Stay, Trip, TripData } from '../types'
import { categoryEmoji, modeEmoji } from '../types'
import { daysBetween, fmtLong, fmtShort } from '../lib/dates'

type Props = {
  trip: Trip
  data: TripData
  selectedDate: string | null
  editMode: boolean
  onSelectDate: (iso: string | null) => void
  onEditStay: (stay?: Stay, defaultDate?: string) => void
  onEditLeg: (leg?: Leg, defaultDate?: string) => void
  onEditPlace: (place?: Place, defaultStayId?: string | null) => void
  onDeleteStay: (s: Stay) => void
  onDeleteLeg: (l: Leg) => void
  onDeletePlace: (p: Place) => void
}

export function DayPanel(props: Props) {
  const ref = useRef<HTMLElement>(null)

  // On narrow screens the panel sits below the calendar — bring it into view.
  useEffect(() => {
    if (props.selectedDate && window.innerWidth < 900) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [props.selectedDate])

  return (
    <aside className="panel card" ref={ref}>
      {props.selectedDate ? <DayView {...props} date={props.selectedDate} /> : <Overview {...props} />}
    </aside>
  )
}

function Overview({ trip, data, editMode, onSelectDate, onEditStay, onEditLeg, onEditPlace, onDeleteStay, onDeletePlace }: Props) {
  const stays = [...data.stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const ideas = data.places.filter(p => !p.stay_id)

  return (
    <>
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

      {(ideas.length > 0 || editMode) && <h3 className="panel-sub">💡 Ideas & other places</h3>}
      <PlaceList places={ideas} editMode={editMode} onEditPlace={onEditPlace} onDeletePlace={onDeletePlace} />

      {editMode && (
        <div className="btn-row">
          <button className="btn small" onClick={() => onEditStay(undefined, trip.start_date)}>＋ Stay</button>
          <button className="btn small" onClick={() => onEditLeg(undefined, trip.start_date)}>＋ Travel</button>
          <button className="btn small" onClick={() => onEditPlace(undefined, null)}>＋ Idea</button>
        </div>
      )}
    </>
  )
}

function DayView(props: Props & { date: string }) {
  const { trip, data, date, editMode } = props
  const dayStays = data.stays
    .filter(s => s.start_date <= date && date <= s.end_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const dayLegs = data.legs.filter(l => l.date === date)
  const dayN = daysBetween(trip.start_date, date) + 1
  const total = daysBetween(trip.start_date, trip.end_date) + 1

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{fmtLong(date)}</h2>
          {dayN >= 1 && dayN <= total && <p className="hint">Day {dayN} of {total}</p>}
        </div>
        <button className="icon-btn" title="Back to overview" onClick={() => props.onSelectDate(null)}>✕</button>
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
          {l.notes && <p className="notes">{l.notes}</p>}
        </div>
      ))}

      {dayStays.map(s => {
        const places = data.places.filter(p => p.stay_id === s.id)
        return (
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
            {places.length > 0 && <h4 className="panel-sub">Places</h4>}
            <PlaceList places={places} editMode={editMode} onEditPlace={props.onEditPlace} onDeletePlace={props.onDeletePlace} />
            {editMode && (
              <div className="btn-row">
                <button className="btn small" onClick={() => props.onEditPlace(undefined, s.id)}>＋ Place</button>
              </div>
            )}
          </div>
        )
      })}

      {dayStays.length === 0 && dayLegs.length === 0 && (
        <p className="hint">Nothing planned this day yet {editMode ? '— add something below!' : '🌤️'}</p>
      )}

      {editMode && (
        <div className="btn-row">
          <button className="btn small" onClick={() => props.onEditStay(undefined, date)}>＋ Stay here</button>
          <button className="btn small" onClick={() => props.onEditLeg(undefined, date)}>＋ Travel this day</button>
        </div>
      )}
    </>
  )
}

function PlaceList({ places, editMode, onEditPlace, onDeletePlace }: {
  places: Place[]
  editMode: boolean
  onEditPlace: (place?: Place, defaultStayId?: string | null) => void
  onDeletePlace: (p: Place) => void
}) {
  if (places.length === 0) return null
  return (
    <ul className="places">
      {places.map(p => (
        <li key={p.id}>
          <span className="place-emoji">{categoryEmoji(p.category)}</span>
          <span className="row-main">
            <span className="row-title">{p.name}</span>
            {p.notes && <span className="row-sub">{p.notes}</span>}
          </span>
          {p.map_url && (
            <a className="icon-btn" href={p.map_url} target="_blank" rel="noreferrer" title="Open in Google Maps">📍</a>
          )}
          {editMode && <RowActions onEdit={() => onEditPlace(p)} onDelete={() => onDeletePlace(p)} />}
        </li>
      ))}
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
