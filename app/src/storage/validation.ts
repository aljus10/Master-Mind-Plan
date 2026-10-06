import { Backup, BuildStatus, CalendarDate, IdeaGroup, Priority, TaskStatus, Workspace } from '../domain/types';
import { validateNoCycles } from '../domain/cycles';

const VALID_BUILD_STATUSES: Set<BuildStatus> = new Set(['idea', 'planned', 'active', 'paused', 'completed']);
const VALID_TASK_STATUSES: Set<TaskStatus> = new Set(['todo', 'doing', 'blocked', 'done']);
const VALID_PRIORITIES: Set<Priority> = new Set(['low', 'normal', 'high']);
const VALID_IDEA_GROUPS: Set<IdeaGroup> = new Set(['inbox', 'candidate', 'later', 'dropped']);

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  backup?: Backup;
  summary?: {
    buildsCount: number;
    milestonesCount: number;
    tasksCount: number;
    ideasCount: number;
    featuresCount: number;
    notesCount: number;
    reviewsCount: number;
  };
}

export function validateBackupJson(rawJson: string): ValidationResult {
  const errors: string[] = [];

  // Check file size (10 MiB limit)
  if (rawJson.length > 10 * 1024 * 1024) {
    return { valid: false, errors: ['File size exceeds the 10 MiB limit.'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON format: ${(e as Error).message}`] };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Backup payload must be a JSON object.'] };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.schemaVersion !== 1) {
    errors.push('Unsupported schemaVersion. Expected version 1.');
  }

  if (typeof obj.revision !== 'number') {
    errors.push('Revision must be a number.');
  }

  if (typeof obj.updatedAt !== 'string' || !ISO_DATE_TIME_REGEX.test(obj.updatedAt)) {
    errors.push('updatedAt must be a valid ISO datetime string.');
  }

  if (!obj.workspace || typeof obj.workspace !== 'object') {
    errors.push('Workspace object is required.');
    return { valid: false, errors };
  }

  const ws = obj.workspace as Record<string, unknown>;
  const requiredArrays = ['builds', 'milestones', 'tasks', 'ideas', 'features', 'notes', 'reviews'];
  for (const arrName of requiredArrays) {
    if (!Array.isArray(ws[arrName])) {
      errors.push(`Workspace must contain array "${arrName}".`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const workspace = ws as unknown as Workspace;

  const buildIdSet = new Set<string>();
  const milestoneIdSet = new Set<string>();
  const taskIdSet = new Set<string>();
  const subtaskIdSet = new Set<string>();
  const ideaIdSet = new Set<string>();
  const featureIdSet = new Set<string>();

  // Validate Builds
  for (const b of workspace.builds) {
    if (!b.id || typeof b.id !== 'string') {
      errors.push('Every build must have a valid string id.');
    } else if (buildIdSet.has(b.id)) {
      errors.push(`Duplicate build id found: "${b.id}".`);
    } else {
      buildIdSet.add(b.id);
    }

    if (!b.title || typeof b.title !== 'string') {
      errors.push(`Build "${b.id || 'unknown'}" is missing required title.`);
    } else if (b.title.length > 160) {
      errors.push(`Build title "${b.title.slice(0, 30)}..." exceeds 160 characters.`);
    }

    if (!VALID_BUILD_STATUSES.has(b.status)) {
      errors.push(`Build "${b.title}" has invalid status: "${b.status}".`);
    }

    if (b.constraints?.targetDate && !CALENDAR_DATE_REGEX.test(b.constraints.targetDate)) {
      errors.push(`Build "${b.title}" has invalid targetDate format: "${b.constraints.targetDate}".`);
    }
  }

  // Validate Milestones
  for (const m of workspace.milestones) {
    if (!m.id || typeof m.id !== 'string') {
      errors.push('Every milestone must have a valid string id.');
    } else if (milestoneIdSet.has(m.id)) {
      errors.push(`Duplicate milestone id: "${m.id}".`);
    } else {
      milestoneIdSet.add(m.id);
    }

    if (!buildIdSet.has(m.buildId)) {
      errors.push(`Milestone "${m.title || m.id}" references non-existent buildId: "${m.buildId}".`);
    }
  }

  // Validate Tasks
  for (const t of workspace.tasks) {
    if (!t.id || typeof t.id !== 'string') {
      errors.push('Every task must have a valid string id.');
    } else if (taskIdSet.has(t.id)) {
      errors.push(`Duplicate task id: "${t.id}".`);
    } else {
      taskIdSet.add(t.id);
    }

    if (!buildIdSet.has(t.buildId)) {
      errors.push(`Task "${t.title || t.id}" references non-existent buildId: "${t.buildId}".`);
    }

    if (!milestoneIdSet.has(t.milestoneId)) {
      errors.push(`Task "${t.title || t.id}" references non-existent milestoneId: "${t.milestoneId}".`);
    }

    if (!VALID_TASK_STATUSES.has(t.status)) {
      errors.push(`Task "${t.title}" has invalid status: "${t.status}".`);
    }

    if (!VALID_PRIORITIES.has(t.priority)) {
      errors.push(`Task "${t.title}" has invalid priority: "${t.priority}".`);
    }

    if (t.plannedDate && !CALENDAR_DATE_REGEX.test(t.plannedDate)) {
      errors.push(`Task "${t.title}" has invalid plannedDate format: "${t.plannedDate}".`);
    }

    if (t.dueDate && !CALENDAR_DATE_REGEX.test(t.dueDate)) {
      errors.push(`Task "${t.title}" has invalid dueDate format: "${t.dueDate}".`);
    }

    // Validate subtasks
    if (t.subtasks && Array.isArray(t.subtasks)) {
      for (const s of t.subtasks) {
        if (!s.id || typeof s.id !== 'string') {
          errors.push(`Task "${t.title}" has a subtask with invalid id.`);
        } else if (subtaskIdSet.has(s.id)) {
          errors.push(`Duplicate subtask id: "${s.id}".`);
        } else {
          subtaskIdSet.add(s.id);
        }
      }
    }
  }

  // Validate task prerequisite foreign keys
  for (const t of workspace.tasks) {
    if (t.prerequisiteTaskIds && Array.isArray(t.prerequisiteTaskIds)) {
      for (const prereqId of t.prerequisiteTaskIds) {
        if (!taskIdSet.has(prereqId)) {
          errors.push(`Task "${t.title}" references non-existent prerequisite task "${prereqId}".`);
        }
      }
    }
  }

  // Validate cycles in task prerequisites
  const cycleError = validateNoCycles(workspace.tasks);
  if (cycleError) {
    errors.push(cycleError);
  }

  // Validate Features
  for (const f of workspace.features) {
    if (!f.id || typeof f.id !== 'string') {
      errors.push('Feature must have a valid string id.');
    } else if (featureIdSet.has(f.id)) {
      errors.push(`Duplicate feature id: "${f.id}".`);
    } else {
      featureIdSet.add(f.id);
    }
    if (!buildIdSet.has(f.buildId)) {
      errors.push(`Feature "${f.title || f.id}" references non-existent buildId: "${f.buildId}".`);
    }
  }

  // Validate Ideas
  for (const i of workspace.ideas) {
    if (!i.id || typeof i.id !== 'string') {
      errors.push('Idea must have a valid string id.');
    } else if (ideaIdSet.has(i.id)) {
      errors.push(`Duplicate idea id: "${i.id}".`);
    } else {
      ideaIdSet.add(i.id);
    }

    if (!buildIdSet.has(i.buildId)) {
      errors.push(`Idea "${i.title || i.id}" references non-existent buildId: "${i.buildId}".`);
    }

    if (!VALID_IDEA_GROUPS.has(i.group)) {
      errors.push(`Idea "${i.title}" has invalid group: "${i.group}".`);
    }

    if (i.convertedTo) {
      if (i.convertedTo.kind === 'feature') {
        if (!featureIdSet.has(i.convertedTo.id)) {
          errors.push(`Idea "${i.title}" convertedTo feature id "${i.convertedTo.id}" does not exist.`);
        }
      } else if (i.convertedTo.kind === 'task') {
        if (!taskIdSet.has(i.convertedTo.id)) {
          errors.push(`Idea "${i.title}" convertedTo task id "${i.convertedTo.id}" does not exist.`);
        }
      }
    }
  }

  // Validate NextAction references
  for (const b of workspace.builds) {
    if (b.nextAction) {
      if (!taskIdSet.has(b.nextAction.taskId)) {
        errors.push(`Build "${b.title}" nextAction references missing taskId: "${b.nextAction.taskId}".`);
      }
      if (b.nextAction.subtaskId && !subtaskIdSet.has(b.nextAction.subtaskId)) {
        errors.push(`Build "${b.title}" nextAction references missing subtaskId: "${b.nextAction.subtaskId}".`);
      }
    }
  }

  // Validate Notes URLs (safe http/https protocols)
  for (const n of workspace.notes) {
    if (!buildIdSet.has(n.buildId)) {
      errors.push(`Note "${n.title || n.id}" references non-existent buildId: "${n.buildId}".`);
    }
    if (n.links && Array.isArray(n.links)) {
      for (const link of n.links) {
        if (link.url && !/^https?:\/\//i.test(link.url.trim())) {
          errors.push(`Note "${n.title}" has an invalid link URL: "${link.url}". Only http and https protocols are allowed.`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validBackup: Backup = {
    schemaVersion: 1,
    revision: obj.revision as number,
    updatedAt: obj.updatedAt as string,
    workspace: {
      builds: workspace.builds || [],
      milestones: workspace.milestones || [],
      tasks: workspace.tasks || [],
      ideas: workspace.ideas || [],
      features: workspace.features || [],
      notes: workspace.notes || [],
      reviews: workspace.reviews || [],
      preferences: workspace.preferences || { startArea: 'builds', buildsView: 'board' }
    }
  };

  return {
    valid: true,
    errors: [],
    backup: validBackup,
    summary: {
      buildsCount: validBackup.workspace.builds.length,
      milestonesCount: validBackup.workspace.milestones.length,
      tasksCount: validBackup.workspace.tasks.length,
      ideasCount: validBackup.workspace.ideas.length,
      featuresCount: validBackup.workspace.features.length,
      notesCount: validBackup.workspace.notes.length,
      reviewsCount: validBackup.workspace.reviews.length
    }
  };
}
