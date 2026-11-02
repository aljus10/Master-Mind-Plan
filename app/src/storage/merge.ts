import { Build, DailyHabit, DailyTodo, Feature, Id, Idea, ISODateTime, Milestone, Note, Review, Task, Workspace } from '../domain/types';
import { generateId } from '../domain/uuid';

/**
 * Deduplicates builds, milestones, tasks, daily to-dos, daily habits, and features in a workspace.
 * Uses immutable IDs and deletion tombstones to prevent zombie entity resurrection
 * while safely merging concurrent changes from multiple devices.
 */
export function deduplicateWorkspace(ws: Workspace): Workspace {
  if (!ws) {
    return {
      builds: [],
      milestones: [],
      tasks: [],
      ideas: [],
      features: [],
      notes: [],
      reviews: [],
      dailyTodos: [],
      dailyHabits: [],
      deletedIds: {},
      preferences: { startArea: 'today', buildsView: 'board' }
    };
  }

  const deletedIds: Record<Id, ISODateTime> = ws.deletedIds || {};

  // Helper to check if an entity has been deleted via tombstone
  const isTombstoned = (id: Id, updatedAt?: string, createdAt?: string): boolean => {
    const tombstoneTime = deletedIds[id];
    if (!tombstoneTime) return false;
    const itemTime = updatedAt || createdAt || '';
    return tombstoneTime >= itemTime;
  };

  // 1. Deduplicate Builds by normalized title (or identical ID)
  const buildIdMap = new Map<Id, Id>();
  const uniqueBuilds: Build[] = [];
  const buildByTitle = new Map<string, Build>();
  const seenBuildIds = new Set<Id>();

  for (const b of ws.builds || []) {
    if (isTombstoned(b.id, b.updatedAt, b.createdAt)) continue;

    const normTitle = (b.title || '').trim().toLowerCase();
    const existing = buildByTitle.get(normTitle);

    if (existing) {
      buildIdMap.set(b.id, existing.id);
      if (b.updatedAt && (!existing.updatedAt || b.updatedAt > existing.updatedAt)) {
        existing.description = b.description || existing.description;
        existing.goal = b.goal || existing.goal;
        existing.definitionOfDone = b.definitionOfDone || existing.definitionOfDone;
        existing.category = b.category || existing.category;
        existing.constraints = b.constraints || existing.constraints;
        existing.status = b.status || existing.status;
        existing.pinned = b.pinned || existing.pinned;
        existing.updatedAt = b.updatedAt;
      }
    } else {
      let finalId = b.id;
      if (seenBuildIds.has(finalId)) {
        finalId = generateId('bld');
        buildIdMap.set(b.id, finalId);
      }
      seenBuildIds.add(finalId);
      const newBuild: Build = { ...b, id: finalId };
      buildByTitle.set(normTitle, newBuild);
      uniqueBuilds.push(newBuild);
    }
  }

  // 2. Deduplicate Milestones by buildId + title
  const milestoneIdMap = new Map<Id, Id>();
  const uniqueMilestones: Milestone[] = [];
  const milestoneByKey = new Map<string, Milestone>();
  const seenMilestoneIds = new Set<Id>();

  for (const m of ws.milestones || []) {
    if (isTombstoned(m.id, m.updatedAt, m.createdAt)) continue;

    const canonicalBuildId = buildIdMap.get(m.buildId) || m.buildId;
    const normTitle = (m.title || '').trim().toLowerCase();
    const key = `${canonicalBuildId}:::${normTitle}`;
    const existing = milestoneByKey.get(key);

    if (existing) {
      milestoneIdMap.set(m.id, existing.id);
    } else {
      let finalId = m.id;
      if (seenMilestoneIds.has(finalId)) {
        finalId = generateId('mls');
        milestoneIdMap.set(m.id, finalId);
      }
      seenMilestoneIds.add(finalId);
      const canonicalMilestone: Milestone = {
        ...m,
        id: finalId,
        buildId: canonicalBuildId
      };
      milestoneByKey.set(key, canonicalMilestone);
      uniqueMilestones.push(canonicalMilestone);
    }
  }

  // 3. Deduplicate Tasks by buildId + title
  const taskIdMap = new Map<Id, Id>();
  const uniqueTasks: Task[] = [];
  const taskByKey = new Map<string, Task>();
  const seenTaskIds = new Set<Id>();

  for (const t of ws.tasks || []) {
    if (isTombstoned(t.id, t.updatedAt, t.createdAt)) continue;

    const canonicalBuildId = buildIdMap.get(t.buildId) || t.buildId;
    const canonicalMilestoneId = milestoneIdMap.get(t.milestoneId) || t.milestoneId;
    const normTitle = (t.title || '').trim().toLowerCase();
    const key = `${canonicalBuildId}:::${normTitle}`;
    const existing = taskByKey.get(key);

    if (existing) {
      taskIdMap.set(t.id, existing.id);
      if (t.plannedDate && !existing.plannedDate) existing.plannedDate = t.plannedDate;
      if (t.status === 'done' || t.status === 'doing') existing.status = t.status;
      if (t.description && !existing.description) existing.description = t.description;
      if (t.subtasks && t.subtasks.length > 0) {
        const existingSubtaskTitles = new Set(existing.subtasks.map(s => s.title.trim().toLowerCase()));
        for (const sub of t.subtasks) {
          if (!existingSubtaskTitles.has(sub.title.trim().toLowerCase())) {
            existing.subtasks.push(sub);
          }
        }
      }
    } else {
      let finalId = t.id;
      if (seenTaskIds.has(finalId)) {
        finalId = generateId('tsk');
        taskIdMap.set(t.id, finalId);
      }
      seenTaskIds.add(finalId);
      const canonicalTask: Task = {
        ...t,
        id: finalId,
        buildId: canonicalBuildId,
        milestoneId: canonicalMilestoneId,
        prerequisiteTaskIds: (t.prerequisiteTaskIds || []).map(p => taskIdMap.get(p) || p),
        subtasks: [...(t.subtasks || [])]
      };
      taskByKey.set(key, canonicalTask);
      uniqueTasks.push(canonicalTask);
    }
  }

  // Remap task prerequisites
  for (const t of uniqueTasks) {
    t.prerequisiteTaskIds = t.prerequisiteTaskIds.map(p => taskIdMap.get(p) || p);
  }

  // 4. Deduplicate Features by buildId + title
  const featureIdMap = new Map<Id, Id>();
  const uniqueFeatures: Feature[] = [];
  const featureByKey = new Map<string, Feature>();
  const seenFeatureIds = new Set<Id>();

  for (const f of ws.features || []) {
    if (isTombstoned(f.id, f.updatedAt, f.createdAt)) continue;

    const canonicalBuildId = buildIdMap.get(f.buildId) || f.buildId;
    const normTitle = (f.title || '').trim().toLowerCase();
    const key = `${canonicalBuildId}:::${normTitle}`;
    const existing = featureByKey.get(key);

    if (existing) {
      featureIdMap.set(f.id, existing.id);
      if (f.achieved) existing.achieved = true;
    } else {
      let finalId = f.id;
      if (seenFeatureIds.has(finalId)) {
        finalId = generateId('fea');
        featureIdMap.set(f.id, finalId);
      }
      seenFeatureIds.add(finalId);
      const canonicalFeature: Feature = {
        ...f,
        id: finalId,
        buildId: canonicalBuildId
      };
      featureByKey.set(key, canonicalFeature);
      uniqueFeatures.push(canonicalFeature);
    }
  }

  // 5. Deduplicate Ideas, Notes, Reviews
  const uniqueIdeas: Idea[] = [];
  const ideaByKey = new Map<string, Idea>();
  for (const i of ws.ideas || []) {
    if (isTombstoned(i.id, i.updatedAt, i.createdAt)) continue;
    const canonicalBuildId = buildIdMap.get(i.buildId) || i.buildId;
    const normTitle = (i.title || '').trim().toLowerCase();
    const key = `${canonicalBuildId}:::${normTitle}`;
    if (!ideaByKey.has(key)) {
      const canonicalIdea: Idea = { ...i, buildId: canonicalBuildId };
      ideaByKey.set(key, canonicalIdea);
      uniqueIdeas.push(canonicalIdea);
    }
  }

  const uniqueNotes: Note[] = [];
  const noteByKey = new Map<string, Note>();
  for (const n of ws.notes || []) {
    if (isTombstoned(n.id, n.updatedAt, n.createdAt)) continue;
    const canonicalBuildId = buildIdMap.get(n.buildId) || n.buildId;
    const normTitle = (n.title || '').trim().toLowerCase();
    const key = `${canonicalBuildId}:::${normTitle}`;
    if (!noteByKey.has(key)) {
      const canonicalNote: Note = { ...n, buildId: canonicalBuildId };
      noteByKey.set(key, canonicalNote);
      uniqueNotes.push(canonicalNote);
    }
  }

  const uniqueReviews: Review[] = [];
  const reviewByKey = new Map<string, Review>();
  for (const r of ws.reviews || []) {
    if (isTombstoned(r.id, r.updatedAt, r.createdAt)) continue;
    const canonicalBuildId = buildIdMap.get(r.buildId) || r.buildId;
    const key = `${canonicalBuildId}:::${r.date}`;
    if (!reviewByKey.has(key)) {
      const canonicalReview: Review = { ...r, buildId: canonicalBuildId };
      reviewByKey.set(key, canonicalReview);
      uniqueReviews.push(canonicalReview);
    }
  }

  // 6. Deduplicate Daily To-Dos strictly by immutable ID
  const todoById = new Map<Id, DailyTodo>();
  for (const todo of ws.dailyTodos || []) {
    if (isTombstoned(todo.id, todo.updatedAt, todo.createdAt)) continue;

    const canonicalBuildId = todo.buildId ? (buildIdMap.get(todo.buildId) || todo.buildId) : null;
    const existing = todoById.get(todo.id);

    if (existing) {
      // Merge field by field preferring latest updatedAt
      if (todo.updatedAt && (!existing.updatedAt || todo.updatedAt > existing.updatedAt)) {
        existing.title = todo.title || existing.title;
        existing.date = todo.date || existing.date;
        existing.notes = todo.notes !== undefined ? todo.notes : existing.notes;
        existing.completed = todo.completed;
        existing.completedAt = todo.completedAt;
        existing.buildId = canonicalBuildId;
        existing.order = todo.order;
        existing.rolledFromDate = todo.rolledFromDate || existing.rolledFromDate;
        existing.updatedAt = todo.updatedAt;
      } else if (todo.completed && !existing.completed) {
        // Always honor completion if marked on another device
        existing.completed = true;
        existing.completedAt = todo.completedAt || todo.updatedAt;
      }
    } else {
      todoById.set(todo.id, {
        ...todo,
        buildId: canonicalBuildId
      });
    }
  }

  const uniqueDailyTodos = Array.from(todoById.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.order - b.order;
  });

  // 7. Deduplicate Daily Habits strictly by immutable ID
  const habitById = new Map<Id, DailyHabit>();
  for (const habit of ws.dailyHabits || []) {
    if (isTombstoned(habit.id, habit.updatedAt, habit.createdAt)) continue;

    const existing = habitById.get(habit.id);
    if (existing) {
      if (habit.updatedAt && (!existing.updatedAt || habit.updatedAt > existing.updatedAt)) {
        existing.title = habit.title || existing.title;
        existing.category = habit.category !== undefined ? habit.category : existing.category;
        existing.order = habit.order;
        existing.archived = habit.archived;
        existing.updatedAt = habit.updatedAt;
      }
      const combinedDates = new Set([...existing.completedDates, ...(habit.completedDates || [])]);
      existing.completedDates = Array.from(combinedDates).sort();
    } else {
      habitById.set(habit.id, {
        ...habit,
        completedDates: Array.from(new Set(habit.completedDates || [])).sort()
      });
    }
  }

  const uniqueDailyHabits = Array.from(habitById.values()).sort((a, b) => a.order - b.order);

  // 8. Update builds nextAction to canonical task IDs
  const finalBuilds = uniqueBuilds.map(b => {
    let nextAction = b.nextAction;
    if (nextAction && nextAction.taskId) {
      const canonicalTaskId = taskIdMap.get(nextAction.taskId) || nextAction.taskId;
      nextAction = { ...nextAction, taskId: canonicalTaskId };
    }
    return { ...b, nextAction };
  });

  return {
    builds: finalBuilds,
    milestones: uniqueMilestones,
    tasks: uniqueTasks,
    ideas: uniqueIdeas,
    features: uniqueFeatures,
    notes: uniqueNotes,
    reviews: uniqueReviews,
    dailyTodos: uniqueDailyTodos,
    dailyHabits: uniqueDailyHabits,
    deletedIds,
    preferences: ws.preferences || { startArea: 'today', buildsView: 'board' }
  };
}

/**
 * Merges two workspaces while intelligently deduplicating matching entities
 * and respecting deletion tombstones across devices.
 */
export function mergeWorkspaces(existing: Workspace, incoming: Workspace): Workspace {
  if (!existing && !incoming) {
    return {
      builds: [],
      milestones: [],
      tasks: [],
      ideas: [],
      features: [],
      notes: [],
      reviews: [],
      dailyTodos: [],
      dailyHabits: [],
      deletedIds: {},
      preferences: { startArea: 'today', buildsView: 'board' }
    };
  }
  if (!existing) return deduplicateWorkspace(incoming);
  if (!incoming) return deduplicateWorkspace(existing);

  // Combine deletion tombstones with newer timestamp precedence
  const combinedDeletedIds: Record<Id, ISODateTime> = { ...(existing.deletedIds || {}) };
  for (const [id, time] of Object.entries(incoming.deletedIds || {})) {
    if (!combinedDeletedIds[id] || time > combinedDeletedIds[id]) {
      combinedDeletedIds[id] = time;
    }
  }

  // Combine raw entities and run deduplication
  const combined: Workspace = {
    builds: [...(existing.builds || []), ...(incoming.builds || [])],
    milestones: [...(existing.milestones || []), ...(incoming.milestones || [])],
    tasks: [...(existing.tasks || []), ...(incoming.tasks || [])],
    ideas: [...(existing.ideas || []), ...(incoming.ideas || [])],
    features: [...(existing.features || []), ...(incoming.features || [])],
    notes: [...(existing.notes || []), ...(incoming.notes || [])],
    reviews: [...(existing.reviews || []), ...(incoming.reviews || [])],
    dailyTodos: [...(existing.dailyTodos || []), ...(incoming.dailyTodos || [])],
    dailyHabits: [...(existing.dailyHabits || []), ...(incoming.dailyHabits || [])],
    deletedIds: combinedDeletedIds,
    preferences: existing.preferences || incoming.preferences
  };

  return deduplicateWorkspace(combined);
}
