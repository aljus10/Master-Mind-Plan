import React from 'react';
import { CalendarDate } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import { getTodayDate, shiftDays, formatFriendlyDate } from '../../domain/dates';

interface VelocityRhythmBarProps {
  selectedDate: CalendarDate;
  onSelectDate: (date: CalendarDate) => void;
}

export const VelocityRhythmBar: React.FC<VelocityRhythmBarProps> = ({
  selectedDate,
  onSelectDate
}) => {
  const { workspace } = useWorkspace();
  const today = getTodayDate();

  // Generate last 7 days ending at today
  const last7Days: CalendarDate[] = [];
  for (let i = 6; i >= 0; i--) {
    last7Days.push(shiftDays(today, -i));
  }

  // Count completions per day
  const todos = workspace.dailyTodos || [];
  const habits = workspace.dailyHabits || [];

  const dayStats = last7Days.map(date => {
    // Tasks marked completed with completedAt on this date or date matching
    const completedTasks = todos.filter(t => {
      if (!t.completed) return false;
      if (t.completedAt) {
        return t.completedAt.startsWith(date);
      }
      return t.date === date;
    }).length;

    // Habits completed on this date
    const completedHabits = habits.filter(h => (h.completedDates || []).includes(date)).length;
    const totalCompletions = completedTasks + completedHabits;

    const dayName = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });

    return {
      date,
      dayName,
      completedTasks,
      completedHabits,
      totalCompletions
    };
  });

  const maxCompletions = Math.max(1, ...dayStats.map(d => d.totalCompletions));
  const totalWeekCompletions = dayStats.reduce((sum, d) => sum + d.totalCompletions, 0);

  return (
    <div className="velocity-rhythm-container" aria-label="7-day completion velocity">
      <div className="velocity-header">
        <div className="velocity-title-wrapper">
          <svg viewBox="0 0 24 24" className="velocity-icon">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="velocity-title">7-Day Momentum</span>
        </div>
        <span className="velocity-stat tabular-nums">
          <strong>{totalWeekCompletions}</strong> completed this week
        </span>
      </div>

      <div className="velocity-bars-row">
        {dayStats.map(stat => {
          const heightPercent = stat.totalCompletions > 0
            ? Math.max(16, Math.round((stat.totalCompletions / maxCompletions) * 100))
            : 8;
          const isSelected = stat.date === selectedDate;
          const isToday = stat.date === today;

          return (
            <button
              key={stat.date}
              type="button"
              className={`velocity-bar-col ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onSelectDate(stat.date)}
              title={`${formatFriendlyDate(stat.date)}: ${stat.totalCompletions} completions (${stat.completedTasks} tasks, ${stat.completedHabits} routines)`}
            >
              <div className="velocity-bar-track">
                <div
                  className="velocity-bar-fill"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="velocity-bar-count tabular-nums">
                {stat.totalCompletions > 0 ? stat.totalCompletions : '·'}
              </span>
              <span className="velocity-bar-day">{stat.dayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
