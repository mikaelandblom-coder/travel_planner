import { useState, type FormEvent, type ReactNode } from 'react'
import type { City, Leg, Place, Stay, Trip, TravelMode } from '../types'
import { MODES, PLACE_CATEGORIES, STAY_COLORS } from '../types'
import { addDays, fmtShort } from '../lib/dates'
import { supabase } from '../supabaseClient'
import { EMOJI_PAGES } from '../data/emojis'

export function Modal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal card" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// The button that shows the chosen emoji and opens/closes the picker.
function EmojiButton({ value, placeholder, open, onToggle }: {
  value: string
  placeholder: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={'emoji-input emoji-btn' + (open ? ' open' : '') + (value ? '' : ' empty')}
      onClick={onToggle}
      title="Choose an emoji"
    >{value || placeholder}</button>
  )
}

// A paged emoji grid, shown under the field row. The text box at the
// bottom still takes any emoji typed or pasted from the system keyboard.
function EmojiPanel({ value, onPick, onClose }: {
  value: string
  onPick: (emoji: string) => void
  onClose: () => void
}) {
  const [page, setPage] = useState(EMOJI_PAGES[0].id)
  const current = EMOJI_PAGES.find(p => p.id === page) ?? EMOJI_PAGES[0]
  return (
    <div className="emoji-panel">
      <div className="emoji-tabs">
        {EMOJI_PAGES.map(p => (
          <button
            type="button"
            key={p.id}
            className={'emoji-tab' + (p.id === page ? ' active' : '')}
            onClick={() => setPage(p.id)}
            title={p.label}
          >{p.icon}</button>
        ))}
      </div>
      <div className="emoji-page-label">{current.label}</div>
      <div className="emoji-grid">
        {current.emojis.split(' ').map(e => (
          <button
            type="button"
            key={e}
            className={'emoji-cell' + (e === value ? ' active' : '')}
            onClick={() => { onPick(e); onClose() }}
          >{e}</button>
        ))}
      </div>
      <div className="emoji-panel-foot">
        <input
          value={value}
          onChange={e => onPick(e.target.value)}
          maxLength={4}
          placeholder="Or type one"
        />
        <button type="button" className="btn small" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function FormButtons({ onDelete, deleteLabel }: { onDelete?: () => void; deleteLabel?: string }) {
  return (
    <div className="btn-row form-buttons">
      {onDelete && (
        <button type="button" className="btn danger" onClick={onDelete}>🗑️ {deleteLabel ?? 'Delete'}</button>
      )}
      <button type="submit" className="btn primary">💾 Save</button>
    </div>
  )
}

/** Return [earlier, later] so a swapped range never breaks the calendar. */
const ordered = (a: string, b: string): [string, string] => (a <= b ? [a, b] : [b, a])

const byName = (cities: City[]) => [...cities].sort((a, b) => a.name.localeCompare(b.name))

/** A colour no city has yet, so new cities stand apart on the calendar. */
const freshColor = (cities: City[]) =>
  STAY_COLORS.find(c => !cities.some(x => x.color === c)) ?? STAY_COLORS[cities.length % STAY_COLORS.length]

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="swatches">
      {STAY_COLORS.map(c => (
        <button
          type="button"
          key={c}
          className={'swatch' + (c === value ? ' active' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
    </div>
  )
}

/** Every city name, for the travel From / To suggestions. */
function CityOptions({ id, cities }: { id: string; cities: City[] }) {
  return (
    <datalist id={id}>
      {byName(cities).map(c => <option key={c.id} value={c.name} />)}
    </datalist>
  )
}

export function CityForm({ initial, cities, onSave, onDelete }: {
  initial?: City
  cities: City[]
  onSave: (v: Omit<City, 'id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? freshColor(cities))
  const taken = cities.some(c => c.id !== initial?.id && c.name.toLowerCase() === name.trim().toLowerCase())

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || taken) return
    onSave({ name: name.trim(), color })
  }

  return (
    <form onSubmit={submit}>
      <Field label="City">
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Hanoi" />
      </Field>
      {taken && <p className="hint">{name.trim()} is already on the list.</p>}
      <Field label="Colour">
        <ColorSwatches value={color} onChange={setColor} />
      </Field>
      {initial && (
        <p className="hint">Renaming or recolouring updates every stay in {initial.name}, on all trips.</p>
      )}
      <FormButtons onDelete={onDelete} deleteLabel="Remove city" />
    </form>
  )
}

export function TripForm({ initial, onSave, onDelete }: {
  initial?: Trip
  onSave: (v: Pick<Trip, 'name' | 'emoji' | 'start_date' | 'end_date'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🌏')
  const [picking, setPicking] = useState(false)
  const [start, setStart] = useState(initial?.start_date ?? '')
  const [end, setEnd] = useState(initial?.end_date ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !start || !end) return
    const [a, b] = ordered(start, end)
    onSave({ name: name.trim(), emoji: emoji.trim() || '🧳', start_date: a, end_date: b })
  }

  return (
    <form onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <span className="field-label">Emoji</span>
          <EmojiButton value={emoji} placeholder="🧳" open={picking} onToggle={() => setPicking(!picking)} />
        </div>
        <Field label="Trip name">
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Vietnam & Japan" />
        </Field>
      </div>
      {picking && <EmojiPanel value={emoji} onPick={setEmoji} onClose={() => setPicking(false)} />}
      <div className="field-row">
        <Field label="First day">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} required />
        </Field>
        <Field label="Last day">
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
        </Field>
      </div>
      <FormButtons onDelete={onDelete} deleteLabel="Delete trip" />
    </form>
  )
}

const NEW_CITY = '\u0000new'

/** Stays pick their city from the shared list (or add a new one to it). */
export function StayForm({ initial, defaultDate, cities, onSave, onDelete }: {
  initial?: Stay
  defaultDate?: string
  cities: City[]
  onSave: (v: Omit<Stay, 'id' | 'trip_id'>) => void
  onDelete?: () => void
}) {
  // An older stay whose city isn't on the list still shows as itself.
  const options: City[] = byName(cities)
  if (initial && !cities.some(c => c.name === initial.location_name)) {
    options.unshift({ id: initial.id, name: initial.location_name, color: initial.color })
  }
  const [pick, setPick] = useState(initial?.location_name ?? (options.length ? '' : NEW_CITY))
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(freshColor(cities))
  const [start, setStart] = useState(initial?.start_date ?? defaultDate ?? '')
  const [end, setEnd] = useState(initial?.end_date ?? (defaultDate ? addDays(defaultDate, 3) : ''))
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // A typed name that's already on the list just picks that city.
  const typed = options.find(c => c.name.toLowerCase() === newName.trim().toLowerCase())
  const city: City | undefined = pick === NEW_CITY
    ? typed ?? (newName.trim() ? { id: '', name: newName.trim(), color: newColor } : undefined)
    : options.find(c => c.name === pick)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!city || !start || !end) return
    const [a, b] = ordered(start, end)
    onSave({
      location_name: city.name, start_date: a, end_date: b,
      color: city.color, map_url: mapUrl.trim(), notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit}>
      <Field label="City">
        <select value={pick} onChange={e => setPick(e.target.value)} required>
          <option value="" disabled>Pick a city…</option>
          {options.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value={NEW_CITY}>＋ New city…</option>
        </select>
      </Field>
      {pick === NEW_CITY && (
        <>
          <Field label="New city">
            <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Hanoi" autoFocus />
          </Field>
          {!typed && (
            <Field label="Colour">
              <ColorSwatches value={newColor} onChange={setNewColor} />
            </Field>
          )}
          <p className="hint">{typed ? `${typed.name} is already on the list — we'll use it.` : 'It joins the city list on the start page.'}</p>
        </>
      )}
      <div className="field-row">
        <Field label="Arrive">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} required />
        </Field>
        <Field label="Leave">
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
        </Field>
      </div>
      <Field label="Google Maps link">
        <input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" />
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Hotel, plans, anything" />
      </Field>
      <FormButtons onDelete={onDelete} deleteLabel="Delete stay" />
    </form>
  )
}

/** The trip back on a day trip; saved as its own travel line. */
export type ReturnTrip = { depart_time: string | null; arrive_time: string | null }

export function LegForm({ initial, defaultDate, defaultFrom, defaultDayTrip, cities, onSave, onDelete }: {
  initial?: Leg
  defaultDate?: string
  defaultFrom?: string
  /** Start with "back the same day" ticked (the ＋ Day trip button). */
  defaultDayTrip?: boolean
  cities: City[]
  onSave: (v: Omit<Leg, 'id' | 'trip_id'>, back: ReturnTrip | null) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [arrive, setArrive] = useState(initial?.arrive_date ?? '')
  // DB time columns come back as 'HH:MM:SS' — the time input wants 'HH:MM'.
  const [departTime, setDepartTime] = useState(initial?.depart_time?.slice(0, 5) ?? '')
  const [arriveTime, setArriveTime] = useState(initial?.arrive_time?.slice(0, 5) ?? '')
  const [from, setFrom] = useState(initial?.from_name ?? defaultFrom ?? '')
  const [to, setTo] = useState(initial?.to_name ?? '')
  const [mode, setMode] = useState<TravelMode>(initial?.mode ?? 'flight')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [back, setBack] = useState(defaultDayTrip ?? false)
  const [backDepart, setBackDepart] = useState('')
  const [backArrive, setBackArrive] = useState('')
  // Only a same-day trip can come back the same day.
  const sameDay = !arrive || arrive === date

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!date || !from.trim() || !to.trim()) return
    let [dep, arr] = arrive ? ordered(date, arrive) : [date, null as string | null]
    if (arr === dep) arr = null // same day → no separate arrival
    onSave({
      date: dep, arrive_date: arr, depart_time: departTime || null, arrive_time: arriveTime || null,
      from_name: from.trim(), to_name: to.trim(), mode, notes: notes.trim(),
    }, back && sameDay ? { depart_time: backDepart || null, arrive_time: backArrive || null } : null)
  }

  return (
    <form onSubmit={submit}>
      <div className="field-row">
        <Field label="Departure">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </Field>
        <Field label="Arrival (if other day)">
          <input type="date" value={arrive} onChange={e => setArrive(e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Departs at (optional)">
          <input type="time" value={departTime} onChange={e => setDepartTime(e.target.value)} />
        </Field>
        <Field label="Arrives at (optional)">
          <input type="time" value={arriveTime} onChange={e => setArriveTime(e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="From">
          <input value={from} onChange={e => setFrom(e.target.value)} required placeholder="Hanoi" list="leg-cities" />
        </Field>
        <Field label="To">
          <input value={to} onChange={e => setTo(e.target.value)} required placeholder="Ha Long Bay" list="leg-cities" />
        </Field>
      </div>
      <CityOptions id="leg-cities" cities={cities} />
      {sameDay && (
        <label className="check-field">
          <input type="checkbox" checked={back} onChange={e => setBack(e.target.checked)} />
          <span>
            <strong>↩️ Back the same day</strong>
            <span className="hint">A day trip — also adds the trip back{to.trim() ? ` from ${to.trim()}` : ''}{from.trim() ? ` to ${from.trim()}` : ''}.</span>
          </span>
        </label>
      )}
      {sameDay && back && (
        <div className="field-row">
          <Field label="Back: departs at">
            <input type="time" value={backDepart} onChange={e => setBackDepart(e.target.value)} />
          </Field>
          <Field label="Back: arrives at">
            <input type="time" value={backArrive} onChange={e => setBackArrive(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="How">
        <div className="swatches">
          {MODES.map(m => (
            <button
              type="button"
              key={m.id}
              className={'swatch mode' + (m.id === mode ? ' active' : '')}
              onClick={() => setMode(m.id)}
              title={m.label}
            >{m.emoji}</button>
          ))}
        </div>
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Flight number, times…" />
      </Field>
      <FormButtons onDelete={onDelete} deleteLabel="Delete travel day" />
    </form>
  )
}

export function PlaceForm({ initial, stays, cities, defaultStayId, defaultDate, defaultLeftover, onSave, onDelete }: {
  initial?: Place
  stays: Stay[]
  cities: City[]
  defaultStayId?: string | null
  defaultDate?: string | null
  defaultLeftover?: boolean
  onSave: (v: Omit<Place, 'id' | 'trip_id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'sight')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '')
  const [picking, setPicking] = useState(false)
  const [stayId, setStayId] = useState<string>(initial?.stay_id ?? defaultStayId ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  // DB time columns come back as 'HH:MM:SS' — the time input wants 'HH:MM'.
  const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) ?? '')
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [leftover, setLeftover] = useState(initial?.leftover ?? defaultLeftover ?? false)

  const sortedStays = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const cityOptions = byName(cities)
  if (city && !cities.some(c => c.name === city)) cityOptions.unshift({ id: '', name: city, color: '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(), category, emoji: emoji.trim(),
      stay_id: stayId || null,
      // Kept from the stay too, so the place still knows its city if the
      // stay goes — and later trips to that city can offer it.
      city: stays.find(s => s.id === stayId)?.location_name ?? city,
      // A "next time" idea belongs to no day — it's waiting for another trip.
      date: leftover ? null : (date || null),
      start_time: leftover ? null : (startTime || null),
      end_time: leftover ? null : (endTime || null),
      map_url: mapUrl.trim(), notes: notes.trim(), leftover,
    })
  }

  return (
    <form onSubmit={submit}>
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Fushimi Inari" />
      </Field>
      <div className="field-row">
        <Field label="Type">
          <div className="swatches">
            {PLACE_CATEGORIES.map(c => (
              <button
                type="button"
                key={c.id}
                className={'swatch mode' + (c.id === category && !emoji.trim() ? ' active' : '')}
                onClick={() => { setCategory(c.id); setEmoji('') }}
                title={c.label}
              >{c.emoji}</button>
            ))}
          </div>
        </Field>
        <div className="field">
          <span className="field-label">Own emoji</span>
          <EmojiButton value={emoji} placeholder="🎡" open={picking} onToggle={() => setPicking(!picking)} />
        </div>
      </div>
      {picking && <EmojiPanel value={emoji} onPick={setEmoji} onClose={() => setPicking(false)} />}
      <div className="field-row">
        <Field label="Part of stay">
          <select value={stayId} onChange={e => setStayId(e.target.value)}>
            <option value="">💡 General idea (no stay)</option>
            {sortedStays.map(s => (
              <option key={s.id} value={s.id}>{s.location_name} ({fmtShort(s.start_date)})</option>
            ))}
          </select>
        </Field>
        {!stayId && (
          <Field label="City">
            <select value={city} onChange={e => setCity(e.target.value)}>
              <option value="">🌍 Anywhere</option>
              {cityOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
        )}
      </div>
      {!leftover && (
        <Field label="Day (optional)">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
      )}
      {!leftover && (
        <div className="field-row">
          <Field label="Starts (optional)">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </Field>
          <Field label="Ends (optional)">
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </Field>
        </div>
      )}
      <label className="check-field">
        <input type="checkbox" checked={leftover} onChange={e => setLeftover(e.target.checked)} />
        <span>
          <strong>🌱 Save for next time</strong>
          <span className="hint">Didn't manage it — keep it for a future trip instead of a day here.</span>
        </span>
      </label>
      <Field label="Google Maps link">
        <input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" />
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Why it's on the list" />
      </Field>
      <FormButtons onDelete={onDelete} deleteLabel="Delete place" />
    </form>
  )
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) alert(error.message)
  }

  return (
    <form onSubmit={submit}>
      <p className="hint">Sign in with your planner account — same on every device.</p>
      <Field label="Email">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
      </Field>
      <Field label="Password">
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
      </Field>
      <div className="btn-row form-buttons">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : '🔑 Sign in'}
        </button>
      </div>
    </form>
  )
}
