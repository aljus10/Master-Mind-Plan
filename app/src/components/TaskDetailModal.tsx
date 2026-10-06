import React, { useState } from 'react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Id, Priority, Task, TaskStatus } from '../domain/types';
import { wouldIntroduceCycle } from '../domain/cycles';
import { getTaskBlockerInfo } from '../domain/readiness';
import { Modal } from './Modal';

interface TaskDetailModalProps {
  taskId: Id | null;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose }) => {
  const {
    workspace,
    updateTask,
    deleteTask,
    moveTaskStatus,
    moveTaskDate,
    moveTaskMilestone,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    moveSubtask,
    setNextAction,
    showToast
  } = useWorkspace();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [cycleError, setCycleError] = useState<string | null>(null);

  if (!taskId) return null;

  const task = workspace.tasks.find(t => t.id === taskId);
  if (!task) return null;

  const build = workspace.builds.find(b => b.id === task.buildId);
  const buildMilestones = workspace.milestones.filter(m => m.buildId === task.buildId);
  const otherBuildTasks = workspace.tasks.filter(t => t.buildId === task.buildId && t.id !== task.id);
  const blockerInfo = getTaskBlockerInfo(task, workspace.tasks.filter(t => t.buildId === task.buildId));

  const isNextAction = build?.nextAction?.taskId === task.id;
  const selectedSubtaskId = isNextAction ? build?.nextAction?.subtaskId : undefined;

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'done' && task.subtasks.some(s => !s.done)) {
      if (window.confirm('Complete all smaller subtasks too?')) {
        const res = moveTaskStatus(task.id, 'done', undefined, true);
        if (!res.success) alert(res.reason);
      }
      return;
    }

    if ((newStatus === 'todo' || newStatus === 'doing') && task.subtasks.length > 0 && task.subtasks.every(s => s.done)) {
      if (window.confirm('Reopen all smaller subtasks?')) {
        const res = moveTaskStatus(task.id, newStatus, undefined, true);
        if (!res.success) alert(res.reason);
      }
      return;
    }

    const res = moveTaskStatus(task.id, newStatus);
    if (!res.success) {
      alert(res.reason);
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleTogglePrerequisite = (prereqId: Id) => {
    const current = task.prerequisiteTaskIds || [];
    let updated: Id[];

    if (current.includes(prereqId)) {
      updated = current.filter(id => id !== prereqId);
      setCycleError(null);
    } else {
      if (wouldIntroduceCycle(workspace.tasks, task.id, prereqId)) {
        setCycleError('Cannot add prerequisite: would create a circular dependency.');
        return;
      }
      setCycleError(null);
      updated = [...current, prereqId];
    }

    updateTask(task.id, { prerequisiteTaskIds: updated }, true);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={!!taskId} onClose={onClose} title="Task Details" maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <div>
          <label htmlFor="task-title-input">Task Title</label>
          <input
            id="task-title-input"
            type="text"
            value={task.title}
            maxLength={160}
            onChange={e => updateTask(task.id, { title: e.target.value })}
            placeholder="What needs to be done?"
          />
        </div>

        {/* Milestone & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="task-milestone-select">Milestone</label>
            <select
              id="task-milestone-select"
              value={task.milestoneId}
              onChange={e => moveTaskMilestone(task.id, e.target.value)}
            >
              {buildMilestones.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-status-select">Status</label>
            <select
              id="task-status-select"
              value={task.status}
              onChange={e => handleStatusChange(e.target.value as TaskStatus)}
            >
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Blocker Notice / Input if blocked */}
        {blockerInfo.isBlocked && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              fontSize: 12,
              color: 'var(--warning)'
            }}
          >
            <strong>Blocker details:</strong> {blockerInfo.summaryReason}
          </div>
        )}

        <div>
          <label htmlFor="task-blocker-input">Blocker reason (optional)</label>
          <input
            id="task-blocker-input"
            type="text"
            value={task.blocker || ''}
            maxLength={1000}
            placeholder="Explain why this step cannot proceed..."
            onChange={e => updateTask(task.id, { blocker: e.target.value })}
          />
        </div>

        {/* Dates: Planned Work Date & Deadline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="task-planned-date">Planned Work Date</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="task-planned-date"
                type="date"
                value={task.plannedDate || ''}
                onChange={e => moveTaskDate(task.id, e.target.value || null)}
              />
              {task.plannedDate && (
                <button
                  type="button"
                  className="secondary"
                  style={{ minHeight: 38, padding: '0 8px', fontSize: 11 }}
                  onClick={() => moveTaskDate(task.id, null)}
                  title="Remove from calendar to Unscheduled tray"
                >
                  Unschedule
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="task-due-date">Deadline (optional)</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="task-due-date"
                type="date"
                value={task.dueDate || ''}
                onChange={e => updateTask(task.id, { dueDate: e.target.value || undefined }, true)}
              />
              {task.dueDate && (
                <button
                  type="button"
                  className="secondary"
                  style={{ minHeight: 38, padding: '0 8px', fontSize: 11 }}
                  onClick={() => updateTask(task.id, { dueDate: undefined }, true)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Priority & Estimated Minutes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="task-priority-select">Priority</label>
            <select
              id="task-priority-select"
              value={task.priority}
              onChange={e => updateTask(task.id, { priority: e.target.value as Priority }, true)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-minutes-input">Estimated Minutes</label>
            <input
              id="task-minutes-input"
              type="number"
              min="0"
              step="5"
              value={task.estimatedMinutes ?? ''}
              onChange={e =>
                updateTask(
                  task.id,
                  { estimatedMinutes: e.target.value ? Number(e.target.value) : undefined },
                  false
                )
              }
              placeholder="e.g. 30"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-desc-input">Description / Notes</label>
          <textarea
            id="task-desc-input"
            value={task.description}
            onChange={e => updateTask(task.id, { description: e.target.value })}
            placeholder="Add context, specifications or links..."
          />
        </div>

        {/* Subtask Breakdown */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Actionable Steps (Subtasks)</strong>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {task.subtasks.filter(s => s.done).length} / {task.subtasks.length} done
            </span>
          </div>

          <div className="subtask-list">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="subtask-row">
                <input
                  type="checkbox"
                  checked={sub.done}
                  aria-label={`Mark step ${sub.title} done`}
                  onChange={e => updateSubtask(task.id, sub.id, { done: e.target.checked })}
                />
                <input
                  type="text"
                  value={sub.title}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    height: 'auto',
                    color: sub.done ? 'var(--muted)' : 'var(--text)',
                    textDecoration: sub.done ? 'line-through' : 'none'
                  }}
                  onChange={e => updateSubtask(task.id, sub.id, { title: e.target.value })}
                />
                <button
                  type="button"
                  style={{ padding: '2px 4px', fontSize: 11, color: 'var(--muted)' }}
                  onClick={() => moveSubtask(task.id, sub.id, 'up')}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  style={{ padding: '2px 4px', fontSize: 11, color: 'var(--muted)' }}
                  onClick={() => moveSubtask(task.id, sub.id, 'down')}
                  title="Move down"
                >
                  ↓
                </button>
                {build && (
                  <button
                    type="button"
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      borderRadius: 4,
                      background: selectedSubtaskId === sub.id ? 'var(--accent)' : 'transparent',
                      color: selectedSubtaskId === sub.id ? '#09090b' : 'var(--muted)',
                      border: '1px solid var(--border)'
                    }}
                    onClick={() => {
                      if (selectedSubtaskId === sub.id) {
                        setNextAction(task.buildId, null);
                      } else {
                        setNextAction(task.buildId, task.id, sub.id);
                      }
                    }}
                    title="Set this specific step as build's next action"
                  >
                    {selectedSubtaskId === sub.id ? 'Next action ✓' : 'Set next'}
                  </button>
                )}
                <button
                  type="button"
                  style={{ padding: '2px 6px', color: 'var(--error)', fontSize: 12 }}
                  onClick={() => deleteSubtask(task.id, sub.id)}
                  title="Delete step"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              placeholder="Add next smaller step..."
              style={{ marginTop: 0 }}
            />
            <button type="submit" className="secondary" style={{ whiteSpace: 'nowrap' }}>
              Add step
            </button>
          </form>
        </div>

        {/* Prerequisites */}
        {otherBuildTasks.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Prerequisites (must be Done before this step can begin)
            </strong>
            {cycleError && (
              <div style={{ color: 'var(--error)', fontSize: 12, marginBottom: 8 }}>{cycleError}</div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 6,
                maxHeight: 140,
                overflowY: 'auto'
              }}
            >
              {otherBuildTasks.map(other => {
                const isSelected = task.prerequisiteTaskIds?.includes(other.id);
                const isDone = other.status === 'done';
                return (
                  <label
                    key={other.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      padding: '4px 8px',
                      background: isSelected ? 'var(--surface-raised)' : 'transparent',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      style={{ width: 'auto', margin: 0 }}
                      onChange={() => handleTogglePrerequisite(other.id)}
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {other.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isDone ? 'var(--success)' : 'var(--muted)'
                      }}
                    >
                      {isDone ? '✓ done' : other.status}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Action Selection */}
        {build && (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <strong style={{ fontSize: 13, display: 'block' }}>Build Next Action</strong>
              <small style={{ color: 'var(--muted)' }}>
                {isNextAction
                  ? 'Currently selected as the primary next action for this build.'
                  : 'Make this the single immediate focus for this build.'}
              </small>
            </div>
            <button
              type="button"
              className={isNextAction ? 'primary' : 'secondary'}
              onClick={() => {
                if (isNextAction) {
                  setNextAction(task.buildId, null);
                } else {
                  setNextAction(task.buildId, task.id);
                }
              }}
            >
              {isNextAction ? 'Clear next action' : 'Set as Next Action'}
            </button>
          </div>
        )}

        {/* Actions Bottom Bar */}
        <div
          className="dialog-actions"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 10 }}
        >
          <button type="button" className="danger-btn" onClick={handleDelete}>
            Delete task
          </button>
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
