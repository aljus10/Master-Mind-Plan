import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, CalendarDate, Id, Task } from '../../domain/types';
import {
  formatFriendlyDate,
  getMonthViewGrid,
  getTodayDate,
  getWeekViewGrid,
  shiftMonth,
  shiftWeek
} from '../../domain/dates';
import { TaskCard } from '../../components/TaskCard';
import { Modal } from '../../components/Modal';

interface CalendarPlanViewProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const CalendarPlanView: React.FC<CalendarPlanViewProps> = ({ build, onOpenTask }) => {
  const {
    workspace,
    updateBuild,
    addTask,
    moveTaskDate,
    reorderTaskCalendar,
    addMilestone,
    showToast
  } = useWorkspace();

  const calendarView = build.calendarView || 'month';
  const anchorDate = build.calendarAnchorDate || getTodayDate();

  const [expandedDayDate, setExpandedDayDate] = useState<CalendarDate | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<CalendarDate | null | undefined>(undefined);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddMilestoneId, setQuickAddMilestoneId] = useState<Id>('');

  const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);
  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);

  // Month or Week grid calculation
  const grid =
    calendarView === 'month'
      ? getMonthViewGrid(anchorDate)
      : getWeekViewGrid(anchorDate);

  const unscheduledTasks = buildTasks
    .filter(t => !t.plannedDate)
    .sort((a, b) => a.calendarOrder - b.calendarOrder);

  // Navigation handlers
  const handlePrev = () => {
    const newAnchor = calendarView === 'month' ? shiftMonth(anchorDate, -1) : shiftWeek(anchorDate, -1);
    updateBuild(build.id, { calendarAnchorDate: newAnchor });
  };

  const handleNext = () => {
    const newAnchor = calendarView === 'month' ? shiftMonth(anchorDate, 1) : shiftWeek(anchorDate, 1);
    updateBuild(build.id, { calendarAnchorDate: newAnchor });
  };

  const handleToday = () => {
    updateBuild(build.id, { calendarAnchorDate: getTodayDate() });
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  const handleDropOnDay = (e: React.DragEvent, targetDate: CalendarDate) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('task:')) return;
    const taskId = data.slice(5);

    const task = buildTasks.find(t => t.id === taskId);
    if (!task) return;

    moveTaskDate(taskId, targetDate);
  };

  const handleDropOnUnscheduled = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('task:')) return;
    const taskId = data.slice(5);

    moveTaskDate(taskId, null);
  };

  // Quick Add task submission
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    let targetMilestoneId = quickAddMilestoneId;
    if (!targetMilestoneId) {
      if (buildMilestones.length > 0) {
        targetMilestoneId = buildMilestones[0].id;
      } else {
        const newM = addMilestone(build.id, 'First version');
        targetMilestoneId = newM.id;
      }
    }

    addTask(build.id, targetMilestoneId, quickAddTitle.trim(), quickAddDate || null);
    setQuickAddTitle('');
    setQuickAddDate(undefined);
  };

  const openQuickAdd = (targetDate: CalendarDate | null = null) => {
    setQuickAddDate(targetDate);
    if (buildMilestones.length > 0) {
      setQuickAddMilestoneId(buildMilestones[0].id);
    }
  };

  return (
    <>
      <div className="calendar-layout">
        {/* Main Calendar Panel */}
        <section className="calendar-panel" aria-label="Build calendar schedule">
          <div className="calendar-header">
            <h2>{grid.title}</h2>
            <div className="calendar-controls">
              <button
                type="button"
                className="small-control"
                onClick={handlePrev}
                aria-label="Previous period"
              >
                ‹
              </button>
              <button
                type="button"
                className="small-control"
                onClick={handleToday}
                aria-label="Jump to today"
              >
                Today
              </button>
              <button
                type="button"
                className="small-control"
                onClick={handleNext}
                aria-label="Next period"
              >
                ›
              </button>

              <div className="segmented" style={{ marginLeft: 8 }} aria-label="Calendar view format">
                <button
                  type="button"
                  className={calendarView === 'month' ? 'active' : ''}
                  onClick={() => updateBuild(build.id, { calendarView: 'month' })}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={calendarView === 'week' ? 'active' : ''}
                  onClick={() => updateBuild(build.id, { calendarView: 'week' })}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={calendarView === 'agenda' ? 'active' : ''}
                  onClick={() => updateBuild(build.id, { calendarView: 'agenda' })}
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>

          {calendarView === 'agenda' ? (
            <div className="agenda-schedule-view">
              {(() => {
                const scheduledDatesMap = new Map<CalendarDate, Task[]>();
                for (const t of buildTasks) {
                  if (t.plannedDate) {
                    const arr = scheduledDatesMap.get(t.plannedDate) || [];
                    arr.push(t);
                    scheduledDatesMap.set(t.plannedDate, arr);
                  }
                }
                const sortedScheduledDates = Array.from(scheduledDatesMap.keys()).sort();

                if (sortedScheduledDates.length === 0) {
                  return (
                    <div className="empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                      <strong style={{ display: 'block', fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
                        No scheduled steps yet
                      </strong>
                      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
                        Schedule steps on the calendar to see your daily schedule feed here.
                      </p>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => openQuickAdd(getTodayDate())}
                      >
                        ＋ Add step for Today
                      </button>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' }}>
                    {sortedScheduledDates.map(dateStr => {
                      const dateTasks = (scheduledDatesMap.get(dateStr) || []).sort(
                        (a, b) => a.calendarOrder - b.calendarOrder
                      );
                      const isToday = dateStr === getTodayDate();

                      return (
                        <div key={dateStr} className={`agenda-day-card ${isToday ? 'today' : ''}`}>
                          <div className="agenda-day-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="agenda-date-badge">
                                {isToday ? `Today (${formatFriendlyDate(dateStr)})` : formatFriendlyDate(dateStr, true)}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                {dateTasks.length} {dateTasks.length === 1 ? 'step' : 'steps'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              style={{ fontSize: 11, padding: '3px 8px', minHeight: 26 }}
                              onClick={() => openQuickAdd(dateStr)}
                            >
                              ＋ Add
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            {dateTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onOpenTask(task.id)}
                                isCompact={false}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="calendar-scroll">
              <div className={`calendar-grid ${calendarView === 'week' ? 'week-grid' : ''}`}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                  <div key={w} className="weekday">
                    {w}
                  </div>
                ))}

                {grid.days.map(day => {
                  const dayTasks = buildTasks
                    .filter(t => t.plannedDate === day.date)
                    .sort((a, b) => a.calendarOrder - b.calendarOrder);

                  const isMonth = calendarView === 'month';
                  const visibleTasks = isMonth ? dayTasks.slice(0, 3) : dayTasks.slice(0, 4);
                  const extraCount = isMonth ? Math.max(0, dayTasks.length - 3) : Math.max(0, dayTasks.length - 4);

                  return (
                    <div
                      key={day.date}
                      className={`day ${!day.isCurrentMonth ? 'muted' : ''} ${day.isToday ? 'today' : ''}`}
                      data-date={day.date}
                      onClick={() => setExpandedDayDate(day.date)}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDropOnDay(e, day.date)}
                      aria-label={`${day.fullLabel}, ${dayTasks.length} steps planned`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="date-number">{day.dayNumber}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openQuickAdd(day.date);
                          }}
                          title={`Add task for ${day.date}`}
                          style={{
                            fontSize: 12,
                            color: 'var(--muted)',
                            padding: '0 4px',
                            lineHeight: 1
                          }}
                        >
                          ＋
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        {visibleTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onOpenTask(task.id)}
                            isCompact={true}
                          />
                        ))}

                        {extraCount > 0 && (
                          <button
                            type="button"
                            className="secondary"
                            style={{
                              fontSize: 10,
                              padding: '2px 4px',
                              minHeight: 20,
                              width: '100%',
                              color: 'var(--accent)'
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedDayDate(day.date);
                            }}
                          >
                            +{extraCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Unscheduled Stack Tray */}
        <aside
          className="tray"
          data-unscheduled="true"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnUnscheduled}
          aria-label="Unscheduled tasks tray"
        >
          <div className="tray-heading">
            <h3>Unscheduled</h3>
            <span>{unscheduledTasks.length}</span>
          </div>

          <p>
            A stack of steps waiting for a day.
            <br />
            Drag a box onto the calendar.
          </p>

          <div id="unscheduled-stack" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unscheduledTasks.length > 0 ? (
              unscheduledTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onOpenTask(task.id)}
                />
              ))
            ) : (
              <div className="empty-text" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                Every step has a planned date.
              </div>
            )}
          </div>

          <button
            type="button"
            className="add-task"
            onClick={() => openQuickAdd(null)}
          >
            ＋ Add a step
          </button>

          <div className="tray-tip">
            ↔ Move a box to change its planned date.
            <br />
            ↩ Drop it here to unschedule it.
            <br />
            ↗ Click a box to edit details & dates.
          </div>
        </aside>
      </div>

      {/* Legend */}
      <div className="legend">
        <span>
          <i className="status-dot doing" /> In progress
        </span>
        <span>
          <i className="status-dot done" /> Done
        </span>
        <span>
          <i className="status-dot blocked" /> Blocked
        </span>
        <span className="hint">Same steps. List, board, or calendar.</span>
      </div>

      {/* Day Drawer (+N more popup) */}
      {expandedDayDate && (
        <Modal
          isOpen={!!expandedDayDate}
          onClose={() => setExpandedDayDate(null)}
          title={`Steps for ${formatFriendlyDate(expandedDayDate, true)}`}
          maxWidth="440px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buildTasks
              .filter(t => t.plannedDate === expandedDayDate)
              .sort((a, b) => a.calendarOrder - b.calendarOrder)
              .map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onClick={() => {
                    setExpandedDayDate(null);
                    onOpenTask(t.id);
                  }}
                />
              ))}
            <button
              type="button"
              className="primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                const date = expandedDayDate;
                setExpandedDayDate(null);
                openQuickAdd(date);
              }}
            >
              ＋ Add step for this day
            </button>
          </div>
        </Modal>
      )}

      {/* Quick Add Step Dialog */}
      {quickAddDate !== undefined && (
        <Modal
          isOpen={quickAddDate !== undefined}
          onClose={() => setQuickAddDate(undefined)}
          title={quickAddDate ? `Add Step for ${formatFriendlyDate(quickAddDate)}` : 'Add an Unscheduled Step'}
        >
          <form onSubmit={handleQuickAddSubmit}>
            <div>
              <label htmlFor="quick-step-title">Step Title (required)</label>
              <input
                id="quick-step-title"
                type="text"
                required
                maxLength={160}
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                placeholder="What is the next small step?"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="quick-step-milestone">Milestone</label>
              <select
                id="quick-step-milestone"
                value={quickAddMilestoneId}
                onChange={e => setQuickAddMilestoneId(e.target.value)}
              >
                {buildMilestones.length === 0 ? (
                  <option value="">(Will create "First version" milestone)</option>
                ) : (
                  buildMilestones.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setQuickAddDate(undefined)}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={!quickAddTitle.trim()}>
                Add Step
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
