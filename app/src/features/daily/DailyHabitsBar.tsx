import React, { useState } from 'react';
import { CalendarDate, DailyHabit } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import { getTodayDate, shiftDays } from '../../domain/dates';

interface DailyHabitsBarProps {
  selectedDate: CalendarDate;
}

export const DailyHabitsBar: React.FC<DailyHabitsBarProps> = ({ selectedDate }) => {
  const { workspace, toggleDailyHabit, addDailyHabit, deleteDailyHabit } = useWorkspace();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const habits = workspace.dailyHabits || [];
  const today = getTodayDate();

  // Calculate streak for a habit (consecutive days leading up to today)
  const calculateStreak = (habit: DailyHabit): number => {
    const datesSet = new Set(habit.completedDates || []);
    let streak = 0;
    let checkDate = today;

    // If today is not checked yet, start checking from yesterday so streak doesn't break mid-day
    if (!datesSet.has(checkDate)) {
      checkDate = shiftDays(today, -1);
    }

    while (datesSet.has(checkDate)) {
      streak++;
      checkDate = shiftDays(checkDate, -1);
      if (streak > 365) break; // safety guard
    }
    return streak;
  };

  const handleToggle = (habitId: string) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12);
    }
    toggleDailyHabit(habitId, selectedDate);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addDailyHabit(newTitle.trim());
    setNewTitle('');
    setIsAdding(false);
  };

  const handleInitDefaultHabits = () => {
    addDailyHabit('🌅 Morning review & plan');
    addDailyHabit('⚡ Focus on The One Thing');
    addDailyHabit('🌙 Evening shutdown & log');
  };

  const completedTodayCount = habits.filter(h => (h.completedDates || []).includes(selectedDate)).length;
  const allCompleted = habits.length > 0 && completedTodayCount === habits.length;

  return (
    <section className="daily-habits-section" aria-label="Recurring Daily Routines">
      <div className="daily-habits-header">
        <button
          type="button"
          className="daily-habits-toggle-btn"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
        >
          <svg viewBox="0 0 24 24" className={`habits-chevron ${isExpanded ? 'expanded' : ''}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="habits-title">Daily Routines</span>
          {habits.length > 0 && (
            <span className="habits-count-badge tabular-nums">
              {completedTodayCount}/{habits.length}
            </span>
          )}
          {allCompleted && (
            <span className="habits-all-done-pill">✓ Done for today</span>
          )}
        </button>

        <div className="habits-header-actions">
          {habits.length > 0 && !isAdding && (
            <button
              type="button"
              className="habits-add-trigger-btn"
              onClick={() => setIsAdding(true)}
              title="Add a new recurring routine"
            >
              + Add routine
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="daily-habits-body">
          {habits.length === 0 ? (
            <div className="habits-empty-banner">
              <span className="habits-empty-text">
                Recurring routines reset each morning without cluttering your to-do backlog.
              </span>
              <button
                type="button"
                className="habits-init-btn"
                onClick={handleInitDefaultHabits}
              >
                + Initialize Daily Routines
              </button>
            </div>
          ) : (
            <div className="daily-habits-grid">
              {habits.map(habit => {
                const isChecked = (habit.completedDates || []).includes(selectedDate);
                const streak = calculateStreak(habit);

                return (
                  <div
                    key={habit.id}
                    className={`habit-card ${isChecked ? 'completed' : ''}`}
                    onClick={() => handleToggle(habit.id)}
                  >
                    <div className="habit-checkbox-wrapper">
                      <div className={`habit-checkbox ${isChecked ? 'checked' : ''}`}>
                        {isChecked && (
                          <svg viewBox="0 0 24 24" className="habit-check-svg">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="habit-info">
                      <span className="habit-title">{habit.title}</span>
                      {streak > 1 && (
                        <span className="habit-streak-pill tabular-nums">
                          🔥 {streak}d streak
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="habit-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDailyHabit(habit.id);
                      }}
                      title="Remove routine"
                      aria-label="Remove routine"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {isAdding && (
            <form onSubmit={handleAddHabit} className="habit-add-form">
              <input
                type="text"
                className="habit-add-input"
                placeholder="e.g., 20-min deep reading, Sync with Jules..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
              <button type="submit" className="habit-save-btn">
                Add
              </button>
              <button
                type="button"
                className="habit-cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
