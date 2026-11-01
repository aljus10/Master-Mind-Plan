import starterJson from '../assets/starter-data.json';
import { Backup, Workspace } from '../domain/types';

export function getSampleBackup(): Backup {
  const backup = (starterJson as unknown) as Backup;
  if (!backup.workspace.dailyTodos) {
    backup.workspace.dailyTodos = [];
  }
  if (!backup.workspace.deletedIds) {
    backup.workspace.deletedIds = {};
  }
  return backup;
}

export function getSampleWorkspace(): Workspace {
  const ws = ((starterJson as unknown) as Backup).workspace;
  return {
    ...ws,
    dailyTodos: ws.dailyTodos || [],
    deletedIds: ws.deletedIds || {}
  };
}

export function createEmptyWorkspace(): Workspace {
  return {
    builds: [],
    milestones: [],
    tasks: [],
    ideas: [],
    features: [],
    notes: [],
    reviews: [],
    dailyTodos: [],
    deletedIds: {},
    preferences: {
      startArea: 'today',
      buildsView: 'board'
    }
  };
}
