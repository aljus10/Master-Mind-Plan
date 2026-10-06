import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, Id, Task, TaskStatus } from '../../domain/types';
import { TaskCard } from '../../components/TaskCard';
import { Modal } from '../../components/Modal';

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' }
];

interface BoardPlanViewProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const BoardPlanView: React.FC<BoardPlanViewProps> = ({ build, onOpenTask }) => {
  const { workspace, moveTaskStatus, addTask, addMilestone } = useWorkspace();

  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [blockingPromptTask, setBlockingPromptTask] = useState<Task | null>(null);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');

  const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);
  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);

  const filteredTasks = buildTasks.filter(t => {
    if (milestoneFilter !== 'all' && t.milestoneId !== milestoneFilter) return false;
    return true;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  const handleDropOnStatus = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('task:')) return;
    const taskId = data.slice(5);

    const task = buildTasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;

    if (targetStatus === 'blocked') {
      setBlockingPromptTask(task);
      setBlockerReasonInput('');
      return;
    }

    if (targetStatus === 'done' && task.subtasks.some(s => !s.done)) {
      if (window.confirm('Complete all smaller subtasks too?')) {
        const res = moveTaskStatus(taskId, 'done', undefined, true);
        if (!res.success) alert(res.reason);
      }
      return;
    }

    if ((targetStatus === 'todo' || targetStatus === 'doing') && task.subtasks.length > 0 && task.subtasks.every(s => s.done)) {
      if (window.confirm('Reopen all smaller subtasks?')) {
        const res = moveTaskStatus(taskId, targetStatus, undefined, true);
        if (!res.success) alert(res.reason);
      }
      return;
    }

    const res = moveTaskStatus(taskId, targetStatus);
    if (!res.success) {
      alert(res.reason);
    }
  };

  const handleConfirmBlocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingPromptTask) return;
    moveTaskStatus(blockingPromptTask.id, 'blocked', blockerReasonInput.trim() || 'Blocked');
    setBlockingPromptTask(null);
  };

  return (
    <div>
      {/* Milestone filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor="board-milestone-filter" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Filter by milestone:
          </label>
          <select
            id="board-milestone-filter"
            value={milestoneFilter}
            onChange={e => setMilestoneFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12
            }}
          >
            <option value="all">All milestones ({buildTasks.length})</option>
            {buildMilestones.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} ({buildTasks.filter(t => t.milestoneId === m.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Status columns */}
      <div className="board">
        {STATUS_COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);

          return (
            <section
              key={col.id}
              className="board-column"
              data-status={col.id}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDropOnStatus(e, col.id)}
              aria-label={`${col.label} column, ${colTasks.length} tasks`}
            >
              <h3>
                <span>{col.label}</span>
                <span className="column-count">{colTasks.length}</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onOpenTask(task.id)}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 12,
                      padding: 24,
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 8,
                      marginTop: 8
                    }}
                  >
                    Drag tasks here
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Blocker Reason Dialog */}
      {blockingPromptTask && (
        <Modal
          isOpen={!!blockingPromptTask}
          onClose={() => setBlockingPromptTask(null)}
          title={`Mark "${blockingPromptTask.title}" as Blocked`}
        >
          <form onSubmit={handleConfirmBlocker}>
            <p>What is preventing progress on this step?</p>
            <label htmlFor="blocker-reason-field">Blocker reason</label>
            <input
              id="blocker-reason-field"
              type="text"
              required
              maxLength={1000}
              value={blockerReasonInput}
              onChange={e => setBlockerReasonInput(e.target.value)}
              placeholder="e.g. Waiting for user survey results, missing credentials..."
              autoFocus
            />

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setBlockingPromptTask(null)}
              >
                Cancel
              </button>
              <button type="submit" className="primary">
                Confirm Blocked
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
