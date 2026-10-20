import { useState } from 'react'
import type { Leg, Place, Stay, Todo, Trip, TripData } from '../types'
import { modeEmoji, placeEmoji, timeKey, timeRange } from '../types'
import { addDays, daysBetween, fmtLong, fmtShort } from '../lib/dates'

type Props = {
  trip: Trip
  data: TripData
  editMode: boolean
  onSelectDate: (iso: string | null) => void
  onEditStay: (stay?: Stay, defaultDate?: string) => void
  /** defaultFrom / dayTrip: start the form as a day trip from that city. */
  onEditLeg: (leg?: Leg, defaultDate?: string, defaultFrom?: string, dayTrip?: boolean) => void
  onEditPlace: (place?: Place, defaultStayId?: string | null, defaultDate?: string | null, defaultLeftover?: boolean) => void
  onAssignStay: (stay: Stay, date: string) => void
  onDeleteStay: (s: Stay) => void
  onDeleteLeg: (l: Leg) => void
  onDeletePlace: (p: Place) => void
  /** Move a place to / from this trip's "next time" list. */
  onToggleLeftover: (p: Place) => void
}

type OverviewProps = Props & {
  /** All trips, so leftovers can say which trip they are from. */
  trips: Trip[]
  /** Places other trips saved for next time. */
  pastLeftovers: Place[]
  /** Copy one of those into this trip (and tick it off the old trip's list). */
  onCarryOver: (p: Place) => void
  onAddTodo: (text: string) => void
  onSaveTodo: (t: Todo) => void
  onDeleteTodo: (t: Todo) => void
  /** Turn a backup idea into a to-do (it leaves the backup list). */
  onPlaceToTodo: (p: Place) => void
}

/** Trip summary, to-dos, backup list and the "next time" lists, shown below the calendar. */
export function Overview({
  trip, data, trips, pastLeftovers, editMode, onSelectDate,
  onEditStay, onEditLeg, onEditPlace, onDeleteStay, onDeletePlace,
  onToggleLeftover, onCarryOver, onAddTodo, onSaveTodo, onDeleteTodo, onPlaceToTodo,
}: OverviewProps) {
  const stays = [...data.stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const stayStart = (p: Place) => stays.find(s => s.id === p.stay_id)?.start_date ?? ''
  // The backup list: everything not yet allocated to a day, grouped by city
  // (a stay's city wins over the place's own). General ideas first, then the
  // trip's cities in the order we first get there, then other cities A–Z.
  const cityOf = (p: Place) => stays.find(s => s.id === p.stay_id)?.location_name ?? p.city
  const firstVisit = (city: string) => stays.find(s => s.location_name === city)?.start_date
  const backupGroups: { city: string; color: string | null; places: Place[] }[] = []
  for (const p of data.places.filter(p => !p.date && !p.leftover)) {
    const city = cityOf(p)
    const group = backupGroups.find(g => g.city === city)
    if (group) group.places.push(p)
    else backupGroups.push({ city, color: stays.find(s => s.location_name === city)?.color ?? null, places: [p] })
  }
  const groupKey = (city: string) => (!city ? '0' : firstVisit(city) ? `1${firstVisit(city)}` : '2')
  backupGroups.sort((a, b) => groupKey(a.city).localeCompare(groupKey(b.city)) || a.city.localeCompare(b.city))
  const backupCount = backupGroups.reduce((n, g) => n + g.places.length, 0)
  // What we didn't manage on this trip, waiting for a future one.
  const leftovers = data.places
    .filter(p => p.leftover)
    .sort((a, b) => stayStart(a).localeCompare(stayStart(b)) || a.name.localeCompare(b.name))

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

      <TodoList
        todos={data.todos}
        editMode={editMode}
        onAdd={onAddTodo}
        onSave={onSaveTodo}
        onDelete={onDeleteTodo}
      />

      {(backupCount > 0 || editMode) && (
        <>
          <h3 className="panel-sub">📌 Backup list</h3>
          <p className="hint">
            Restaurants & ideas without a day yet
            {editMode ? ' — edit one to give it a day, link a Google Maps saved list (📑), or tap ☑️ to make it a to-do.' : '.'}
          </p>
        </>
      )}
      {backupGroups.map(g => (
        <div key={g.city} className="place-group">
          <h4 className="place-group-title">
            {g.color ? <span className="tag-dot" style={{ background: g.color }} /> : '🌍 '}
            {g.city || 'Anywhere'}
            <span className="place-group-count">{g.places.length}</span>
          </h4>
          <PlaceList
            places={g.places}
            editMode={editMode}
            onEditPlace={onEditPlace}
            onDeletePlace={onDeletePlace}
            onToggleLeftover={onToggleLeftover}
            onToTodo={onPlaceToTodo}
          />
        </div>
      ))}

      {(leftovers.length > 0 || editMode) && (
        <>
          <h3 className="panel-sub">🌱 Next time</h3>
          <p className="hint">
            What we didn't manage on this trip
            {editMode ? ' — tap 🌱 on any place to move it here.' : '.'}
          </p>
        </>
      )}
      <PlaceList
        places={leftovers}
        stays={stays}
        editMode={editMode}
        onEditPlace={onEditPlace}
        onDeletePlace={onDeletePlace}
        onToggleLeftover={onToggleLeftover}
      />

      {editMode && pastLeftovers.length > 0 && (
        <>
          <h3 className="panel-sub">💭 Saved from earlier trips</h3>
          <p className="hint">Ideas from earlier trips to the cities on this one — tap ＋ to bring one along.</p>
          <ul className="places">
            {pastLeftovers.map(p => {
              const from = trips.find(t => t.id === p.trip_id)
              return (
                <li key={p.id}>
                  <span className="place-emoji">{placeEmoji(p)}</span>
                  <span className="row-main">
                    <span className="row-title">{p.name}</span>
                    <span className="row-sub sub-bits">
                      {from && <span>{from.emoji || '🧳'} {from.name}</span>}
                      {p.notes && <span>{p.notes}</span>}
                    </span>
                  </span>
                  {p.map_url && (
                    <a className="icon-btn" href={p.map_url} target="_blank" rel="noreferrer" title="Open in Google Maps">📍</a>
                  )}
                  <button
                    className="icon-btn"
                    title={`Add “${p.name}” to ${trip.name}`}
                    onClick={() => onCarryOver(p)}
                  >＋</button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {editMode && (
        <div className="btn-row">
          <button className="btn small" onClick={() => onEditStay(undefined, trip.start_date)}>＋ Stay</button>
          <button className="btn small" onClick={() => onEditLeg(undefined, trip.start_date)}>＋ Travel</button>
          <button className="btn small" onClick={() => onEditPlace(undefined, null)}>＋ Backup idea</button>
          <button className="btn small" onClick={() => onEditPlace(undefined, null, null, true)}>＋ Next time</button>
        </div>
      )}
    </aside>
  )
}

type DayProps = Props & {
  date: string
  /** Mark the day's planning as done / not done. */
  onTogglePlanned: (date: string) => void
}

/** A day's details in a popup over the calendar. */
export function DayModal(props: DayProps) {
  return (
    <div className="overlay" onMouseDown={() => props.onSelectDate(null)}>
      <div className="modal day-modal card" onMouseDown={e => e.stopPropagation()}>
        <DayView {...props} />
      </div>
    </div>
  )
}

function DayView(props: DayProps) {
  const { trip, data, date, editMode } = props
  const dayStays = data.stays
    .filter(s => s.start_date <= date && date <= s.end_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const dayLegs = data.legs.filter(l => l.date === date || l.arrive_date === date)
  const dayVisits = data.places
    .filter(p => p.date === date && !p.leftover)
    .sort((a, b) => timeKey(a).localeCompare(timeKey(b)))
  const dayN = daysBetween(trip.start_date, date) + 1
  const total = daysBetween(trip.start_date, trip.end_date) + 1
  const planned = trip.planned_days.includes(date)

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{fmtLong(date)}</h2>
          {((dayN >= 1 && dayN <= total) || planned) && (
            <p className="hint">
              {dayN >= 1 && dayN <= total && `Day ${dayN} of ${total}`}
              {planned && <span className="planned-tag">✓ planned</span>}
            </p>
          )}
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
          {legTimes(l) && <p className="row-sub">🕐 {legTimes(l)}</p>}
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
          <PlaceList
            places={dayVisits}
            editMode={editMode}
            onEditPlace={props.onEditPlace}
            onDeletePlace={props.onDeletePlace}
            onToggleLeftover={props.onToggleLeftover}
          />
        </>
      )}

      {dayStays.length === 0 && dayLegs.length === 0 && dayVisits.length === 0 && (
        <p className="hint">Nothing planned this day yet {editMode ? '— add something below!' : '🌤️'}</p>
      )}

      {editMode && (
        <div className="btn-row">
          <button
            className={'btn small' + (planned ? ' planned-on' : '')}
            title={planned ? 'Planning for this day is done — tap to reopen it' : 'Mark this day as fully planned'}
            onClick={() => props.onTogglePlanned(date)}
          >{planned ? '✓ Planned' : '☐ Mark planned'}</button>
          <StayPicker stays={data.stays} date={date} onAssign={props.onAssignStay} />
          <button
            className="btn small"
            onClick={() => props.onEditPlace(undefined, dayStays[0]?.id ?? null, date)}
          >＋ Visit this day</button>
          <button className="btn small" onClick={() => props.onEditLeg(undefined, date)}>＋ Travel this day</button>
          {dayStays.length > 0 && (
            <button
              className="btn small"
              title="Go somewhere and come back the same day"
              onClick={() => props.onEditLeg(undefined, date, dayStays[0].location_name, true)}
            >＋ Day trip</button>
          )}
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

/** '09:10 → 11:30' / 'departs 09:10' / 'arrives 11:30'; '' when no times. */
function legTimes(l: Leg): string {
  const dep = l.depart_time?.slice(0, 5)
  const arr = l.arrive_time?.slice(0, 5)
  if (dep && arr) return `${dep} → ${arr}`
  if (dep) return `departs ${dep}`
  if (arr) return `arrives ${arr}`
  return ''
}

/** Things to tick off for the trip. Ticking needs edit mode, like any change. */
function TodoList({ todos, editMode, onAdd, onSave, onDelete }: {
  todos: Todo[]
  editMode: boolean
  onAdd: (text: string) => void
  onSave: (t: Todo) => void
  onDelete: (t: Todo) => void
}) {
  const [text, setText] = useState('')
  if (todos.length === 0 && !editMode) return null
  // Open ones first; done ones sink to the bottom (each in the order added).
  const sorted = [...todos.filter(t => !t.done), ...todos.filter(t => t.done)]
  const open = todos.filter(t => !t.done).length

  return (
    <>
      <h3 className="panel-sub">☑️ To-do{todos.length > 0 && ` · ${todos.length - open}/${todos.length}`}</h3>
      {editMode && todos.length === 0 && <p className="hint">Things to tick off — book tickets, buy a SIM…</p>}
      <ul className="places">
        {sorted.map(t => (
          <li key={t.id} className={'todo' + (t.done ? ' done' : '')}>
            <input
              type="checkbox"
              checked={t.done}
              disabled={!editMode}
              title={editMode ? undefined : 'Switch to edit mode to tick things off'}
              onChange={() => onSave({ ...t, done: !t.done })}
            />
            <span className="row-main">
              <span className="row-title">{t.text}</span>
              {t.notes && <span className="row-sub">{t.notes}</span>}
            </span>
            {editMode && (
              <RowActions
                onEdit={() => {
                  const next = prompt('To-do', t.text)?.trim()
                  if (next && next !== t.text) onSave({ ...t, text: next })
                }}
                onDelete={() => onDelete(t)}
              />
            )}
          </li>
        ))}
      </ul>
      {editMode && (
        <form
          className="todo-add"
          onSubmit={e => {
            e.preventDefault()
            if (!text.trim()) return
            onAdd(text.trim())
            setText('')
          }}
        >
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a to-do…" />
          <button type="submit" className="btn small">＋</button>
        </form>
      )}
    </>
  )
}

function PlaceList({ places, stays, editMode, onEditPlace, onDeletePlace, onToggleLeftover, onToTodo }: {
  places: Place[]
  stays?: Stay[] // when given, rows show which stay each place belongs to
  editMode: boolean
  onEditPlace: (place?: Place, defaultStayId?: string | null, defaultDate?: string | null) => void
  onDeletePlace: (p: Place) => void
  onToggleLeftover: (p: Place) => void
  /** When given, edit mode offers turning a place into a to-do. */
  onToTodo?: (p: Place) => void
}) {
  if (places.length === 0) return null
  return (
    <ul className="places">
      {places.map(p => {
        const stay = stays?.find(s => s.id === p.stay_id)
        return (
          <li key={p.id} className={p.leftover ? 'leftover' : undefined}>
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
            {editMode && (
              <button
                className="icon-btn"
                title={p.leftover
                  ? `Plan “${p.name}” on this trip after all`
                  : `Didn't manage “${p.name}” — save it for next time`}
                onClick={() => onToggleLeftover(p)}
              >{p.leftover ? '↩️' : '🌱'}</button>
            )}
            {editMode && onToTodo && (
              <button
                className="icon-btn"
                title={`“${p.name}” is something to do, not a place — move it to the to-do list`}
                onClick={() => onToTodo(p)}
              >☑️</button>
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
