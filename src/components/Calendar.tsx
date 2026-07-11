import type { CSSProperties } from 'react'
import type { Leg, Stay, Trip } from '../types'
import { modeEmoji } from '../types'
import { mondayIndex, monthLabel, monthsInRange, todayISO, WEEKDAYS } from '../lib/dates'

type Props = {
  trip: Trip
  stays: Stay[]
  legs: Leg[]
  selectedDate: string | null
  onSelect: (iso: string) => void
}

export function Calendar({ trip, stays, legs, selectedDate, onSelect }: Props) {
  const sorted = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
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
      {sorted.length > 0 && (
        <div className="legend">
          {sorted.map(s => (
            <button
              key={s.id}
              className="chip"
              style={{ background: s.color }}
              title={`${s.location_name}: ${s.start_date} → ${s.end_date}`}
              onClick={() => onSelect(s.start_date)}
            >
              {s.location_name}
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
  selectedDate: string | null
  today: string
  onSelect: (iso: string) => void
}

function MonthGrid({ year, month, trip, stays, legs, selectedDate, today, onSelect }: MonthProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = mondayIndex(new Date(year, month, 1))
  const pad2 = (n: number) => String(n).padStart(2, '0')

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(<div key={'pad' + i} className="day pad" />)

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    const dayStays = stays.filter(s => s.start_date <= iso && iso <= s.end_date)
    const dayLegs = legs.filter(l => l.date === iso || l.arrive_date === iso)
    const inTrip = trip.start_date <= iso && iso <= trip.end_date
    const arriving = dayStays.find(s => s.start_date === iso)

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
        {dayLegs.length > 0 && <span className="leg-badge">{legBadge(dayLegs[0], iso)}</span>}
        {arriving && <span className="day-label">{arriving.location_name}</span>}
      </button>,
    )
  }

  return (
    <div className="month card">
      <h2 className="month-title">{monthLabel(year, month)}</h2>
      <div className="grid weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className={'wd' + (w === 'Sat' || w === 'Sun' ? ' wknd' : '')}>{w}</div>
        ))}
      </div>
      <div className="grid days">{cells}</div>
    </div>
  )
}
