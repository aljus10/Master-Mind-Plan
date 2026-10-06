import { Id, Task } from './types';

/**
 * Checks if adding `candidatePrereqId` to `targetTaskId` would introduce a cycle.
 * Also checks self-dependency.
 * Returns true if a cycle or self-dependency would be formed (i.e. invalid).
 */
export function wouldIntroduceCycle(
  tasks: Task[],
  targetTaskId: Id,
  candidatePrereqId: Id
): boolean {
  if (targetTaskId === candidatePrereqId) {
    return true;
  }

  const taskMap = new Map<Id, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  // To check if adding candidatePrereqId -> targetTaskId creates a cycle,
  // we check if targetTaskId is reachable starting from candidatePrereqId following its prerequisites.
  const visited = new Set<Id>();
  const queue: Id[] = [candidatePrereqId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === targetTaskId) {
      return true;
    }
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const currentTask = taskMap.get(currentId);
    if (currentTask && currentTask.prerequisiteTaskIds) {
      for (const nextPrereqId of currentTask.prerequisiteTaskIds) {
        if (!visited.has(nextPrereqId)) {
          queue.push(nextPrereqId);
        }
      }
    }
  }

  return false;
}

/**
 * Validates the entire task dependency graph for a build or workspace.
 * Returns null if valid, or an error message describing the cycle.
 */
export function validateNoCycles(tasks: Task[]): string | null {
  const taskMap = new Map<Id, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const visited = new Set<Id>();
  const inStack = new Set<Id>();

  function dfs(taskId: Id): boolean {
    visited.add(taskId);
    inStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task && task.prerequisiteTaskIds) {
      for (const prereqId of task.prerequisiteTaskIds) {
        if (prereqId === taskId) {
          return true; // Self loop
        }
        if (!visited.has(prereqId)) {
          if (dfs(prereqId)) return true;
        } else if (inStack.has(prereqId)) {
          return true;
        }
      }
    }

    inStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      if (dfs(task.id)) {
        return `Cyclic dependency detected involving task "${task.title}"`;
      }
    }
  }

  return null;
}
