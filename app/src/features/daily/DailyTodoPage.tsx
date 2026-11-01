import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { getTodayDate, shiftDays, formatFriendlyDate } from '../../domain/dates';
import { DateSwitcher } from './DateSwitcher';
import { QuickAddTodoBar } from './QuickAddTodoBar';
import { DailyTodoItem } from './DailyTodoItem';

export const DailyTodoPage: React.FC = () => {
  const { workspace } = useWorkspace();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

  const allTodos = workspace.dailyTodos || [];

  // Filter tasks for the selected date
  const dateTodos = allTodos
    .filter(t => t.date === selectedDate)
    .sort((a, b) => {
      // Incomplete tasks first, then completed tasks, maintaining order
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.order - b.order;
    });

  const totalCount = dateTodos.length;
  const completedCount = dateTodos.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Upcoming tasks for dates strictly after today
  const upcomingTodos = allTodos
    .filter(t => t.date > today && !t.completed)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

  // Group upcoming by date
  const upcomingByDate = upcomingTodos.reduce<Record<string, typeof upcomingTodos>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  return (
    <div className="daily-todo-page">
      {/* Top Header & Date Navigation */}
      <header className="daily-todo-header">
        <div className="daily-header-left">
          <h1 className="daily-page-title">Daily Focus</h1>
          <p className="daily-page-subtitle">
            Capture, execute, and conquer your day without friction.
          </p>
        </div>

        <DateSwitcher
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </header>

      {/* Progress Bar & Counter */}
      {totalCount > 0 && (
        <section className="daily-progress-section" aria-label="Day progress">
          <div className="daily-progress-bar-track">
            <div
              className={`daily-progress-bar-fill ${percentComplete === 100 ? 'complete' : ''}`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="daily-progress-text">
            <span>
              {completedCount} of {totalCount} completed ({percentComplete}%)
            </span>
            {percentComplete === 100 && totalCount > 0 && (
              <span className="daily-celebration-pill">🎉 All clear for the day!</span>
            )}
          </div>
        </section>
      )}

      {/* Quick Add Bar */}
      <section className="daily-add-section">
        <QuickAddTodoBar
          currentDate={selectedDate}
          onAdded={() => {
            // Stay on the date where task was added
          }}
        />
      </section>

      {/* Active Daily Tasks List */}
      <section className="daily-tasks-section" aria-label="Tasks list">
        {dateTodos.length === 0 ? (
          <div className="daily-empty-state">
            <div className="daily-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <h3 className="daily-empty-title">
              {selectedDate === today
                ? 'Your day is wide open'
                : `No tasks for ${formatFriendlyDate(selectedDate)}`}
            </h3>
            <p className="daily-empty-desc">
              Add your high-leverage actions above or paste a quick braindump. Unfinished items roll over automatically.
            </p>
          </div>
        ) : (
          <div className="daily-tasks-list">
            {dateTodos.map(todo => (
              <DailyTodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Tasks Drawer / Accordion */}
      {upcomingTodos.length > 0 && selectedDate === today && (
        <section className="daily-upcoming-section">
          <button
            type="button"
            className="daily-upcoming-toggle"
            onClick={() => setIsUpcomingExpanded(prev => !prev)}
            aria-expanded={isUpcomingExpanded}
          >
            <div className="daily-upcoming-toggle-title">
              <svg
                viewBox="0 0 24 24"
                className={`daily-chevron ${isUpcomingExpanded ? 'expanded' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>Upcoming Scheduled Tasks</span>
              <span className="count-badge">{upcomingTodos.length}</span>
            </div>
            <span className="daily-upcoming-preview-text">
              {isUpcomingExpanded ? 'Collapse' : 'Peek ahead'}
            </span>
          </button>

          {isUpcomingExpanded && (
            <div className="daily-upcoming-content">
              {Object.entries(upcomingByDate).map(([date, tasks]) => (
                <div key={date} className="daily-upcoming-group">
                  <div className="daily-upcoming-group-header">
                    <span className="group-date">{formatFriendlyDate(date)}</span>
                    <button
                      type="button"
                      className="group-jump-btn"
                      onClick={() => setSelectedDate(date)}
                    >
                      Go to date →
                    </button>
                  </div>
                  <div className="daily-upcoming-group-items">
                    {tasks.map(t => (
                      <DailyTodoItem key={t.id} todo={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
