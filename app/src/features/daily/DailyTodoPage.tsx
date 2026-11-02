import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import { getTodayDate, shiftDays, formatFriendlyDate } from '../../domain/dates';
import { DateSwitcher } from './DateSwitcher';
import { QuickAddTodoBar } from './QuickAddTodoBar';
import { DailyTodoItem } from './DailyTodoItem';
import { DailyHabitsBar } from './DailyHabitsBar';
import { FocusModeModal } from './FocusModeModal';
import { VelocityRhythmBar } from './VelocityRhythmBar';
import { Build, DailyTodo } from '../../domain/types';
import { copyToClipboard, generateDailyStandupMarkdown } from '../../domain/exportMarkdown';

export const DailyTodoPage: React.FC = () => {
  const { workspace, showToast } = useWorkspace();
  const navigate = useNavigate();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [focusTargetTodo, setFocusTargetTodo] = useState<DailyTodo | null>(null);
  const [selectedBuildFilter, setSelectedBuildFilter] = useState<string>('all');

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

  // Unique builds represented in today's tasks
  const buildsWithTasks = Array.from(
    new Set(dateTodos.map(t => t.buildId).filter(Boolean))
  )
    .map(id => workspace.builds.find(b => b.id === id))
    .filter(Boolean) as Build[];

  // Filtered tasks by active blueprint filter
  const displayedTodos = dateTodos.filter(t => {
    if (selectedBuildFilter === 'all') return true;
    if (selectedBuildFilter === 'unassigned') return !t.buildId;
    return t.buildId === selectedBuildFilter;
  });

  const activeFilteredBuild = buildsWithTasks.find(b => b.id === selectedBuildFilter);

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

  const handleStarterAction = (type: 'yap' | 'build' | 'quick') => {
    const textarea = document.querySelector('.quick-add-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    if (type === 'yap') {
      textarea.value = '- [ ] ';
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'quick') {
      textarea.value = 'Review ';
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (type === 'build') {
      const select = document.querySelector('.quick-add-build-select') as HTMLSelectElement | null;
      if (select) {
        select.focus();
      } else {
        textarea.focus();
      }
    }
  };

  const handleCopyStandup = async () => {
    const md = generateDailyStandupMarkdown(
      selectedDate,
      allTodos,
      workspace.dailyHabits || [],
      workspace.builds || []
    );
    const ok = await copyToClipboard(md);
    if (ok) {
      showToast('Daily Standup Markdown copied to clipboard! 📋');
    }
  };

  return (
    <div className="daily-todo-page">
      {/* Top Header & Date Navigation */}
      <header className="daily-todo-header">
        <div className="daily-header-left">
          <div className="daily-title-row">
            <h1 className="daily-page-title">Daily Focus</h1>
            {pendingCount > 0 && (
              <button
                type="button"
                className="daily-focus-mode-btn"
                onClick={() => {
                  setFocusTargetTodo(dateTodos.find(t => !t.completed) || null);
                  setIsFocusModeOpen(true);
                }}
                title="Enter distraction-free Focus Mode on today's priority task"
              >
                <span className="focus-pulse-dot" />
                <span>Focus Mode</span>
              </button>
            )}

            <button
              type="button"
              className="daily-header-tool-btn"
              onClick={handleCopyStandup}
              title="Copy today's standup summary as formatted Markdown"
            >
              📋 Standup
            </button>

            <button
              type="button"
              className="daily-header-tool-btn"
              onClick={() => window.print()}
              title="Print or Save as PDF"
            >
              🖨️ Print
            </button>
          </div>
          <p className="daily-page-subtitle">
            Capture, execute, and conquer your day without friction.
          </p>
        </div>

        <DateSwitcher
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </header>

      {/* 7-Day Completion Momentum */}
      <VelocityRhythmBar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

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

      {/* Recurring Daily Habits / Routines */}
      <DailyHabitsBar selectedDate={selectedDate} />

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
        {/* Blueprint Filter Chips */}
        {buildsWithTasks.length > 0 && (
          <div className="daily-blueprint-filter-bar">
            <span className="blueprint-filter-label">Blueprint Filter:</span>
            <div className="daily-blueprint-chips">
              <button
                type="button"
                className={`blueprint-filter-chip ${selectedBuildFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedBuildFilter('all')}
              >
                All ({dateTodos.length})
              </button>
              {buildsWithTasks.map(b => {
                const bCount = dateTodos.filter(t => t.buildId === b.id).length;
                const bDone = dateTodos.filter(t => t.buildId === b.id && t.completed).length;
                return (
                  <button
                    key={b.id}
                    type="button"
                    className={`blueprint-filter-chip ${selectedBuildFilter === b.id ? 'active' : ''}`}
                    onClick={() => setSelectedBuildFilter(selectedBuildFilter === b.id ? 'all' : b.id)}
                  >
                    <span className="chip-mark">🏗️</span>
                    <span>{b.title}</span>
                    <span className="chip-count tabular-nums">{bDone}/{bCount}</span>
                  </button>
                );
              })}
              {dateTodos.some(t => !t.buildId) && (
                <button
                  type="button"
                  className={`blueprint-filter-chip ${selectedBuildFilter === 'unassigned' ? 'active' : ''}`}
                  onClick={() => setSelectedBuildFilter(selectedBuildFilter === 'unassigned' ? 'all' : 'unassigned')}
                >
                  General
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Blueprint Context Card */}
        {activeFilteredBuild && (
          <div className="blueprint-focus-banner">
            <div className="blueprint-banner-left">
              <span className="banner-badge">BLUEPRINT SCOPE</span>
              <strong className="banner-title">{activeFilteredBuild.title}</strong>
            </div>
            <button
              type="button"
              className="banner-jump-link"
              onClick={() => navigate(`/builds/${activeFilteredBuild.id}/plan`)}
            >
              Open Plan Breakdown →
            </button>
          </div>
        )}

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
            <div className="daily-starter-pills">
              <button
                type="button"
                className="daily-starter-pill"
                onClick={() => handleStarterAction('yap')}
              >
                <svg viewBox="0 0 24 24" className="pill-icon">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span>Voice yap / Paste notes</span>
              </button>
              <button
                type="button"
                className="daily-starter-pill"
                onClick={() => handleStarterAction('build')}
              >
                <svg viewBox="0 0 24 24" className="pill-icon">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>Link to a Build</span>
              </button>
              <button
                type="button"
                className="daily-starter-pill"
                onClick={() => handleStarterAction('quick')}
              >
                <svg viewBox="0 0 24 24" className="pill-icon">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>5-min quick task</span>
              </button>
            </div>
          </div>
        ) : displayedTodos.length === 0 ? (
          <div className="daily-empty-filter-state">
            <p>No actions tagged for this blueprint on {formatFriendlyDate(selectedDate)}.</p>
            <button
              type="button"
              className="daily-filter-clear-btn"
              onClick={() => setSelectedBuildFilter('all')}
            >
              Clear filter & view all
            </button>
          </div>
        ) : (
          <div className="daily-tasks-list">
            {displayedTodos.map(todo => (
              <DailyTodoItem
                key={todo.id}
                todo={todo}
                onFocus={(t) => {
                  setFocusTargetTodo(t);
                  setIsFocusModeOpen(true);
                }}
              />
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
                      <DailyTodoItem
                        key={t.id}
                        todo={t}
                        onFocus={(focusedTask) => {
                          setFocusTargetTodo(focusedTask);
                          setIsFocusModeOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Focus Mode Overlay Modal */}
      <FocusModeModal
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        activeTodo={focusTargetTodo}
        allDayTodos={dateTodos}
        onSelectTodo={(t) => setFocusTargetTodo(t)}
      />
    </div>
  );
};
