import { Build, Feature, Id, Idea, Milestone, Note, Review, Task, Workspace } from '../domain/types';
import { generateId } from '../domain/uuid';

export function mergeWorkspaces(existing: Workspace, incoming: Workspace): Workspace {
  // Collect all existing IDs
  const existingIds = new Set<Id>();
  existing.builds.forEach(b => existingIds.add(b.id));
  existing.milestones.forEach(m => existingIds.add(m.id));
  existing.tasks.forEach(t => {
    existingIds.add(t.id);
    t.subtasks?.forEach(s => existingIds.add(s.id));
  });
  existing.ideas.forEach(i => existingIds.add(i.id));
  existing.features.forEach(f => existingIds.add(f.id));
  existing.notes.forEach(n => existingIds.add(n.id));
  existing.reviews.forEach(r => existingIds.add(r.id));

  // Map of incoming ID -> new ID (if remapped)
  const idMap = new Map<Id, Id>();

  // Pre-calculate mappings for all incoming records that collide
  incoming.builds.forEach(b => {
    if (existingIds.has(b.id)) idMap.set(b.id, generateId('bld'));
  });
  incoming.milestones.forEach(m => {
    if (existingIds.has(m.id)) idMap.set(m.id, generateId('mls'));
  });
  incoming.tasks.forEach(t => {
    if (existingIds.has(t.id)) idMap.set(t.id, generateId('tsk'));
    t.subtasks?.forEach(s => {
      if (existingIds.has(s.id)) idMap.set(s.id, generateId('sub'));
    });
  });
  incoming.ideas.forEach(i => {
    if (existingIds.has(i.id)) idMap.set(i.id, generateId('ida'));
  });
  incoming.features.forEach(f => {
    if (existingIds.has(f.id)) idMap.set(f.id, generateId('fea'));
  });
  incoming.notes.forEach(n => {
    if (existingIds.has(n.id)) idMap.set(n.id, generateId('not'));
  });
  incoming.reviews.forEach(r => {
    if (existingIds.has(r.id)) idMap.set(r.id, generateId('rev'));
  });

  // Remap incoming Builds
  const newBuilds: Build[] = incoming.builds.map(b => {
    const newId = idMap.get(b.id) || b.id;
    let nextAction = b.nextAction;
    if (nextAction) {
      nextAction = {
        taskId: idMap.get(nextAction.taskId) || nextAction.taskId,
        subtaskId: nextAction.subtaskId ? (idMap.get(nextAction.subtaskId) || nextAction.subtaskId) : undefined
      };
    }
    return {
      ...b,
      id: newId,
      nextAction
    };
  });

  // Remap incoming Milestones
  const newMilestones: Milestone[] = incoming.milestones.map(m => ({
    ...m,
    id: idMap.get(m.id) || m.id,
    buildId: idMap.get(m.buildId) || m.buildId
  }));

  // Remap incoming Tasks
  const newTasks: Task[] = incoming.tasks.map(t => ({
    ...t,
    id: idMap.get(t.id) || t.id,
    buildId: idMap.get(t.buildId) || t.buildId,
    milestoneId: idMap.get(t.milestoneId) || t.milestoneId,
    prerequisiteTaskIds: t.prerequisiteTaskIds.map(pId => idMap.get(pId) || pId),
    subtasks: t.subtasks.map(s => ({
      ...s,
      id: idMap.get(s.id) || s.id
    }))
  }));

  // Remap incoming Features
  const newFeatures: Feature[] = incoming.features.map(f => ({
    ...f,
    id: idMap.get(f.id) || f.id,
    buildId: idMap.get(f.buildId) || f.buildId
  }));

  // Remap incoming Ideas
  const newIdeas: Idea[] = incoming.ideas.map(i => {
    let convertedTo = i.convertedTo;
    if (convertedTo) {
      convertedTo = {
        kind: convertedTo.kind,
        id: idMap.get(convertedTo.id) || convertedTo.id
      };
    }
    return {
      ...i,
      id: idMap.get(i.id) || i.id,
      buildId: idMap.get(i.buildId) || i.buildId,
      convertedTo
    };
  });

  // Remap incoming Notes
  const newNotes: Note[] = incoming.notes.map(n => ({
    ...n,
    id: idMap.get(n.id) || n.id,
    buildId: idMap.get(n.buildId) || n.buildId
  }));

  // Remap incoming Reviews
  const newReviews: Review[] = incoming.reviews.map(r => ({
    ...r,
    id: idMap.get(r.id) || r.id,
    buildId: idMap.get(r.buildId) || r.buildId
  }));

  return {
    builds: [...existing.builds, ...newBuilds],
    milestones: [...existing.milestones, ...newMilestones],
    tasks: [...existing.tasks, ...newTasks],
    ideas: [...existing.ideas, ...newIdeas],
    features: [...existing.features, ...newFeatures],
    notes: [...existing.notes, ...newNotes],
    reviews: [...existing.reviews, ...newReviews],
    preferences: existing.preferences // keep user's existing preferences
  };
}
