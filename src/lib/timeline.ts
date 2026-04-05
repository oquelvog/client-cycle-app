export const PIXELS_PER_DAY = 4;
export const WINDOW_DAYS_BACK = 182;
export const WINDOW_DAYS_FORWARD = 183;

/** Returns today at midnight */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Day 1 = Jan 1, Day 365 = Dec 31 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** Convert a dayOfYear (1-365) in a given year to a Date */
export function dayOfYearToDate(day: number, year: number): Date {
  const d = new Date(year, 0, 1);
  d.setDate(day);
  return d;
}

export interface WindowBounds {
  windowStart: Date;
  windowEnd: Date;
  totalPx: number;
}

export function getWindowBounds(): WindowBounds {
  const t = today();
  const windowStart = new Date(t);
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS_BACK);
  const windowEnd = new Date(t);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS_FORWARD);
  const totalPx = (WINDOW_DAYS_BACK + WINDOW_DAYS_FORWARD) * PIXELS_PER_DAY;
  return { windowStart, windowEnd, totalPx };
}

/** Returns the top offset in pixels for a given date within the rolling window */
export function dateToPx(date: Date, windowStart: Date): number {
  const diffMs = date.getTime() - windowStart.getTime();
  const diffDays = diffMs / 86_400_000;
  return Math.round(diffDays * PIXELS_PER_DAY);
}

export interface MilestonePosition {
  topPx: number;
  heightPx: number;
  year: number;
}

/**
 * Find the best occurrence of a milestone within the rolling window.
 * Checks up to 4 consecutive years to handle year boundaries.
 * Returns null if no occurrence falls within the window.
 */
export function getMilestonePosition(
  dayOfYear: number,
  endDayOfYear: number,
  durationType: "specific_date" | "month" | "quarter",
  windowStart: Date,
  windowEnd: Date
): MilestonePosition | null {
  const startYear = windowStart.getFullYear() - 1;

  for (let yearOffset = 0; yearOffset <= 3; yearOffset++) {
    const year = startYear + yearOffset;
    const milestoneStart = dayOfYearToDate(dayOfYear, year);
    const milestoneEnd = dayOfYearToDate(endDayOfYear, year);

    // Check if any part of the milestone overlaps the window
    if (milestoneEnd < windowStart || milestoneStart > windowEnd) continue;

    const topPx = dateToPx(milestoneStart, windowStart);
    let heightPx: number;

    if (durationType === "specific_date") {
      heightPx = 44;
    } else if (durationType === "month") {
      heightPx = Math.max(44, 30 * PIXELS_PER_DAY);
    } else {
      // quarter
      heightPx = Math.max(44, 91 * PIXELS_PER_DAY);
    }

    return { topPx, heightPx, year };
  }

  return null;
}

/** Get the most recent past occurrence of a milestone */
export function getMostRecentPastOccurrence(dayOfYear: number): Date {
  const t = today();
  const currentDoy = getDayOfYear(t);

  if (dayOfYear <= currentDoy) {
    return dayOfYearToDate(dayOfYear, t.getFullYear());
  } else {
    return dayOfYearToDate(dayOfYear, t.getFullYear() - 1);
  }
}

/** Returns true if the most recent past occurrence was more than 182 days ago */
export function isNeedsAttention(dayOfYear: number): boolean {
  const past = getMostRecentPastOccurrence(dayOfYear);
  const diffMs = today().getTime() - past.getTime();
  const diffDays = diffMs / 86_400_000;
  return diffDays > 182;
}

/** Generate month bands for the rolling window */
export interface MonthBand {
  label: string;
  topPx: number;
  heightPx: number;
  isAlternate: boolean;
}

export function getMonthBands(windowStart: Date, windowEnd: Date): MonthBand[] {
  const bands: MonthBand[] = [];
  const cursor = new Date(windowStart);
  cursor.setDate(1); // Start of the current month

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let index = 0;
  while (cursor <= windowEnd) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

    const visibleStart = monthStart < windowStart ? windowStart : monthStart;
    const visibleEnd = monthEnd > windowEnd ? windowEnd : monthEnd;

    if (visibleStart <= visibleEnd) {
      const topPx = dateToPx(visibleStart, windowStart);
      const bottomPx = dateToPx(visibleEnd, windowStart);
      bands.push({
        label: `${months[cursor.getMonth()]} ${cursor.getFullYear()}`,
        topPx,
        heightPx: bottomPx - topPx + PIXELS_PER_DAY,
        isAlternate: index % 2 === 1,
      });
      index++;
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return bands;
}

/** Current calendar year */
export function currentYear(): number {
  return new Date().getFullYear();
}
