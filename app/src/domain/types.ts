export type Id = string;
export type ISODateTime = string;
export type CalendarDate = string; // YYYY-MM-DD local calendar date

export type BuildStatus = 'idea' | 'planned' | 'active' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Priority = 'low' | 'normal' | 'high';
export type IdeaGroup = 'inbox' | 'candidate' | 'later' | 'dropped';
export type PlanView = 'calendar' | 'list' | 'board';
export type CalendarViewMode = 'month' | 'week' | 'agenda';

export interface RecordMeta {
  id: Id;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface NextAction {
  taskId: Id;
  subtaskId?: Id;
}

export interface BuildConstraints {
  timeNotes: string;
  budgetNotes: string;
  resourceNotes: string;
  targetDate?: CalendarDate;
}

export interface Build extends RecordMeta {
  title: string;
  description: string;
  category?: string;
  goal: string;
  definitionOfDone: string;
  status: BuildStatus;
  order: number;
  pinned: boolean;
  archivedAt: ISODateTime | null;
  nextAction: NextAction | null;
  constraints: BuildConstraints;
  planView: PlanView;
  calendarView: CalendarViewMode;
  calendarAnchorDate: CalendarDate;
}

export interface Milestone extends RecordMeta {
  buildId: Id;
  title: string;
  outcome: string;
  order: number;
}

export interface Subtask {
  id: Id;
  title: string;
  done: boolean;
  order: number;
}

export interface Task extends RecordMeta {
  buildId: Id;
  milestoneId: Id;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  order: number;
  boardOrder: number;
  estimatedMinutes?: number;
  plannedDate: CalendarDate | null;
  calendarOrder: number;
  dueDate?: CalendarDate;
  blocker: string;
  prerequisiteTaskIds: Id[];
  subtasks: Subtask[];
}

export interface IdeaConversion {
  kind: 'feature' | 'task';
  id: Id;
}

export interface Idea extends RecordMeta {
  buildId: Id;
  title: string;
  description: string;
  group: IdeaGroup;
  order: number;
  tags: string[];
  convertedTo: IdeaConversion | null;
}

export interface Feature extends RecordMeta {
  buildId: Id;
  title: string;
  description: string;
  achieved: boolean;
  order: number;
}

export interface ExternalLink {
  label: string;
  url: string;
}

export interface Note extends RecordMeta {
  buildId: Id;
  title: string;
  body: string;
  links: ExternalLink[];
  order: number;
}

export interface Review extends RecordMeta {
  buildId: Id;
  date: CalendarDate;
  movedForward: string;
  stuck: string;
  next: string;
}

export interface UserPreferences {
  startArea: 'builds' | 'next';
  buildsView: 'board' | 'grid';
}

export interface Workspace {
  builds: Build[];
  milestones: Milestone[];
  tasks: Task[];
  ideas: Idea[];
  features: Feature[];
  notes: Note[];
  reviews: Review[];
  preferences: UserPreferences;
}

export interface Backup {
  schemaVersion: 1;
  revision: number;
  updatedAt: ISODateTime;
  workspace: Workspace;
}
