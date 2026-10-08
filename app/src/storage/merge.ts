import { Build, Feature, Id, Idea, Milestone, Note, Review, Task, Workspace } from '../domain/types';
import { generateId } from '../domain/uuid';

/**
 * Deduplicates builds, milestones, tasks, and features in a workspace.
 * Merges items with matching titles into canonical instances,
 * while safely remapping ID collisions when titles differ.
 */
export function deduplicateWorkspace(ws: Workspace): Workspace {
  if (!ws) return ws;

  // 1. Deduplicate Builds by normalized title
  const buildIdMap = new Map<Id, Id>();
  const uniqueBuilds: Build[] = [];
  const buildByTitle = new Map<string, Build>();
  const seenBuildIds = new Set<Id>();

  for (const b of ws.builds || []) {
    const normTitle = (b.title || '').trim().toLowerCase();
    const existing = buildByTitle.get(normTitle);

    if (existing) {
      // Map duplicate build ID to existing canonical build ID
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
    const canonicalBuildId = buildIdMap.get(r.buildId) || r.buildId;
    const key = `${canonicalBuildId}:::${r.date}`;
    if (!reviewByKey.has(key)) {
      const canonicalReview: Review = { ...r, buildId: canonicalBuildId };
      reviewByKey.set(key, canonicalReview);
      uniqueReviews.push(canonicalReview);
    }
  }

  // 6. Update builds nextAction to canonical task IDs
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
    preferences: ws.preferences
  };
}

/**
 * Merges two workspaces while intelligently deduplicating matching entities.
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
      preferences: { startArea: 'builds', buildsView: 'board' }
    };
  }
  if (!existing) return deduplicateWorkspace(incoming);
  if (!incoming) return deduplicateWorkspace(existing);

  // Combine raw entities and run deduplication
  const combined: Workspace = {
    builds: [...(existing.builds || []), ...(incoming.builds || [])],
    milestones: [...(existing.milestones || []), ...(incoming.milestones || [])],
    tasks: [...(existing.tasks || []), ...(incoming.tasks || [])],
    ideas: [...(existing.ideas || []), ...(incoming.ideas || [])],
    features: [...(existing.features || []), ...(incoming.features || [])],
    notes: [...(existing.notes || []), ...(incoming.notes || [])],
    reviews: [...(existing.reviews || []), ...(incoming.reviews || [])],
    preferences: existing.preferences || incoming.preferences
  };

  return deduplicateWorkspace(combined);
}
