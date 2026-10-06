import { Backup, Workspace } from '../domain/types';
import { nowISO } from '../domain/uuid';
import { mergeWorkspaces } from './merge';
import { createEmptyWorkspace } from './sampleData';
import { validateBackupJson, ValidationResult } from './validation';

export const STORAGE_KEY = 'future-build-organizer:v1';

export interface LoadResult {
  workspace: Workspace;
  revision: number;
  isCorrupt: boolean;
  rawCorruptData?: string;
}

export interface SaveResult {
  success: boolean;
  newRevision: number;
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      initialWorkspace: string | null;
      saveWorkspace: (serializedData: string) => Promise<{ success: boolean; error?: string }>;
      revealDataFolder: () => Promise<boolean>;
      getDataFilePath: () => Promise<string>;
    };
  }
}

export class Repository {
  private storageKey: string;

  constructor(key = STORAGE_KEY) {
    this.storageKey = key;
  }

  /**
   * Loads the workspace from Electron disk storage or localStorage.
   * If empty, returns empty workspace with revision 0.
   * If corrupt/unparseable, sets isCorrupt: true and keeps raw data for recovery.
   */
  loadWorkspace(): LoadResult {
    let raw: string | null = null;

    if (typeof window !== 'undefined' && window.electronAPI?.initialWorkspace) {
      raw = window.electronAPI.initialWorkspace;
    } else if (typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(this.storageKey);
    }

    if (!raw) {
      return {
        workspace: createEmptyWorkspace(),
        revision: 0,
        isCorrupt: false
      };
    }

    const validation = validateBackupJson(raw);
    if (!validation.valid || !validation.backup) {
      return {
        workspace: createEmptyWorkspace(),
        revision: 0,
        isCorrupt: true,
        rawCorruptData: raw
      };
    }

    return {
      workspace: validation.backup.workspace,
      revision: validation.backup.revision,
      isCorrupt: false
    };
  }

  /**
   * Commits and saves workspace to localStorage and native disk (if running in Electron).
   * Increments revision. Returns success: true only AFTER storage write succeeds.
   */
  saveWorkspace(workspace: Workspace, currentRevision: number): SaveResult {
    const nextRevision = currentRevision + 1;
    const backup: Backup = {
      schemaVersion: 1,
      revision: nextRevision,
      updatedAt: nowISO(),
      workspace
    };

    try {
      const serialized = JSON.stringify(backup);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, serialized);
      }
      if (typeof window !== 'undefined' && window.electronAPI?.saveWorkspace) {
        window.electronAPI.saveWorkspace(serialized);
      }
      return { success: true, newRevision: nextRevision };
    } catch (err) {
      return {
        success: false,
        newRevision: currentRevision,
        error: (err as Error).message || 'Quota exceeded or storage write error.'
      };
    }
  }

  /**
   * Generates a downloadable JSON string of the backup.
   */
  exportBackup(workspace: Workspace, revision: number): string {
    const backup: Backup = {
      schemaVersion: 1,
      revision,
      updatedAt: nowISO(),
      workspace
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Validates a backup JSON string.
   */
  validateImport(rawJson: string): ValidationResult {
    return validateBackupJson(rawJson);
  }

  /**
   * Applies an imported backup in either 'merge' or 'replace' mode.
   */
  applyImport(
    incomingBackup: Backup,
    mode: 'merge' | 'replace',
    currentWorkspace: Workspace,
    currentRevision: number
  ): { newWorkspace: Workspace; newRevision: number } {
    let resultingWorkspace: Workspace;
    if (mode === 'replace') {
      resultingWorkspace = incomingBackup.workspace;
    } else {
      resultingWorkspace = mergeWorkspaces(currentWorkspace, incomingBackup.workspace);
    }

    const saveRes = this.saveWorkspace(resultingWorkspace, currentRevision);
    if (!saveRes.success) {
      throw new Error(saveRes.error || 'Failed to save imported workspace');
    }

    return {
      newWorkspace: resultingWorkspace,
      newRevision: saveRes.newRevision
    };
  }

  /**
   * Gets current revision stored in localStorage for multi-tab check.
   */
  getStoredRevision(): number | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed.revision === 'number' ? parsed.revision : null;
    } catch {
      return null;
    }
  }

  /**
   * Clears storage.
   */
  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export const repository = new Repository();
