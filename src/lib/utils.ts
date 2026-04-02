/**
 * Returns the day of year (1-365) for a given date.
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * Converts a day of year to a Date object in the current year.
 */
export function dayOfYearToDate(dayOfYear: number, year?: number): Date {
  const y = year ?? new Date().getFullYear()
  const date = new Date(y, 0)
  date.setDate(dayOfYear)
  return date
}

/**
 * Formats a day of year as "MMM D" e.g. "Jan 15"
 */
export function formatDayOfYear(dayOfYear: number, year?: number): string {
  const date = dayOfYearToDate(dayOfYear, year)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Returns the month name for a given day of year.
 */
export function getMonthForDay(dayOfYear: number, year?: number): string {
  const date = dayOfYearToDate(dayOfYear, year)
  return date.toLocaleDateString('en-US', { month: 'long' })
}

/**
 * Get status color for a client based on how far behind/ahead they are.
 */
export function getClientStatus(
  lastCompletedDayOfYear: number | null,
  todayDayOfYear: number
): 'on_track' | 'behind' | 'ahead' | 'not_started' {
  if (lastCompletedDayOfYear === null) {
    return 'not_started'
  }
  const diff = todayDayOfYear - lastCompletedDayOfYear
  if (diff > 30) return 'behind'
  if (diff < -1) return 'ahead'
  return 'on_track'
}

export function statusColor(status: string): string {
  switch (status) {
    case 'on_track':
      return 'bg-green-500'
    case 'behind':
      return 'bg-red-500'
    case 'ahead':
      return 'bg-blue-500'
    case 'not_started':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'on_track':
      return 'On Track'
    case 'behind':
      return 'Behind'
    case 'ahead':
      return 'Ahead'
    case 'not_started':
      return 'Not Started'
    default:
      return 'Unknown'
  }
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Get percentage position on timeline (0-100) for a day of year.
 */
export function getTimelinePosition(dayOfYear: number): number {
  return clamp(((dayOfYear - 1) / 364) * 100, 0, 100)
}
