import type { CSSProperties } from 'react'
import type { Leg, Place, Stay, Trip } from '../types'
import { modeEmoji, placeEmoji, timeKey } from '../types'
import { mondayIndex, monthLabel, monthsInRange, todayISO, WEEKDAYS } from '../lib/dates'

type Props = {
  trip: Trip
  stays: Stay[]
  legs: Leg[]
  places: Place[]
  selectedDate: string | null
  onSelect: (iso: string) => void
}

export function Calendar({ trip, stays, legs, places, selectedDate, onSelect }: Props) {
  const sorted = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))

  // One legend chip per location, even when it has several visits.
  const chipGroups: { name: string; color: string; visits: Stay[] }[] = []
  for (const s of sorted) {
    const g = chipGroups.find(x => x.name === s.location_name)
    if (g) g.visits.push(s)
    else chipGroups.push({ name: s.location_name, color: s.color, visits: [s] })
  }
  const all = [
    trip.start_date, trip.end_date,
    ...stays.flatMap(s => [s.start_date, s.end_date]),
    ...legs.flatMap(l => (l.arrive_date ? [l.date, l.arrive_date] : [l.date])),
  ]
  const min = all.reduce((a, b) => (a < b ? a : b))
  const max = all.reduce((a, b) => (a > b ? a : b))
  const months = monthsInRange(min, max)
  const today = todayISO()

  return (
    <section className="calendar">
      {chipGroups.length > 0 && (
        <div className="legend">
          {chipGroups.map(g => (
            <button
              key={g.name}
              className="chip"
              style={{ background: g.color }}
              title={`${g.name}: ` + g.visits.map(v => `${v.start_date} → ${v.end_date}`).join(', ')}
              onClick={() => {
                // Repeated clicks cycle through this location's visits.
                const i = g.visits.findIndex(v => v.start_date === selectedDate)
                onSelect(g.visits[(i + 1) % g.visits.length].start_date)
              }}
            >
              {g.name}
              {g.visits.length > 1 && <span className="chip-count">×{g.visits.length}</span>}
            </button>
          ))}
        </div>
      )}
      {months.map(({ year, month }) => (
        <MonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          trip={trip}
          stays={sorted}
          legs={legs}
          places={places}
          selectedDate={selectedDate}
          today={today}
          onSelect={onSelect}
        />
      ))}
    </section>
  )
}

/** Flights spanning days get distinct take-off / landing badges. */
function legBadge(leg: Leg, iso: string): string {
  if (leg.mode === 'flight' && leg.arrive_date && leg.arrive_date !== leg.date) {
    return iso === leg.date ? '🛫' : '🛬'
  }
  return modeEmoji(leg.mode)
}

type MonthProps = {
  year: number
  month: number // 0-based
  trip: Trip
  stays: Stay[]
  legs: Leg[]
  places: Place[]
  selectedDate: string | null
  today: string
  onSelect: (iso: string) => void
}

function MonthGrid({ year, month, trip, stays, legs, places, selectedDate, today, onSelect }: MonthProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = mondayIndex(new Date(year, month, 1))
  const pad2 = (n: number) => String(n).padStart(2, '0')

  // Longest activity line per weekday column, so busy columns can get wider.
  const colLen = [0, 0, 0, 0, 0, 0, 0]

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(<div key={'pad' + i} className="day pad" />)

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    const dayStays = stays.filter(s => s.start_date <= iso && iso <= s.end_date)
    const dayLegs = legs.filter(l => l.date === iso || l.arrive_date === iso)
    const dayPlaces = places
      .filter(p => p.date === iso)
      .sort((a, b) => timeKey(a).localeCompare(timeKey(b)))
    const inTrip = trip.start_date <= iso && iso <= trip.end_date
    const arriving = dayStays.find(s => s.start_date === iso)

    const col = (offset + d - 1) % 7
    const lines = [
      ...dayLegs.map(l => `${legBadge(l, iso)} ${l.from_name} → ${l.to_name}`),
      ...dayPlaces.map(p => `${p.start_time ? p.start_time.slice(0, 5) + ' ' : ''}${placeEmoji(p)} ${p.name}`),
      ...(arriving ? [arriving.location_name] : []),
    ]
    for (const t of lines) colLen[col] = Math.max(colLen[col], t.length)

    let style: CSSProperties | undefined
    if (dayStays.length === 1) {
      style = { background: dayStays[0].color }
    } else if (dayStays.length >= 2) {
      style = { background: `linear-gradient(135deg, ${dayStays[0].color} 0 50%, ${dayStays[1].color} 50% 100%)` }
    }

    const cls = ['day']
    if (!inTrip && dayStays.length === 0 && dayLegs.length === 0) cls.push('dim')
    if (iso === selectedDate) cls.push('selected')
    if (iso === today) cls.push('today')

    cells.push(
      <button
        key={iso}
        className={cls.join(' ')}
        style={style}
        onClick={() => onSelect(iso)}
        title={dayStays.map(s => s.location_name).join(' → ') || undefined}
      >
        <span className="daynum">{d}</span>
        {(dayLegs.length > 0 || dayPlaces.length > 0) && (
          <span className="day-acts">
            {dayLegs.map(l => (
              <span key={l.id} className="day-act leg">
                {legBadge(l, iso)} {l.from_name} → {l.to_name}
              </span>
            ))}
            {dayPlaces.map(p => (
              <span key={p.id} className="day-act">
                {p.start_time && <span className="day-act-time">{p.start_time.slice(0, 5)}</span>}
                {placeEmoji(p)} {p.name}
              </span>
            ))}
          </span>
        )}
        {arriving && <span className="day-label">{arriving.location_name}</span>}
      </button>,
    )
  }

  // Unequal columns: a column's width grows with its longest line (capped so
  // quiet days keep a usable minimum). ≤14 chars stays at 1fr.
  const template = colLen
    .map(len => `minmax(0, ${Math.min(2.4, Math.max(1, len / 14)).toFixed(2)}fr)`)
    .join(' ')

  return (
    <div className="month card">
      <h2 className="month-title">{monthLabel(year, month)}</h2>
      <div className="grid weekdays" style={{ gridTemplateColumns: template }}>
        {WEEKDAYS.map(w => (
          <div key={w} className={'wd' + (w === 'Sat' || w === 'Sun' ? ' wknd' : '')}>{w}</div>
        ))}
      </div>
      <div className="grid days" style={{ gridTemplateColumns: template }}>{cells}</div>
    </div>
  )
}
