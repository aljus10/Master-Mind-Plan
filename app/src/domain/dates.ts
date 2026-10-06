import { CalendarDate } from './types';

/**
 * Returns today's date formatted as YYYY-MM-DD in local system time.
 */
export function getTodayDate(): CalendarDate {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object (set to noon to avoid any daylight saving edge cases).
 */
export function parseCalendarDate(str: CalendarDate): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD using local time.
 */
export function formatCalendarDate(d: Date): CalendarDate {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD to friendly human label, e.g. "Oct 5" or "Oct 5, 2026".
 */
export function formatFriendlyDate(dateStr: CalendarDate, includeYear = false): string {
  if (!dateStr) return '';
  const date = parseCalendarDate(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {})
  };
  return date.toLocaleDateString(undefined, options);
}

/**
 * Formats a month and year label, e.g. "October 2026".
 */
export function formatMonthYearLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Monday-first day-of-week index: Monday = 0, Tuesday = 1, ..., Sunday = 6.
 */
export function getMondayFirstDayOfWeek(date: Date): number {
  const day = date.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6
  return (day + 6) % 7;
}

export interface CalendarDayInfo {
  date: CalendarDate;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  fullLabel: string;
}

/**
 * Builds the array of days for a Month view grid (Monday-first, complete weeks).
 */
export function getMonthViewGrid(anchorDateStr: CalendarDate): {
  days: CalendarDayInfo[];
  title: string;
  year: number;
  month: number;
} {
  const anchor = parseCalendarDate(anchorDateStr);
  const year = anchor.getFullYear();
  const month = anchor.getMonth(); // 0-indexed

  // First day of target month
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0, 0);
  const startDayOfWeek = getMondayFirstDayOfWeek(firstOfMonth);

  // Number of days in target month
  const lastOfMonth = new Date(year, month + 1, 0, 12, 0, 0, 0);
  const daysInMonth = lastOfMonth.getDate();

  // Grid start date: Monday of the first week
  const startDate = new Date(year, month, 1 - startDayOfWeek, 12, 0, 0, 0);

  // Calculate total cells needed in multiples of 7
  const totalDays = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

  const todayStr = getTodayDate();
  const days: CalendarDayInfo[] = [];

  for (let i = 0; i < totalDays; i++) {
    const curDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 12, 0, 0, 0);
    const dateStr = formatCalendarDate(curDate);
    const isCurrentMonth = curDate.getMonth() === month && curDate.getFullYear() === year;

    days.push({
      date: dateStr,
      dayNumber: curDate.getDate(),
      isCurrentMonth,
      isToday: dateStr === todayStr,
      fullLabel: curDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    });
  }

  return {
    days,
    title: formatMonthYearLabel(anchor),
    year,
    month
  };
}

/**
 * Builds the array of 7 days for a Week view grid (Monday to Sunday) containing anchor date.
 */
export function getWeekViewGrid(anchorDateStr: CalendarDate): {
  days: CalendarDayInfo[];
  title: string;
} {
  const anchor = parseCalendarDate(anchorDateStr);
  const dayOfWeek = getMondayFirstDayOfWeek(anchor);
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - dayOfWeek, 12, 0, 0, 0);

  const todayStr = getTodayDate();
  const days: CalendarDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0, 0);
    const dateStr = formatCalendarDate(curDate);

    days.push({
      date: dateStr,
      dayNumber: curDate.getDate(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      fullLabel: curDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    });
  }

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0, 0);
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const sameMonth = monday.getMonth() === sunday.getMonth();

  let title = '';
  if (sameYear && sameMonth) {
    title = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  } else if (sameYear) {
    title = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${sunday.getFullYear()}`;
  } else {
    title = `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return { days, title };
}

/**
 * Shifts anchor date by 1 month forward or backward.
 */
export function shiftMonth(anchorDateStr: CalendarDate, delta: number): CalendarDate {
  const anchor = parseCalendarDate(anchorDateStr);
  // Using day 1 to avoid day overflow when shifting between 31 and 30/28 day months
  const newDate = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1, 12, 0, 0, 0);
  return formatCalendarDate(newDate);
}

/**
 * Shifts anchor date by 7 days forward or backward.
 */
export function shiftWeek(anchorDateStr: CalendarDate, delta: number): CalendarDate {
  const anchor = parseCalendarDate(anchorDateStr);
  const newDate = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + (delta * 7), 12, 0, 0, 0);
  return formatCalendarDate(newDate);
}
