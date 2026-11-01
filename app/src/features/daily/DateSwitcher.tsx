import React from 'react';
import { CalendarDate } from '../../domain/types';
import { getTodayDate, parseCalendarDate, shiftDays } from '../../domain/dates';

interface DateSwitcherProps {
  currentDate: CalendarDate;
  onDateChange: (newDate: CalendarDate) => void;
}

export const DateSwitcher: React.FC<DateSwitcherProps> = ({ currentDate, onDateChange }) => {
  const today = getTodayDate();
  const yesterday = shiftDays(today, -1);
  const tomorrow = shiftDays(today, 1);

  const parsed = parseCalendarDate(currentDate);
  const weekday = parsed.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const year = parsed.getFullYear();

  let relativeLabel = '';
  if (currentDate === today) {
    relativeLabel = 'Today';
  } else if (currentDate === yesterday) {
    relativeLabel = 'Yesterday';
  } else if (currentDate === tomorrow) {
    relativeLabel = 'Tomorrow';
  }

  return (
    <div className="daily-date-switcher">
      <div className="daily-date-controls">
        <button
          type="button"
          className="daily-date-nav-btn"
          onClick={() => onDateChange(shiftDays(currentDate, -1))}
          title="Previous day"
          aria-label="Previous day"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="daily-date-badge">
          {relativeLabel && <span className="daily-date-relative">{relativeLabel}</span>}
          <span className="daily-date-main">
            {weekday}, {monthDay} {year !== new Date().getFullYear() ? year : ''}
          </span>
          <input
            type="date"
            className="daily-date-picker-input"
            value={currentDate}
            onChange={e => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            aria-label="Select date"
          />
        </div>

        <button
          type="button"
          className="daily-date-nav-btn"
          onClick={() => onDateChange(shiftDays(currentDate, 1))}
          title="Next day"
          aria-label="Next day"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {currentDate !== today && (
        <button
          type="button"
          className="daily-today-jump-btn"
          onClick={() => onDateChange(today)}
        >
          Jump to Today
        </button>
      )}
    </div>
  );
};
