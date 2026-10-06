import React from 'react';
import { Task } from '../domain/types';
import { formatFriendlyDate } from '../domain/dates';
import { getTaskBlockerInfo } from '../domain/readiness';
import { useWorkspace } from '../app/WorkspaceContext';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  className?: string;
  isCompact?: boolean;
}

const STATUS_NAMES: Record<string, string> = {
  todo: 'To do',
  doing: 'In progress',
  blocked: 'Blocked',
  done: 'Done'
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, className = '', isCompact = false }) => {
  const { workspace } = useWorkspace();
  const buildTasks = workspace.tasks.filter(t => t.buildId === task.buildId);
  const blockerInfo = getTaskBlockerInfo(task, buildTasks);

  const visualStatus = blockerInfo.isBlocked ? 'blocked' : task.status;
  const statusLabel = STATUS_NAMES[visualStatus] || visualStatus;
  const plannedText = task.plannedDate ? `planned ${formatFriendlyDate(task.plannedDate)}` : 'unscheduled';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', `task:${task.id}`);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(task);
    }
  };

  const subtasksCount = task.subtasks?.length || 0;
  const doneSubtasksCount = task.subtasks?.filter(s => s.done).length || 0;

  return (
    <button
      type="button"
      className={`task-card ${visualStatus} ${className}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(task)}
      onKeyDown={handleKeyDown}
      aria-label={`${task.title}, ${statusLabel}, ${plannedText}. Open for details.`}
      title={`${task.title} (${statusLabel})`}
    >
      <span className="grip" aria-hidden="true">⠿</span>
      <span className="task-title">{task.title}</span>
      <div className="task-meta">
        <span className={`status-dot ${visualStatus}`} />
        <span>{statusLabel}</span>
        {subtasksCount > 0 && (
          <span style={{ color: 'var(--muted)', marginLeft: 4 }}>
            [{doneSubtasksCount}/{subtasksCount}]
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          {task.estimatedMinutes ? `${task.estimatedMinutes}m` : ''}
        </span>
      </div>
    </button>
  );
};
