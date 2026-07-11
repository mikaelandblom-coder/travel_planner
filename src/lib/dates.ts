// All dates in the app are 'YYYY-MM-DD' strings, interpreted in local time.
// ISO strings compare correctly with < and >, so ranges use plain string comparison.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000)
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`
}

/** Months (year + 0-based month) covering the inclusive ISO range. */
export function monthsInRange(a: string, b: string): { year: number; month: number }[] {
  const start = parseISO(a)
  const end = parseISO(b)
  const out: { year: number; month: number }[] = []
  let y = start.getFullYear()
  let m = start.getMonth()
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    out.push({ year: y, month: m })
    m++
    if (m === 12) { m = 0; y++ }
  }
  return out
}

/** e.g. 'Wed 18 Nov' */
export function fmtShort(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

/** e.g. 'Wednesday · 18 November' */
export function fmtLong(iso: string): string {
  const d = parseISO(iso)
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
  return `${weekday} · ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Monday-first column index (0 = Monday … 6 = Sunday). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}
