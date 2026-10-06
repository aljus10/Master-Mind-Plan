import React from 'react';
import { BuildStatus, TaskStatus } from '../domain/types';

interface StatusChipProps {
  status: BuildStatus | TaskStatus;
  type?: 'build' | 'task';
  showDot?: boolean;
}

const BUILD_STATUS_LABELS: Record<BuildStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed'
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'In progress',
  blocked: 'Blocked',
  done: 'Done'
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, type = 'build', showDot = true }) => {
  const label = type === 'build'
    ? BUILD_STATUS_LABELS[status as BuildStatus] || status
    : TASK_STATUS_LABELS[status as TaskStatus] || status;

  return (
    <span className={`pill ${status}`}>
      {showDot && <span className={`status-dot ${status}`} />}
      {label}
    </span>
  );
};
