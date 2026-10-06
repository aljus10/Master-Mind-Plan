/** Proposed phase-1 contract. This file is a blueprint, not an implemented app. */
export type Id = string;
export type ISODateTime = string;
export type CalendarDate = string;
export type BuildStatus = 'idea' | 'planned' | 'active' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Priority = 'low' | 'normal' | 'high';
export type IdeaGroup = 'inbox' | 'candidate' | 'later' | 'dropped';
export type PlanView = 'calendar' | 'list' | 'board';
export interface RecordMeta { id: Id; createdAt: ISODateTime; updatedAt: ISODateTime; }
export interface NextAction { taskId: Id; subtaskId?: Id; }
export interface Build extends RecordMeta {
  title: string; description: string; category?: string; goal: string;
  definitionOfDone: string; status: BuildStatus; order: number; pinned: boolean;
  archivedAt: ISODateTime | null; nextAction: NextAction | null;
  constraints: { timeNotes: string; budgetNotes: string; resourceNotes: string; targetDate?: CalendarDate };
  planView: PlanView; calendarView: 'month' | 'week'; calendarAnchorDate: CalendarDate;
}
export interface Milestone extends RecordMeta { buildId: Id; title: string; outcome: string; order: number; }
export interface Subtask { id: Id; title: string; done: boolean; order: number; }
export interface Task extends RecordMeta {
  buildId: Id; milestoneId: Id; title: string; description: string;
  status: TaskStatus; priority: Priority; order: number; boardOrder: number;
  estimatedMinutes?: number; plannedDate: CalendarDate | null; calendarOrder: number; dueDate?: CalendarDate; blocker: string;
  prerequisiteTaskIds: Id[]; subtasks: Subtask[];
}
export interface Idea extends RecordMeta {
  buildId: Id; title: string; description: string; group: IdeaGroup; order: number; tags: string[];
  convertedTo: { kind: 'feature' | 'task'; id: Id } | null;
}
export interface Feature extends RecordMeta { buildId: Id; title: string; description: string; achieved: boolean; order: number; }
export interface Note extends RecordMeta {
  buildId: Id; title: string; body: string;
  links: Array<{ label: string; url: string }>; order: number;
}
export interface Review extends RecordMeta { buildId: Id; date: CalendarDate; movedForward: string; stuck: string; next: string; }
export interface Workspace {
  builds: Build[]; milestones: Milestone[]; tasks: Task[]; ideas: Idea[];
  features: Feature[]; notes: Note[]; reviews: Review[];
  preferences: { startArea: 'builds' | 'next'; buildsView: 'board' | 'grid' };
}
export interface Backup { schemaVersion: 1; revision: number; updatedAt: ISODateTime; workspace: Workspace; }
