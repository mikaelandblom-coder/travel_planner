import { useState, type FormEvent, type ReactNode } from 'react'
import type { Leg, Place, Stay, Trip, TravelMode } from '../types'
import { MODES, PLACE_CATEGORIES, STAY_COLORS } from '../types'
import { addDays, fmtShort } from '../lib/dates'
import { supabase } from '../supabaseClient'

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

export function TripForm({ initial, onSave, onDelete }: {
  initial?: Trip
  onSave: (v: Omit<Trip, 'id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🌏')
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
        <Field label="Emoji">
          <input className="emoji-input" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Trip name">
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Vietnam & Japan" />
        </Field>
      </div>
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

export function StayForm({ initial, defaultDate, onSave, onDelete }: {
  initial?: Stay
  defaultDate?: string
  onSave: (v: Omit<Stay, 'id' | 'trip_id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.location_name ?? '')
  const [start, setStart] = useState(initial?.start_date ?? defaultDate ?? '')
  const [end, setEnd] = useState(initial?.end_date ?? (defaultDate ? addDays(defaultDate, 3) : ''))
  const [color, setColor] = useState(initial?.color ?? STAY_COLORS[0])
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !start || !end) return
    const [a, b] = ordered(start, end)
    onSave({
      location_name: name.trim(), start_date: a, end_date: b,
      color, map_url: mapUrl.trim(), notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit}>
      <Field label="Where">
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Hanoi" />
      </Field>
      <div className="field-row">
        <Field label="Arrive">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} required />
        </Field>
        <Field label="Leave">
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} required />
        </Field>
      </div>
      <Field label="Colour">
        <div className="swatches">
          {STAY_COLORS.map(c => (
            <button
              type="button"
              key={c}
              className={'swatch' + (c === color ? ' active' : '')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </Field>
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

export function LegForm({ initial, defaultDate, onSave, onDelete }: {
  initial?: Leg
  defaultDate?: string
  onSave: (v: Omit<Leg, 'id' | 'trip_id'>) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [arrive, setArrive] = useState(initial?.arrive_date ?? '')
  const [from, setFrom] = useState(initial?.from_name ?? '')
  const [to, setTo] = useState(initial?.to_name ?? '')
  const [mode, setMode] = useState<TravelMode>(initial?.mode ?? 'flight')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!date || !from.trim() || !to.trim()) return
    let [dep, arr] = arrive ? ordered(date, arrive) : [date, null as string | null]
    if (arr === dep) arr = null // same day → no separate arrival
    onSave({ date: dep, arrive_date: arr, from_name: from.trim(), to_name: to.trim(), mode, notes: notes.trim() })
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
        <Field label="From">
          <input value={from} onChange={e => setFrom(e.target.value)} required placeholder="Hanoi" />
        </Field>
        <Field label="To">
          <input value={to} onChange={e => setTo(e.target.value)} required placeholder="Ha Long Bay" />
        </Field>
      </div>
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

export function PlaceForm({ initial, stays, defaultStayId, onSave, onDelete }: {
  initial?: Place
  stays: Stay[]
  defaultStayId?: string | null
  onSave: (v: Omit<Place, 'id' | 'trip_id'>) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'sight')
  const [stayId, setStayId] = useState<string>(initial?.stay_id ?? defaultStayId ?? '')
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const sortedStays = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(), category, stay_id: stayId || null,
      map_url: mapUrl.trim(), notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit}>
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Fushimi Inari" />
      </Field>
      <Field label="Type">
        <div className="swatches">
          {PLACE_CATEGORIES.map(c => (
            <button
              type="button"
              key={c.id}
              className={'swatch mode' + (c.id === category ? ' active' : '')}
              onClick={() => setCategory(c.id)}
              title={c.label}
            >{c.emoji}</button>
          ))}
        </div>
      </Field>
      <Field label="Part of stay">
        <select value={stayId} onChange={e => setStayId(e.target.value)}>
          <option value="">💡 General idea (no stay)</option>
          {sortedStays.map(s => (
            <option key={s.id} value={s.id}>{s.location_name} ({fmtShort(s.start_date)})</option>
          ))}
        </select>
      </Field>
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
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error) alert(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <p className="hint">
        💌 Check your inbox! We sent a sign-in link to <strong>{email}</strong>.
        Open it on this device and you'll be signed in.
      </p>
    )
  }

  return (
    <form onSubmit={submit}>
      <p className="hint">Enter your email and we'll send a magic sign-in link — no password needed.</p>
      <Field label="Email">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
      </Field>
      <div className="btn-row form-buttons">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Sending…' : '💌 Send magic link'}
        </button>
      </div>
    </form>
  )
}
