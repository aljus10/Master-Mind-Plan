import starterJson from '../assets/starter-data.json';
import { Backup, Workspace } from '../domain/types';

export function getSampleBackup(): Backup {
  return starterJson as Backup;
}

export function getSampleWorkspace(): Workspace {
  return (starterJson as Backup).workspace;
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
    preferences: {
      startArea: 'builds',
      buildsView: 'board'
    }
  };
}
