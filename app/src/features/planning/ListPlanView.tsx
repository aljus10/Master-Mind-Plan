import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, Id, Milestone } from '../../domain/types';
import { formatFriendlyDate } from '../../domain/dates';
import { StatusChip } from '../../components/StatusChip';
import { Modal } from '../../components/Modal';

interface ListPlanViewProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const ListPlanView: React.FC<ListPlanViewProps> = ({ build, onOpenTask }) => {
  const {
    workspace,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    moveMilestone,
    addTask,
    updateTask,
    reorderTaskMilestone,
    moveTaskStatus
  } = useWorkspace();

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneOutcome, setNewMilestoneOutcome] = useState('');
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);

  const [activeNewTaskMilestoneId, setActiveNewTaskMilestoneId] = useState<Id | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [deleteModalMilestone, setDeleteModalMilestone] = useState<Milestone | null>(null);
  const [targetMoveMilestoneId, setTargetMoveMilestoneId] = useState<Id>('');

  const buildMilestones = workspace.milestones
    .filter(m => m.buildId === build.id)
    .sort((a, b) => a.order - b.order);

  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    addMilestone(build.id, newMilestoneTitle.trim(), newMilestoneOutcome.trim());
    setNewMilestoneTitle('');
    setNewMilestoneOutcome('');
    setIsAddMilestoneOpen(false);
  };

  const handleAddTaskSubmit = (e: React.FormEvent, milestoneId: Id) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(build.id, milestoneId, newTaskTitle.trim());
    setNewTaskTitle('');
    setActiveNewTaskMilestoneId(null);
  };

  const handleToggleTaskDone = (e: React.MouseEvent, taskId: Id, currentStatus: string) => {
    e.stopPropagation();
    const task = buildTasks.find(t => t.id === taskId);
    if (!task) return;

    if (currentStatus === 'done') {
      if (task.subtasks.length > 0 && task.subtasks.every(s => s.done)) {
        if (window.confirm('Reopen all smaller steps too?')) {
          moveTaskStatus(taskId, 'todo', undefined, true);
        }
        return;
      }
      moveTaskStatus(taskId, 'todo');
    } else {
      if (task.subtasks.length > 0 && task.subtasks.some(s => !s.done)) {
        if (window.confirm('Complete all smaller steps too?')) {
          const res = moveTaskStatus(taskId, 'done', undefined, true);
          if (!res.success) alert(res.reason);
        }
        return;
      }
      const res = moveTaskStatus(taskId, 'done');
      if (!res.success) {
        alert(res.reason);
      }
    }
  };

  return (
    <div className="list-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0 }}>Milestones & Breakdown</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            Group your tasks into logical outcomes.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => setIsAddMilestoneOpen(true)}
        >
          ＋ Add Milestone
        </button>
      </div>

      {buildMilestones.length === 0 ? (
        <div className="empty-state">
          <h3>No milestones yet</h3>
          <p>Create your first milestone to start breaking down the work.</p>
          <button
            type="button"
            className="primary"
            onClick={() => setIsAddMilestoneOpen(true)}
          >
            Add first milestone
          </button>
        </div>
      ) : (
        buildMilestones.map((milestone, mIdx) => {
          const mTasks = buildTasks
            .filter(t => t.milestoneId === milestone.id)
            .sort((a, b) => a.order - b.order);

          const doneCount = mTasks.filter(t => t.status === 'done').length;

          return (
            <section key={milestone.id} className="milestone">
              <div className="milestone-header">
                <div>
                  <button
                    type="button"
                    style={{ padding: '0 4px', color: 'var(--muted)', fontSize: 12 }}
                    disabled={mIdx === 0}
                    onClick={() => moveMilestone(milestone.id, 'up')}
                    title="Move milestone up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    style={{ padding: '0 4px', color: 'var(--muted)', fontSize: 12 }}
                    disabled={mIdx === buildMilestones.length - 1}
                    onClick={() => moveMilestone(milestone.id, 'down')}
                    title="Move milestone down"
                  >
                    ↓
                  </button>
                </div>

                <h3>
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={e => updateMilestone(milestone.id, { title: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 15,
                      color: 'var(--text)',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </h3>

                <span className="outcome">
                  <input
                    type="text"
                    value={milestone.outcome}
                    placeholder="Intended outcome..."
                    onChange={e => updateMilestone(milestone.id, { outcome: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 12,
                      color: 'var(--muted)',
                      outline: 'none',
                      minWidth: 200
                    }}
                  />
                </span>

                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {doneCount} / {mTasks.length} tasks
                </span>

                <button
                  type="button"
                  style={{ color: 'var(--muted)', padding: '0 6px', fontSize: 13 }}
                  onClick={() => setDeleteModalMilestone(milestone)}
                  title="Delete milestone"
                >
                  ✕
                </button>
              </div>

              <div className="milestone-tasks">
                {mTasks.map((task, tIdx) => (
                  <div
                    key={task.id}
                    className="list-row"
                    onClick={() => onOpenTask(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onOpenTask(task.id);
                    }}
                  >
                    <button
                      type="button"
                      className={`completion-btn ${task.status === 'done' ? 'checked' : ''}`}
                      onClick={e => handleToggleTaskDone(e, task.id, task.status)}
                      aria-label={task.status === 'done' ? 'Mark not done' : 'Mark done'}
                    >
                      {task.status === 'done' ? '✓' : ''}
                    </button>

                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        type="button"
                        style={{ padding: '0 2px', color: 'var(--muted)', fontSize: 11 }}
                        disabled={tIdx === 0}
                        onClick={e => {
                          e.stopPropagation();
                          reorderTaskMilestone(task.id, 'up');
                        }}
                        title="Move task up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={{ padding: '0 2px', color: 'var(--muted)', fontSize: 11 }}
                        disabled={tIdx === mTasks.length - 1}
                        onClick={e => {
                          e.stopPropagation();
                          reorderTaskMilestone(task.id, 'down');
                        }}
                        title="Move task down"
                      >
                        ↓
                      </button>
                    </div>

                    <strong style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                      {task.title}
                      {task.subtasks.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, fontWeight: 'normal' }}>
                          ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length} steps)
                        </span>
                      )}
                    </strong>

                    <small style={{ color: task.plannedDate ? 'var(--secondary)' : 'var(--muted)' }}>
                      {task.plannedDate ? `📅 ${formatFriendlyDate(task.plannedDate)}` : 'Unscheduled'}
                    </small>

                    <small>{task.estimatedMinutes ? `${task.estimatedMinutes}m` : ''}</small>

                    <StatusChip status={task.status} type="task" />
                  </div>
                ))}

                {/* Add Task within Milestone */}
                {activeNewTaskMilestoneId === milestone.id ? (
                  <form
                    onSubmit={e => handleAddTaskSubmit(e, milestone.id)}
                    style={{ display: 'flex', gap: 8, padding: '10px 6px' }}
                  >
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text)',
                        fontSize: 13
                      }}
                    />
                    <button type="submit" className="primary" style={{ minHeight: 32, fontSize: 12 }}>
                      Add Task
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      style={{ minHeight: 32, fontSize: 12 }}
                      onClick={() => setActiveNewTaskMilestoneId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    style={{
                      padding: '8px 10px',
                      color: 'var(--muted)',
                      fontSize: 12,
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onClick={() => {
                      setActiveNewTaskMilestoneId(milestone.id);
                      setNewTaskTitle('');
                    }}
                  >
                    ＋ Add task to {milestone.title}
                  </button>
                )}
              </div>
            </section>
          );
        })
      )}

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        title="Add Milestone"
      >
        <form onSubmit={handleAddMilestoneSubmit}>
          <div>
            <label htmlFor="milestone-title-input">Milestone Title (required)</label>
            <input
              id="milestone-title-input"
              type="text"
              required
              maxLength={160}
              value={newMilestoneTitle}
              onChange={e => setNewMilestoneTitle(e.target.value)}
              placeholder="e.g. Shape first version, Design check-in, Working prototype..."
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="milestone-outcome-input">Expected Outcome (optional)</label>
            <input
              id="milestone-outcome-input"
              type="text"
              maxLength={500}
              value={newMilestoneOutcome}
              onChange={e => setNewMilestoneOutcome(e.target.value)}
              placeholder="e.g. A clear set of initial screens ready to test"
            />
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setIsAddMilestoneOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!newMilestoneTitle.trim()}>
              Create Milestone
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Milestone Modal with Move / Delete choice */}
      {deleteModalMilestone && (
        <Modal
          isOpen={!!deleteModalMilestone}
          onClose={() => setDeleteModalMilestone(null)}
          title={`Delete Milestone "${deleteModalMilestone.title}"`}
        >
          {(() => {
            const containedTasks = buildTasks.filter(t => t.milestoneId === deleteModalMilestone.id);
            const otherMilestones = buildMilestones.filter(m => m.id !== deleteModalMilestone.id);

            return (
              <div>
                <p>
                  This milestone contains <strong>{containedTasks.length} task(s)</strong>.
                </p>

                {containedTasks.length > 0 && otherMilestones.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="move-milestone-select">
                      Move contained tasks to another milestone:
                    </label>
                    <select
                      id="move-milestone-select"
                      value={targetMoveMilestoneId}
                      onChange={e => setTargetMoveMilestoneId(e.target.value)}
                    >
                      <option value="">(Select target milestone)</option>
                      {otherMilestones.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setDeleteModalMilestone(null)}
                  >
                    Cancel
                  </button>

                  {containedTasks.length > 0 && otherMilestones.length > 0 && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={!targetMoveMilestoneId}
                      onClick={() => {
                        deleteMilestone(deleteModalMilestone.id, 'move', targetMoveMilestoneId);
                        setDeleteModalMilestone(null);
                      }}
                    >
                      Move Tasks & Delete Milestone
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      deleteMilestone(deleteModalMilestone.id, 'delete');
                      setDeleteModalMilestone(null);
                    }}
                  >
                    {containedTasks.length > 0 ? 'Delete All Tasks & Milestone' : 'Delete Milestone'}
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
