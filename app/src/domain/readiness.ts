import { Build, Id, Milestone, Subtask, Task, TaskStatus } from './types';

export interface BlockerInfo {
  isBlocked: boolean;
  manualBlocker: string | null;
  prerequisiteBlockers: Task[]; // tasks that are not done
  summaryReason: string;
}

/**
 * Checks whether a task is blocked either manually or via unfinished prerequisites.
 */
export function getTaskBlockerInfo(task: Task, allBuildTasks: Task[]): BlockerInfo {
  const manualBlocker = task.blocker && task.blocker.trim() ? task.blocker.trim() : null;
  const isManuallyBlocked = task.status === 'blocked' || !!manualBlocker;

  const taskMap = new Map<Id, Task>();
  for (const t of allBuildTasks) {
    taskMap.set(t.id, t);
  }

  const prerequisiteBlockers: Task[] = [];
  if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0) {
    for (const prereqId of task.prerequisiteTaskIds) {
      const prereq = taskMap.get(prereqId);
      if (prereq && prereq.status !== 'done') {
        prerequisiteBlockers.push(prereq);
      }
    }
  }

  const isBlocked = isManuallyBlocked || prerequisiteBlockers.length > 0;
  const reasons: string[] = [];
  if (manualBlocker) {
    reasons.push(manualBlocker);
  }
  if (prerequisiteBlockers.length > 0) {
    const prereqTitles = prerequisiteBlockers.map(p => `"${p.title}"`).join(', ');
    reasons.push(`Waiting for prerequisite: ${prereqTitles}`);
  }

  return {
    isBlocked,
    manualBlocker,
    prerequisiteBlockers,
    summaryReason: reasons.join('. ')
  };
}

/**
 * Checks whether a task is "ready" to be worked on.
 * Ready means:
 * - Task is not done
 * - Task is not manually blocked (and status !== 'blocked')
 * - Every prerequisite task is done
 */
export function isTaskReady(task: Task, allBuildTasks: Task[]): boolean {
  if (task.status === 'done' || task.status === 'blocked') {
    return false;
  }
  if (task.blocker && task.blocker.trim().length > 0) {
    return false;
  }

  const taskMap = new Map<Id, Task>();
  for (const t of allBuildTasks) {
    taskMap.set(t.id, t);
  }

  if (task.prerequisiteTaskIds) {
    for (const prereqId of task.prerequisiteTaskIds) {
      const prereq = taskMap.get(prereqId);
      if (!prereq || prereq.status !== 'done') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Gets up to `limit` ready candidate tasks for a build, ordered by milestone and task order.
 */
export function getReadyTaskCandidates(
  buildId: Id,
  milestones: Milestone[],
  tasks: Task[],
  limit = 3
): Task[] {
  const buildMilestones = milestones
    .filter(m => m.buildId === buildId)
    .sort((a, b) => a.order - b.order);

  const milestoneOrderMap = new Map<Id, number>();
  buildMilestones.forEach((m, idx) => milestoneOrderMap.set(m.id, idx));

  const buildTasks = tasks.filter(t => t.buildId === buildId);

  const readyTasks = buildTasks
    .filter(t => isTaskReady(t, buildTasks))
    .sort((a, b) => {
      const mOrderA = milestoneOrderMap.get(a.milestoneId) ?? 9999;
      const mOrderB = milestoneOrderMap.get(b.milestoneId) ?? 9999;
      if (mOrderA !== mOrderB) return mOrderA - mOrderB;
      return a.order - b.order;
    });

  return readyTasks.slice(0, limit);
}

/**
 * Determines the first unfinished subtask of a task in order.
 */
export function getFirstUnfinishedSubtask(task: Task): Subtask | undefined {
  if (!task.subtasks || task.subtasks.length === 0) return undefined;
  const sorted = [...task.subtasks].sort((a, b) => a.order - b.order);
  return sorted.find(s => !s.done);
}

/**
 * Evaluates whether a build's selected next action is currently valid and ready.
 */
export function evaluateNextAction(
  build: Build,
  allBuildTasks: Task[]
): {
  isValid: boolean;
  isReady: boolean;
  task: Task | null;
  subtask: Subtask | null;
  blockerInfo: BlockerInfo | null;
} {
  if (!build.nextAction) {
    return { isValid: false, isReady: false, task: null, subtask: null, blockerInfo: null };
  }

  const task = allBuildTasks.find(t => t.id === build.nextAction?.taskId) || null;
  if (!task) {
    return { isValid: false, isReady: false, task: null, subtask: null, blockerInfo: null };
  }

  let subtask: Subtask | null = null;
  if (build.nextAction.subtaskId) {
    subtask = task.subtasks.find(s => s.id === build.nextAction?.subtaskId) || null;
    // If selected subtask was deleted or is done, selection needs attention
    if (!subtask || subtask.done) {
      return { isValid: false, isReady: false, task, subtask, blockerInfo: null };
    }
  }

  // If task has subtasks but no subtaskId was specified, pick first unfinished
  if (!subtask && task.subtasks && task.subtasks.length > 0) {
    subtask = getFirstUnfinishedSubtask(task) || null;
  }

  const blockerInfo = getTaskBlockerInfo(task, allBuildTasks);
  const isReady = !blockerInfo.isBlocked && task.status !== 'done';

  return {
    isValid: task.status !== 'done',
    isReady,
    task,
    subtask,
    blockerInfo
  };
}

/**
 * Calculates leaf unit progress:
 * Leaf unit = 1 for a root task without subtasks.
 * For a task with subtasks, leaf units = each subtask (parent is never counted separately).
 */
export interface ProgressSummary {
  doneLeafUnits: number;
  totalLeafUnits: number;
  percentage: number;
  label: string; // e.g. "4 / 10 steps (40%)" or "Not planned yet"
  isUnplanned: boolean;
}

export function calculateProgress(tasks: Task[]): ProgressSummary {
  if (!tasks || tasks.length === 0) {
    return {
      doneLeafUnits: 0,
      totalLeafUnits: 0,
      percentage: 0,
      label: 'Not planned yet',
      isUnplanned: true
    };
  }

  let totalLeafUnits = 0;
  let doneLeafUnits = 0;

  for (const task of tasks) {
    if (task.subtasks && task.subtasks.length > 0) {
      for (const sub of task.subtasks) {
        totalLeafUnits++;
        if (sub.done) {
          doneLeafUnits++;
        }
      }
    } else {
      totalLeafUnits++;
      if (task.status === 'done') {
        doneLeafUnits++;
      }
    }
  }

  if (totalLeafUnits === 0) {
    return {
      doneLeafUnits: 0,
      totalLeafUnits: 0,
      percentage: 0,
      label: 'Not planned yet',
      isUnplanned: true
    };
  }

  const percentage = Math.round((doneLeafUnits / totalLeafUnits) * 100);
  return {
    doneLeafUnits,
    totalLeafUnits,
    percentage,
    label: `${doneLeafUnits} / ${totalLeafUnits} steps (${percentage}%)`,
    isUnplanned: false
  };
}

/**
 * Computes derived task status from subtasks.
 * - If all subtasks are done -> 'done'
 * - If some are done and not manually blocked -> 'doing'
 * - If none are done and was 'done' -> 'todo'
 */
export function deriveStatusFromSubtasks(
  currentStatus: TaskStatus,
  subtasks: Subtask[],
  isManuallyBlocked: boolean
): TaskStatus {
  if (!subtasks || subtasks.length === 0) {
    return currentStatus;
  }

  const total = subtasks.length;
  const doneCount = subtasks.filter(s => s.done).length;

  if (doneCount === total) {
    return 'done';
  }

  if (isManuallyBlocked) {
    return 'blocked';
  }

  if (doneCount > 0) {
    return 'doing';
  }

  if (currentStatus === 'done') {
    return 'todo';
  }

  return currentStatus;
}
