import { Workspace } from '../domain/types';
import { generateId, nowISO } from '../domain/uuid';
import { deduplicateWorkspace } from './merge';

export const SNAPSHOTS_KEY = 'strata:snapshots:v1';
export const MAX_SNAPSHOTS = 10;

export interface SnapshotItem {
  id: string;
  timestamp: string;
  description: string;
  buildsCount: number;
  todosCount: number;
  habitsCount: number;
  data: string; // JSON serialized Backup payload
}

/**
 * Loads list of stored snapshots from localStorage.
 */
export function loadSnapshots(): SnapshotItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new point-in-time snapshot, capping total snapshots at MAX_SNAPSHOTS.
 */
export function createSnapshot(workspace: Workspace, description = 'Manual Snapshot'): SnapshotItem {
  const snapshots = loadSnapshots();
  const id = generateId('snp');
  const timestamp = nowISO();

  const backupPayload = {
    schemaVersion: 1,
    revision: 1,
    updatedAt: timestamp,
    workspace: deduplicateWorkspace(workspace)
  };

  const newSnapshot: SnapshotItem = {
    id,
    timestamp,
    description,
    buildsCount: (workspace.builds || []).length,
    todosCount: (workspace.dailyTodos || []).length,
    habitsCount: (workspace.dailyHabits || []).length,
    data: JSON.stringify(backupPayload)
  };

  const updated = [newSnapshot, ...snapshots].slice(0, MAX_SNAPSHOTS);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    } catch {
      // Storage quota guard: trim oldest
      const trimmed = [newSnapshot, ...snapshots.slice(0, 4)];
      try {
        localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
      } catch {
        // Ignore if storage is full
      }
    }
  }

  return newSnapshot;
}

/**
 * Deletes a snapshot by id.
 */
export function deleteSnapshot(id: string): void {
  const snapshots = loadSnapshots();
  const updated = snapshots.filter(s => s.id !== id);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  }
}

/**
 * Automatically creates an auto-snapshot if more than 45 minutes have elapsed.
 */
export function maybeAutoSnapshot(workspace: Workspace): void {
  const snapshots = loadSnapshots();
  const last = snapshots[0];
  const now = Date.now();

  if (last) {
    const lastTime = new Date(last.timestamp).getTime();
    if (now - lastTime < 45 * 60 * 1000) {
      return; // recent snapshot already exists
    }
  }

  createSnapshot(workspace, 'Auto Periodic Snapshot');
}
