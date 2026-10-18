import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { City, Leg, Place, Stay, Trip } from '../types'
import { modeEmoji, placeEmoji, timeKey } from '../types'
import { mondayIndex, monthLabel, monthsInRange, todayISO, WEEKDAYS } from '../lib/dates'

type Props = {
  trip: Trip
  stays: Stay[]
  legs: Leg[]
  places: Place[]
  /** The shared city list, for the colour of a day trip's city. */
  cities: City[]
  selectedDate: string | null
  editMode: boolean
  onSelect: (iso: string) => void
  /**
   * Hand-set widths for a month ('YYYY-MM'; null = automatic again) and the
   * planner's width in px (null = standard, undefined = unchanged).
   */
  onSaveColWidths: (month: string, widths: number[] | null, pageWidth?: number | null) => void
  /** The planner's width while a column is being dragged (null = done). */
  onPreviewPageWidth: (px: number | null) => void
}

/**
 * The trip's cities in the order we get to them — one chip per city, even
 * with several visits. Shown in the header as the trip's summary.
 */
export function CityChips({ stays, selectedDate, onSelect }: {
  stays: Stay[]
  selectedDate: string | null
  onSelect: (iso: string) => void
}) {
  const sorted = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const chipGroups: { name: string; color: string; visits: Stay[] }[] = []
  for (const s of sorted) {
    const g = chipGroups.find(x => x.name === s.location_name)
    if (g) g.visits.push(s)
    else chipGroups.push({ name: s.location_name, color: s.color, visits: [s] })
  }
  if (chipGroups.length === 0) return null

  return (
    <div className="legend">
      {chipGroups.map(g => (
        <button
          key={g.name}
          className="chip"
          style={{ background: g.color }}
          title={`${g.name}: ` + g.visits.map(v => `${v.start_date} → ${v.end_date}`).join(', ')}
          onClick={() => {
            // Repeated clicks cycle through this city's visits.
            const i = g.visits.findIndex(v => v.start_date === selectedDate)
            onSelect(g.visits[(i + 1) % g.visits.length].start_date)
          }}
        >
          {g.name}
          {g.visits.length > 1 && <span className="chip-count">×{g.visits.length}</span>}
        </button>
      ))}
    </div>
  )
}

export function Calendar({
  trip, stays, legs, places, cities, selectedDate, editMode, onSelect, onSaveColWidths, onPreviewPageWidth,
}: Props) {
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
  const colorOf = (city: string) =>
    cities.find(c => c.name === city)?.color ?? stays.find(s => s.location_name === city)?.color ?? OTHER_CITY_BG

  return (
    <section className="calendar">
      {months.map(({ year, month }) => (
        <MonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          trip={trip}
          stays={sorted}
          colorOf={colorOf}
          legs={legs}
          places={places}
          selectedDate={selectedDate}
          today={today}
          editMode={editMode}
          onSelect={onSelect}
          onSaveColWidths={onSaveColWidths}
          onPreviewPageWidth={onPreviewPageWidth}
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

// The part of a day the city bands cover; travel outside it is clamped.
const DAY_START = 7 * 60
const DAY_END = 23 * 60
const TRAVEL_BG = '#faf6f0'
const OTHER_CITY_BG = '#efe6da' // a city that's not on the city list

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const dayFrac = (t: string) => Math.min(1, Math.max(0, (minutes(t) - DAY_START) / (DAY_END - DAY_START)))

/**
 * One stretch of a day: time in a city (`leg` null), or on the way between
 * two (`city` null). `from` / `to` are fractions of the day.
 */
type Segment = { color: string | null; city: string | null; leg: Leg | null; from: number; to: number }

/**
 * A day as stacked stretches from morning (top) to evening, each as tall as
 * the time spent there. The day starts where we woke up and each trip moves
 * us on: we leave at its departure time and arrive at its arrival time (the
 * stretch in between is travel). Without times, the day is shared equally.
 * Counted trips are those to one of the day's stays, or out and back again
 * the same day (a day trip) — a one-way trip somewhere else (one of us
 * flying home) doesn't move the planner.
 */
function daySegments(iso: string, dayStays: Stay[], dayLegs: Leg[], colorOf: (city: string) => string): Segment[] {
  if (dayStays.length === 0) return [{ color: null, city: null, leg: null, from: 0, to: 1 }]
  const stay = (city: string, from: number, to: number): Segment => ({ color: colorOf(city), city, leg: null, from, to })
  const stayCities = new Set(dayStays.map(s => s.location_name))
  const moves = dayLegs.filter(l =>
    stayCities.has(l.to_name) || dayLegs.some(o => o !== l && o.from_name === l.to_name))
  if (moves.length === 0) {
    // One city — or several with no travel to go by: share the day equally.
    const n = dayStays.length
    return dayStays.map((s, i) => ({ color: s.color, city: s.location_name, leg: null, from: i / n, to: (i + 1) / n }))
  }

  // Earliest first (a trip that set off yesterday before any); untimed last.
  const setOff = (l: Leg) => (l.date < iso ? '' : l.depart_time ?? '99:99')
  const left = [...moves].sort((a, b) => setOff(a).localeCompare(setOff(b)))
  const segs: Segment[] = []
  let here = dayStays[0].location_name
  let cursor = 0
  for (let i = 1; left.length > 0; i++) {
    // Follow the chain: next, the trip that leaves from where we are.
    const leg = left.splice(Math.max(0, left.findIndex(l => l.from_name === here)), 1)[0]
    const dep = leg.date < iso ? 0 : leg.depart_time ? dayFrac(leg.depart_time) : null
    const arr = (leg.arrive_date ?? leg.date) > iso ? 1 // still travelling at midnight
      : leg.arrive_time ? dayFrac(leg.arrive_time) : null
    const even = i / (moves.length + 1)
    const leave = Math.max(cursor, dep ?? arr ?? even)
    const reach = Math.max(leave, arr ?? dep ?? even)
    segs.push(stay(here, cursor, leave))
    // Kept even when it takes no time: it holds the trip's line.
    segs.push({ color: TRAVEL_BG, city: null, leg, from: leave, to: reach })
    cursor = reach
    here = leg.to_name
  }
  segs.push(stay(here, cursor, 1))
  return segs
}

/**
 * Which stretch an activity belongs in: the one its time falls in; untimed,
 * the first stretch in its city (or the first of the day).
 */
function segmentAt(segs: Segment[], time: string | null, city: string): number {
  if (time) {
    const f = dayFrac(time)
    const i = segs.findIndex(s => s.from <= f && f < s.to)
    return i >= 0 ? i : segs.length - 1
  }
  return Math.max(0, segs.findIndex(s => s.city === city))
}

/** Time shown on a travel line: departure on the way out, arrival on landing day. */
function legTime(leg: Leg, iso: string): string {
  const t = iso === leg.date ? leg.depart_time : leg.arrive_time
  return t ? t.slice(0, 5) : ''
}

type MonthProps = {
  year: number
  month: number // 0-based
  trip: Trip
  stays: Stay[]
  colorOf: (city: string) => string
  legs: Leg[]
  places: Place[]
  selectedDate: string | null
  today: string
  editMode: boolean
  onSelect: (iso: string) => void
  onSaveColWidths: Props['onSaveColWidths']
  onPreviewPageWidth: Props['onPreviewPageWidth']
}

const MIN_COL = 0.4 // narrowest a dragged column gets, in fr
const MIN_PAGE = 480 // narrowest the planner gets, in px

function MonthGrid({
  year, month, trip, stays, colorOf, legs, places, selectedDate, today, editMode, onSelect, onSaveColWidths,
  onPreviewPageWidth,
}: MonthProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = mondayIndex(new Date(year, month, 1))
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const monthKey = `${year}-${pad2(month + 1)}`
  const saved = trip.col_widths[monthKey]

  // Widths while a column edge is being dragged. Kept after letting go until
  // the saved widths come back, so the columns don't jump in between.
  const [dragWidths, setDragWidths] = useState<number[] | null>(null)
  const drag = useRef<{ col: number; x: number; start: number[]; pxPerFr: number; page: number } | null>(null)
  const [dragPage, setDragPage] = useState<number | null>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const savedKey = JSON.stringify(saved ?? null)
  useEffect(() => { setDragWidths(null) }, [savedKey])

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

    // Every line goes in the stretch of the day it happens in.
    const segs = daySegments(iso, dayStays, dayLegs, colorOf)
    const legsIn = segs.map(() => [] as Leg[])
    const placesIn = segs.map(() => [] as Place[])
    for (const l of dayLegs) {
      const moved = segs.findIndex(s => s.leg === l)
      legsIn[moved >= 0 ? moved : segmentAt(segs, iso === l.date ? l.depart_time : l.arrive_time, l.from_name)].push(l)
    }
    for (const p of dayPlaces) {
      const city = stays.find(s => s.id === p.stay_id)?.location_name ?? p.city
      placesIn[segmentAt(segs, p.start_time, city)].push(p)
    }
    // The new city's name sits at the bottom of its stretch.
    const labelAt = arriving
      ? segs.map(s => s.city).lastIndexOf(arriving.location_name)
      : -1
    const planned = trip.planned_days.includes(iso)

    const cls = ['day']
    if (!inTrip && dayStays.length === 0 && dayLegs.length === 0) cls.push('dim')
    if (iso === selectedDate) cls.push('selected')
    if (iso === today) cls.push('today')

    cells.push(
      <button
        key={iso}
        className={cls.join(' ')}
        onClick={() => onSelect(iso)}
        title={dayStays.map(s => s.location_name).join(' → ') || undefined}
      >
        {segs.map((s, i) => {
          const empty = legsIn[i].length === 0 && placesIn[i].length === 0 && i !== labelAt
          // A stretch that takes no time and holds nothing isn't drawn.
          if (i > 0 && empty && s.to <= s.from) return null
          const style: CSSProperties = { flexGrow: s.to - s.from }
          if (s.color) style.background = s.color
          return (
            <span key={i} className={'band' + (s.leg ? ' travel' : '')} style={style}>
              {i === 0 && <span className="daynum">{d}</span>}
              {(legsIn[i].length > 0 || placesIn[i].length > 0) && (
                <span className="day-acts">
                  {legsIn[i].map(l => (
                    <span key={l.id} className="day-act leg">
                      {legTime(l, iso) && <span className="day-act-time">{legTime(l, iso)}</span>}
                      {legBadge(l, iso)} {l.from_name} → {l.to_name}
                    </span>
                  ))}
                  {placesIn[i].map(p => (
                    <span key={p.id} className="day-act">
                      {p.start_time && <span className="day-act-time">{p.start_time.slice(0, 5)}</span>}
                      {placeEmoji(p)} {p.name}
                    </span>
                  ))}
                </span>
              )}
              {i === labelAt && arriving && <span className="day-label">{arriving.location_name}</span>}
            </span>
          )
        })}
        {/* an <i>, so .band:last-of-type still finds the last stretch */}
        {planned && <i className="day-planned" title="Planning done">✓</i>}
      </button>,
    )
  }

  // Unequal columns: a column's width grows with its longest line (capped so
  // quiet days keep a usable minimum). ≤14 chars stays at 1fr. Widths set by
  // hand in edit mode win over that.
  const auto = colLen.map(len => Math.min(2.4, Math.max(1, len / 14)))
  const widths = dragWidths ?? (saved?.length === 7 ? saved : auto)
  const template = widths.map(w => `minmax(0, ${w.toFixed(2)}fr)`).join(' ')

  // Like a spreadsheet: dragging a column's right edge widens just that
  // column and the whole planner grows with it — the other columns keep
  // their size. The planner may grow past the window; the page then
  // scrolls sideways.
  function startDrag(e: PointerEvent<HTMLSpanElement>, col: number) {
    const grid = headRef.current
    const app = grid?.closest<HTMLElement>('.app')
    if (!grid || !app) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0
    const total = widths.reduce((a, b) => a + b, 0)
    drag.current = {
      col, x: e.clientX, start: widths,
      pxPerFr: (grid.clientWidth - 6 * gap) / total,
      page: app.getBoundingClientRect().width,
    }
    setDragWidths(widths)
  }
  function moveDrag(e: PointerEvent<HTMLSpanElement>) {
    const g = drag.current
    if (!g) return
    // Never narrower than MIN_COL, nor than would make the planner tiny.
    const minDx = Math.max((MIN_COL - g.start[g.col]) * g.pxPerFr, MIN_PAGE - g.page)
    const dx = Math.max(minDx, e.clientX - g.x)
    const next = [...g.start]
    next[g.col] = g.start[g.col] + dx / g.pxPerFr
    setDragWidths(next)
    setDragPage(Math.round(g.page + dx))
    onPreviewPageWidth(Math.round(g.page + dx))
  }
  function endDrag() {
    const g = drag.current
    if (!g) return
    drag.current = null
    // A tap on the edge without moving it isn't a choice to pin the widths.
    if (!dragWidths || dragPage === null || dragWidths.every((w, i) => w === g.start[i])) {
      setDragWidths(null)
      setDragPage(null)
      onPreviewPageWidth(null)
      return
    }
    setDragPage(null)
    onSaveColWidths(monthKey, dragWidths.map(w => Math.round(w * 100) / 100), dragPage)
  }

  return (
    <div className="month card">
      <h2 className="month-title">
        {monthLabel(year, month)}
        {editMode && (saved || trip.page_width) && (
          <button
            className="icon-btn month-reset"
            title="Back to automatic column widths and the standard planner width"
            onClick={() => onSaveColWidths(monthKey, null, null)}
          >↺</button>
        )}
      </h2>
      <div ref={headRef} className="grid weekdays" style={{ gridTemplateColumns: template }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={'wd' + (w === 'Sat' || w === 'Sun' ? ' wknd' : '')}>
            {w}
            {editMode && (
              <span
                className="col-handle"
                title="Drag to resize this column — the planner grows or shrinks with it"
                onPointerDown={e => startDrag(e, i)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid days" style={{ gridTemplateColumns: template }}>{cells}</div>
    </div>
  )
}
