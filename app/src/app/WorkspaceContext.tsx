import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  Backup,
  Build,
  BuildStatus,
  CalendarDate,
  Feature,
  Id,
  Idea,
  IdeaGroup,
  Milestone,
  Note,
  Review,
  Subtask,
  Task,
  TaskStatus,
  UserPreferences,
  Workspace
} from '../domain/types';
import { generateId, nowISO } from '../domain/uuid';
import { getTodayDate } from '../domain/dates';
import { moveItemDirection, normalizeOrder, reorderItems } from '../domain/ordering';
import { deriveStatusFromSubtasks, getTaskBlockerInfo } from '../domain/readiness';
import { wouldIntroduceCycle } from '../domain/cycles';
import { deduplicateWorkspace, mergeWorkspaces } from '../storage/merge';
import { repository, Repository } from '../storage/repository';
import { getSampleWorkspace, createEmptyWorkspace } from '../storage/sampleData';
import {
  clearSupabaseConfig,
  fetchFromCloud,
  fetchRemoteRevision,
  getSupabaseConfig,
  saveSupabaseConfig,
  subscribeToCloudChanges,
  uploadToCloud
} from '../storage/supabaseSync';

export type SaveStatus = 'saved' | 'saving' | 'error';
export type CloudSyncStatus = 'disabled' | 'connected' | 'syncing' | 'error';

interface WorkspaceContextType {
  workspace: Workspace;
  revision: number;
  saveStatus: SaveStatus;
  saveErrorMessage: string | null;
  cloudSyncStatus: CloudSyncStatus;
  syncKey: string;
  isCorrupt: boolean;
  rawCorruptData: string | null;
  hasMultiTabConflict: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;

  // Cloud sync & pairing actions
  configureCloudSync: (url: string, anonKey: string, syncKey?: string) => Promise<boolean>;
  pairDeviceWithKey: (key: string) => Promise<boolean>;
  manualCloudSync: () => Promise<boolean>;
  disconnectCloudSync: () => void;
  restorePrePairBackup: () => boolean;

  // Global preferences
  updatePreferences: (prefs: Partial<UserPreferences>) => void;

  // Build actions
  addBuild: (title: string, description?: string, category?: string) => Build;
  updateBuild: (buildId: Id, updates: Partial<Build>) => void;
  duplicateBuild: (buildId: Id) => Build;
  archiveBuild: (buildId: Id) => void;
  restoreBuild: (buildId: Id) => void;
  deleteBuildPermanently: (buildId: Id) => void;
  changeBuildStatus: (buildId: Id, newStatus: BuildStatus) => void;
  reorderBuilds: (sourceId: Id, targetIndex: number, status: BuildStatus) => void;

  // Milestone actions
  addMilestone: (buildId: Id, title: string, outcome?: string) => Milestone;
  updateMilestone: (milestoneId: Id, updates: Partial<Milestone>) => void;
  deleteMilestone: (milestoneId: Id, mode: 'move' | 'delete', targetMilestoneId?: Id) => void;
  moveMilestone: (milestoneId: Id, direction: 'up' | 'down') => void;

  // Task actions
  addTask: (buildId: Id, milestoneId: Id, title: string, plannedDate?: CalendarDate | null) => Task;
  updateTask: (taskId: Id, updates: Partial<Task>, immediate?: boolean) => void;
  deleteTask: (taskId: Id) => void;
  moveTaskStatus: (
    taskId: Id,
    newStatus: TaskStatus,
    blockerReason?: string,
    confirmSubtasks?: boolean
  ) => { success: boolean; reason?: string };
  moveTaskDate: (taskId: Id, newDate: CalendarDate | null, newOrder?: number) => void;
  moveTaskMilestone: (taskId: Id, newMilestoneId: Id) => void;
  reorderTaskCalendar: (taskId: Id, date: CalendarDate | null, newIndex: number) => void;
  reorderTaskMilestone: (taskId: Id, direction: 'up' | 'down') => void;

  // Subtask actions
  addSubtask: (taskId: Id, title: string) => Subtask;
  updateSubtask: (taskId: Id, subtaskId: Id, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: Id, subtaskId: Id) => void;
  moveSubtask: (taskId: Id, subtaskId: Id, direction: 'up' | 'down') => void;

  // Idea actions
  addIdea: (buildId: Id, title: string, group?: IdeaGroup, description?: string, tags?: string[]) => Idea;
  updateIdea: (ideaId: Id, updates: Partial<Idea>, immediate?: boolean) => void;
  moveIdeaGroup: (ideaId: Id, group: IdeaGroup) => void;
  deleteIdea: (ideaId: Id) => void;
  convertIdea: (
    ideaId: Id,
    target:
      | { kind: 'feature'; title: string; description: string }
      | { kind: 'task'; milestoneId: Id; title: string; description: string }
  ) => void;

  // Feature actions
  addFeature: (buildId: Id, title: string, description?: string) => Feature;
  updateFeature: (featureId: Id, updates: Partial<Feature>) => void;
  deleteFeature: (featureId: Id) => void;

  // Note actions
  addNote: (buildId: Id, title: string, body?: string) => Note;
  updateNote: (noteId: Id, updates: Partial<Note>, immediate?: boolean) => void;
  deleteNote: (noteId: Id) => void;

  // Review actions
  addReview: (buildId: Id, date: CalendarDate, movedForward: string, stuck: string, next: string) => Review;
  updateReview: (reviewId: Id, updates: Partial<Review>) => void;
  deleteReview: (reviewId: Id) => void;

  // Next action
  setNextAction: (buildId: Id, taskId: Id | null, subtaskId?: Id) => void;

  // Sample data & reset
  loadSampleData: () => void;
  resetWorkspace: () => void;

  // Backups
  importBackup: (jsonString: string, mode: 'merge' | 'replace') => { success: boolean; error?: string };
  exportBackup: () => string;
  retrySave: () => void;
  reloadFromStorage: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    const loaded = repository.loadWorkspace();
    return deduplicateWorkspace(loaded.workspace);
  });

  const [revision, setRevision] = useState<number>(() => {
    const loaded = repository.loadWorkspace();
    return loaded.revision;
  });

  const [isCorrupt, setIsCorrupt] = useState<boolean>(() => {
    const loaded = repository.loadWorkspace();
    return loaded.isCorrupt;
  });

  const [rawCorruptData, setRawCorruptData] = useState<string | null>(() => {
    const loaded = repository.loadWorkspace();
    return loaded.rawCorruptData || null;
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [hasMultiTabConflict, setHasMultiTabConflict] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud sync state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() => {
    const cfg = getSupabaseConfig();
    return cfg.url && cfg.anonKey ? 'connected' : 'disabled';
  });
  const [syncKey, setSyncKey] = useState<string>(() => {
    return getSupabaseConfig().syncKey;
  });

  // References for debouncing & flush
  const pendingSaveTimeout = useRef<number | null>(null);
  const currentWorkspaceRef = useRef<Workspace>(workspace);
  const currentRevisionRef = useRef<number>(revision);
  const isDirtyRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<number | null>(null);

  currentWorkspaceRef.current = workspace;
  currentRevisionRef.current = revision;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  // Write changes to repository
  const commitWorkspaceSave = useCallback((ws: Workspace, immediate = false) => {
    isDirtyRef.current = true;
    setSaveStatus('saving');

    const executeWrite = () => {
      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }

      const res = repository.saveWorkspace(ws, currentRevisionRef.current);
      if (res.success) {
        currentRevisionRef.current = res.newRevision;
        setRevision(res.newRevision);
        setSaveStatus('saved');
        setSaveErrorMessage(null);
        isDirtyRef.current = false;

        // Background non-blocking cloud upload
        const cfg = getSupabaseConfig();
        if (cfg.url && cfg.anonKey && cfg.syncKey) {
          uploadToCloud(cfg.syncKey, ws, res.newRevision).then(uploadRes => {
            if (!uploadRes.success) {
              console.warn('[Sync] Cloud upload warning:', uploadRes.error);
            }
          });
        }
      } else {
        setSaveStatus('error');
        setSaveErrorMessage(res.error || 'Write error');
      }
    };

    if (immediate) {
      executeWrite();
    } else {
      if (pendingSaveTimeout.current) clearTimeout(pendingSaveTimeout.current);
      pendingSaveTimeout.current = window.setTimeout(executeWrite, 500);
    }
  }, []);

  const applyWorkspaceMutation = useCallback(
    (mutator: (prev: Workspace) => Workspace, immediate = false) => {
      setWorkspace(prev => {
        const next = mutator(prev);
        commitWorkspaceSave(next, immediate);
        return next;
      });
    },
    [commitWorkspaceSave]
  );

  // Listen for multi-tab updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === repository['storageKey']) {
        const storedRev = repository.getStoredRevision();
        if (storedRev !== null && storedRev !== currentRevisionRef.current) {
          setHasMultiTabConflict(true);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Pagehide / beforeunload hooks for dirty flush
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };

    const handlePageHide = () => {
      if (isDirtyRef.current) {
        // Immediate synchronous flush
        repository.saveWorkspace(currentWorkspaceRef.current, currentRevisionRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Realtime cloud synchronization, window resume sync, and heartbeat poll
  useEffect(() => {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey || !cfg.syncKey) {
      setCloudStatus('disabled');
      return;
    }

    setCloudStatus('connected');

    const syncWithRemote = async (silent = false) => {
      try {
        const remote = await fetchFromCloud(cfg.syncKey);
        if (remote.success && remote.workspace && remote.revision !== undefined) {
          if (remote.revision > currentRevisionRef.current) {
            const cleanWs = deduplicateWorkspace(remote.workspace);
            currentRevisionRef.current = remote.revision;
            setRevision(remote.revision);
            setWorkspace(cleanWs);
            repository.saveWorkspace(cleanWs, remote.revision);
            if (!silent) showToast('Synced update from paired device');
          } else if (currentRevisionRef.current > remote.revision) {
            // Local is ahead, push up to remote
            await uploadToCloud(cfg.syncKey, currentWorkspaceRef.current, currentRevisionRef.current);
          }
        }
      } catch (err) {
        console.warn('[Sync] Sync check error:', err);
      }
    };

    // 1. Initial startup sync check
    syncWithRemote(true);

    // 2. Realtime WebSocket subscription
    const unsubscribe = subscribeToCloudChanges(cfg.syncKey, (remoteWs, remoteRev) => {
      if (remoteRev > currentRevisionRef.current) {
        const cleanWs = deduplicateWorkspace(remoteWs);
        currentRevisionRef.current = remoteRev;
        setRevision(remoteRev);
        setWorkspace(cleanWs);
        repository.saveWorkspace(cleanWs, remoteRev);
        showToast('Synced update from paired device');
      }
    });

    // 3. Focus / Visibility change hook (critical for mobile app wake & desktop window switches)
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        fetchRemoteRevision(cfg.syncKey).then(revCheck => {
          if (revCheck.success && revCheck.revision !== undefined && revCheck.revision > currentRevisionRef.current) {
            syncWithRemote(false);
          }
        });
      }
    };

    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // 4. Heartbeat poll every 10 seconds (lightweight revision check)
    const intervalId = window.setInterval(() => {
      fetchRemoteRevision(cfg.syncKey).then(revCheck => {
        if (revCheck.success && revCheck.revision !== undefined && revCheck.revision > currentRevisionRef.current) {
          syncWithRemote(false);
        }
      });
    }, 10000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
      window.clearInterval(intervalId);
    };
  }, [syncKey, showToast]);

  const configureCloudSync = useCallback(
    async (url: string, anonKey: string, customSyncKey?: string): Promise<boolean> => {
      saveSupabaseConfig(url, anonKey, customSyncKey);
      const cfg = getSupabaseConfig();
      setSyncKey(cfg.syncKey);
      setCloudStatus('connected');

      const res = await uploadToCloud(cfg.syncKey, currentWorkspaceRef.current, currentRevisionRef.current);
      if (res.success) {
        showToast(`Cloud sync connected! Device key: ${cfg.syncKey}`);
        return true;
      } else {
        setCloudStatus('error');
        showToast(`Cloud connection warning: ${res.error || 'Failed to upload'}`);
        return false;
      }
    },
    [showToast]
  );

  const pairDeviceWithKey = useCallback(
    async (targetKey: string): Promise<boolean> => {
      const cfg = getSupabaseConfig();
      if (!cfg.url || !cfg.anonKey) {
        showToast('Please configure Supabase URL & Anon Key first.');
        return false;
      }
      const cleanKey = targetKey.trim().toUpperCase();

      // Automatic safety snapshot of current data before pairing
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(
            'future-build-organizer:pre-pair-backup',
            JSON.stringify({
              schemaVersion: 1,
              revision: currentRevisionRef.current,
              updatedAt: new Date().toISOString(),
              workspace: currentWorkspaceRef.current
            })
          );
        }
      } catch (e) {}

      saveSupabaseConfig(cfg.url, cfg.anonKey, cleanKey);
      setSyncKey(cleanKey);

      const remote = await fetchFromCloud(cleanKey);
      if (remote.success && remote.workspace && remote.revision !== undefined) {
        const cleanRemote = deduplicateWorkspace(remote.workspace);
        currentRevisionRef.current = remote.revision;
        setRevision(remote.revision);
        setWorkspace(cleanRemote);
        repository.saveWorkspace(cleanRemote, remote.revision);
        setCloudStatus('connected');
        showToast(`Paired with ${cleanKey}! Workspace synced.`);
        return true;
      } else {
        // If remote has no data yet for this key, upload current workspace
        if (currentWorkspaceRef.current.builds.length > 0) {
          const rev = currentRevisionRef.current + 1;
          currentRevisionRef.current = rev;
          setRevision(rev);
          await uploadToCloud(cleanKey, currentWorkspaceRef.current, rev);
          setCloudStatus('connected');
          showToast(`Paired with ${cleanKey}! Workspace uploaded to cloud.`);
          return true;
        }
        showToast(`Pairing failed: ${remote.error || 'Key not found'}`);
        return false;
      }
    },
    [showToast]
  );

  const restorePrePairBackup = useCallback((): boolean => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('future-build-organizer:pre-pair-backup') : null;
      if (!saved) {
        showToast('No pre-pairing backup found in storage.');
        return false;
      }
      const parsed = JSON.parse(saved);
      if (parsed.workspace) {
        const nextRev = (parsed.revision || currentRevisionRef.current) + 1;
        currentRevisionRef.current = nextRev;
        setRevision(nextRev);
        setWorkspace(parsed.workspace);
        repository.saveWorkspace(parsed.workspace, nextRev);
        const cfg = getSupabaseConfig();
        if (cfg.url && cfg.anonKey && cfg.syncKey) {
          uploadToCloud(cfg.syncKey, parsed.workspace, nextRev);
        }
        showToast('Restored pre-pairing backup successfully!');
        return true;
      }
    } catch (e) {}
    showToast('Failed to restore backup.');
    return false;
  }, [showToast]);

  const manualCloudSync = useCallback(async (): Promise<boolean> => {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey || !cfg.syncKey) {
      showToast('Cloud sync is not configured.');
      return false;
    }
    setCloudStatus('syncing');
    const remote = await fetchFromCloud(cfg.syncKey);
    if (remote.success && remote.workspace && remote.revision) {
      if (remote.revision > currentRevisionRef.current) {
        const cleanWs = deduplicateWorkspace(remote.workspace);
        currentRevisionRef.current = remote.revision;
        setRevision(remote.revision);
        setWorkspace(cleanWs);
        repository.saveWorkspace(cleanWs, remote.revision);
        setCloudStatus('connected');
        showToast('Pulled latest updates from cloud.');
        return true;
      }
    }
    const uploadRes = await uploadToCloud(cfg.syncKey, currentWorkspaceRef.current, currentRevisionRef.current);
    setCloudStatus(uploadRes.success ? 'connected' : 'error');
    if (uploadRes.success) {
      showToast('Workspace synced to cloud.');
    }
    return uploadRes.success;
  }, [showToast]);

  const disconnectCloudSync = useCallback(() => {
    clearSupabaseConfig();
    setCloudStatus('disabled');
    showToast('Cloud sync disconnected.');
  }, [showToast]);

  // Update preferences
  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      preferences: { ...ws.preferences, ...prefs }
    }), true);
  }, [applyWorkspaceMutation]);

  // Build actions
  const addBuild = useCallback((title: string, description = '', category = ''): Build => {
    const id = generateId('build');
    const now = nowISO();
    const newBuild: Build = {
      id,
      createdAt: now,
      updatedAt: now,
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || undefined,
      goal: '',
      definitionOfDone: '',
      status: 'planned',
      order: currentWorkspaceRef.current.builds.filter(b => b.status === 'planned').length,
      pinned: false,
      archivedAt: null,
      nextAction: null,
      constraints: {
        timeNotes: '',
        budgetNotes: '',
        resourceNotes: ''
      },
      planView: 'calendar',
      calendarView: 'month',
      calendarAnchorDate: getTodayDate()
    };

    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: [...ws.builds, newBuild]
    }), true);

    showToast(`Build "${newBuild.title}" created.`);
    return newBuild;
  }, [applyWorkspaceMutation, showToast]);

  const updateBuild = useCallback((buildId: Id, updates: Partial<Build>) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: ws.builds.map(b => (b.id === buildId ? { ...b, ...updates, updatedAt: nowISO() } : b))
    }), false);
  }, [applyWorkspaceMutation]);

  const duplicateBuild = useCallback((buildId: Id): Build => {
    const ws = currentWorkspaceRef.current;
    const sourceBuild = ws.builds.find(b => b.id === buildId);
    if (!sourceBuild) throw new Error('Source build not found');

    const newBuildId = generateId('build');
    const now = nowISO();

    const idMap = new Map<Id, Id>();

    // Duplicate milestones
    const sourceMilestones = ws.milestones.filter(m => m.buildId === buildId);
    const newMilestones: Milestone[] = sourceMilestones.map(m => {
      const newMId = generateId('milestone');
      idMap.set(m.id, newMId);
      return {
        ...m,
        id: newMId,
        buildId: newBuildId,
        createdAt: now,
        updatedAt: now
      };
    });

    // Duplicate tasks and subtasks
    const sourceTasks = ws.tasks.filter(t => t.buildId === buildId);
    sourceTasks.forEach(t => idMap.set(t.id, generateId('task')));

    const newTasks: Task[] = sourceTasks.map(t => {
      const newTaskId = idMap.get(t.id)!;
      const newSubtasks: Subtask[] = t.subtasks.map(s => {
        const newSubId = generateId('subtask');
        idMap.set(s.id, newSubId);
        return {
          ...s,
          id: newSubId,
          done: false // reset completion
        };
      });

      return {
        ...t,
        id: newTaskId,
        buildId: newBuildId,
        milestoneId: idMap.get(t.milestoneId) || t.milestoneId,
        status: 'todo', // reset status
        prerequisiteTaskIds: t.prerequisiteTaskIds.map(p => idMap.get(p) || p),
        subtasks: newSubtasks,
        createdAt: now,
        updatedAt: now
      };
    });

    // Duplicate ideas
    const sourceIdeas = ws.ideas.filter(i => i.buildId === buildId);
    sourceIdeas.forEach(i => idMap.set(i.id, generateId('idea')));

    // Duplicate features
    const sourceFeatures = ws.features.filter(f => f.buildId === buildId);
    sourceFeatures.forEach(f => idMap.set(f.id, generateId('feature')));

    const newFeatures: Feature[] = sourceFeatures.map(f => ({
      ...f,
      id: idMap.get(f.id)!,
      buildId: newBuildId,
      achieved: false,
      createdAt: now,
      updatedAt: now
    }));

    const newIdeas: Idea[] = sourceIdeas.map(i => {
      const newIdeaId = idMap.get(i.id)!;
      let convertedTo = null;
      if (i.convertedTo) {
        convertedTo = {
          kind: i.convertedTo.kind,
          id: idMap.get(i.convertedTo.id) || i.convertedTo.id
        };
      }
      return {
        ...i,
        id: newIdeaId,
        buildId: newBuildId,
        convertedTo,
        createdAt: now,
        updatedAt: now
      };
    });

    // Duplicate notes
    const sourceNotes = ws.notes.filter(n => n.buildId === buildId);
    const newNotes: Note[] = sourceNotes.map(n => ({
      ...n,
      id: generateId('note'),
      buildId: newBuildId,
      createdAt: now,
      updatedAt: now
    }));

    // Duplicate reviews
    const sourceReviews = ws.reviews.filter(r => r.buildId === buildId);
    const newReviews: Review[] = sourceReviews.map(r => ({
      ...r,
      id: generateId('review'),
      buildId: newBuildId,
      createdAt: now,
      updatedAt: now
    }));

    const newBuild: Build = {
      ...sourceBuild,
      id: newBuildId,
      title: `${sourceBuild.title} (copy)`,
      status: 'idea',
      order: ws.builds.filter(b => b.status === 'idea').length,
      pinned: false,
      archivedAt: null,
      nextAction: null,
      createdAt: now,
      updatedAt: now
    };

    applyWorkspaceMutation(prev => ({
      ...prev,
      builds: [...prev.builds, newBuild],
      milestones: [...prev.milestones, ...newMilestones],
      tasks: [...prev.tasks, ...newTasks],
      ideas: [...prev.ideas, ...newIdeas],
      features: [...prev.features, ...newFeatures],
      notes: [...prev.notes, ...newNotes],
      reviews: [...prev.reviews, ...newReviews]
    }), true);

    showToast(`Build duplicated as "${newBuild.title}".`);
    return newBuild;
  }, [applyWorkspaceMutation, showToast]);

  const archiveBuild = useCallback((buildId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: ws.builds.map(b => (b.id === buildId ? { ...b, archivedAt: nowISO(), updatedAt: nowISO() } : b))
    }), true);
    showToast('Build archived.');
  }, [applyWorkspaceMutation, showToast]);

  const restoreBuild = useCallback((buildId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: ws.builds.map(b => (b.id === buildId ? { ...b, archivedAt: null, updatedAt: nowISO() } : b))
    }), true);
    showToast('Build restored to active workspace.');
  }, [applyWorkspaceMutation, showToast]);

  const deleteBuildPermanently = useCallback((buildId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: ws.builds.filter(b => b.id !== buildId),
      milestones: ws.milestones.filter(m => m.buildId !== buildId),
      tasks: ws.tasks.filter(t => t.buildId !== buildId),
      ideas: ws.ideas.filter(i => i.buildId !== buildId),
      features: ws.features.filter(f => f.buildId !== buildId),
      notes: ws.notes.filter(n => n.buildId !== buildId),
      reviews: ws.reviews.filter(r => r.buildId !== buildId)
    }), true);
    showToast('Build permanently deleted.');
  }, [applyWorkspaceMutation, showToast]);

  const changeBuildStatus = useCallback((buildId: Id, newStatus: BuildStatus) => {
    applyWorkspaceMutation(ws => {
      const b = ws.builds.find(x => x.id === buildId);
      if (!b) return ws;

      let nextAction = b.nextAction;
      if (newStatus === 'completed') {
        nextAction = null;
      }

      return {
        ...ws,
        builds: ws.builds.map(item =>
          item.id === buildId
            ? { ...item, status: newStatus, nextAction, updatedAt: nowISO() }
            : item
        )
      };
    }, true);
  }, [applyWorkspaceMutation]);

  const reorderBuilds = useCallback((sourceId: Id, targetIndex: number, status: BuildStatus) => {
    applyWorkspaceMutation(ws => {
      const columnBuilds = ws.builds
        .filter(b => b.status === status && !b.archivedAt)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return a.order - b.order;
        });

      const reordered = reorderItems(columnBuilds, sourceId, targetIndex);
      const reorderedMap = new Map(reordered.map((b, i) => [b.id, i]));

      return {
        ...ws,
        builds: ws.builds.map(b => {
          if (reorderedMap.has(b.id)) {
            return { ...b, order: reorderedMap.get(b.id)!, updatedAt: nowISO() };
          }
          return b;
        })
      };
    }, true);
  }, [applyWorkspaceMutation]);

  // Milestone actions
  const addMilestone = useCallback((buildId: Id, title: string, outcome = ''): Milestone => {
    const id = generateId('milestone');
    const now = nowISO();
    const existing = currentWorkspaceRef.current.milestones.filter(m => m.buildId === buildId);
    const newM: Milestone = {
      id,
      buildId,
      title: title.trim(),
      outcome: outcome.trim(),
      order: existing.length,
      createdAt: now,
      updatedAt: now
    };

    applyWorkspaceMutation(ws => ({
      ...ws,
      milestones: [...ws.milestones, newM]
    }), true);

    showToast(`Milestone "${newM.title}" added.`);
    return newM;
  }, [applyWorkspaceMutation, showToast]);

  const updateMilestone = useCallback((milestoneId: Id, updates: Partial<Milestone>) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      milestones: ws.milestones.map(m =>
        m.id === milestoneId ? { ...m, ...updates, updatedAt: nowISO() } : m
      )
    }), false);
  }, [applyWorkspaceMutation]);

  const deleteMilestone = useCallback(
    (milestoneId: Id, mode: 'move' | 'delete', targetMilestoneId?: Id) => {
      applyWorkspaceMutation(ws => {
        let newTasks = ws.tasks;
        let newBuilds = ws.builds;

        if (mode === 'move' && targetMilestoneId) {
          newTasks = newTasks.map(t =>
            t.milestoneId === milestoneId ? { ...t, milestoneId: targetMilestoneId, updatedAt: nowISO() } : t
          );
        } else {
          // Delete contained tasks and clean up references
          const deletedTaskIds = new Set(newTasks.filter(t => t.milestoneId === milestoneId).map(t => t.id));
          newTasks = newTasks
            .filter(t => !deletedTaskIds.has(t.id))
            .map(t => ({
              ...t,
              prerequisiteTaskIds: t.prerequisiteTaskIds.filter(pId => !deletedTaskIds.has(pId))
            }));

          // Clean up nextActions
          newBuilds = newBuilds.map(b => {
            if (b.nextAction && deletedTaskIds.has(b.nextAction.taskId)) {
              return { ...b, nextAction: null, updatedAt: nowISO() };
            }
            return b;
          });
        }

        return {
          ...ws,
          milestones: ws.milestones.filter(m => m.id !== milestoneId),
          tasks: newTasks,
          builds: newBuilds
        };
      }, true);
      showToast('Milestone removed.');
    },
    [applyWorkspaceMutation, showToast]
  );

  const moveMilestone = useCallback((milestoneId: Id, direction: 'up' | 'down') => {
    applyWorkspaceMutation(ws => {
      const target = ws.milestones.find(m => m.id === milestoneId);
      if (!target) return ws;
      const buildMilestones = ws.milestones.filter(m => m.buildId === target.buildId);
      const reordered = moveItemDirection(buildMilestones, milestoneId, direction);
      const orderMap = new Map(reordered.map(m => [m.id, m.order]));

      return {
        ...ws,
        milestones: ws.milestones.map(m =>
          orderMap.has(m.id) ? { ...m, order: orderMap.get(m.id)!, updatedAt: nowISO() } : m
        )
      };
    }, true);
  }, [applyWorkspaceMutation]);

  // Task actions
  const addTask = useCallback(
    (buildId: Id, milestoneId: Id, title: string, plannedDate: CalendarDate | null = null): Task => {
      const id = generateId('task');
      const now = nowISO();
      const existingInMilestone = currentWorkspaceRef.current.tasks.filter(t => t.milestoneId === milestoneId);
      const existingOnDate = currentWorkspaceRef.current.tasks.filter(
        t => t.buildId === buildId && t.plannedDate === plannedDate
      );

      const newTask: Task = {
        id,
        buildId,
        milestoneId,
        title: title.trim(),
        description: '',
        status: 'todo',
        priority: 'normal',
        order: existingInMilestone.length,
        boardOrder: currentWorkspaceRef.current.tasks.filter(t => t.buildId === buildId && t.status === 'todo').length,
        estimatedMinutes: 20,
        plannedDate,
        calendarOrder: existingOnDate.length,
        blocker: '',
        prerequisiteTaskIds: [],
        subtasks: [],
        createdAt: now,
        updatedAt: now
      };

      applyWorkspaceMutation(ws => ({
        ...ws,
        tasks: [...ws.tasks, newTask]
      }), true);

      showToast(`Task "${newTask.title}" added.`);
      return newTask;
    },
    [applyWorkspaceMutation, showToast]
  );

  const updateTask = useCallback((taskId: Id, updates: Partial<Task>, immediate = false) => {
    applyWorkspaceMutation(ws => {
      const existing = ws.tasks.find(t => t.id === taskId);
      if (!existing) return ws;

      const updated = { ...existing, ...updates, updatedAt: nowISO() };

      // Cycle prevention check if prerequisites are changed
      if (updates.prerequisiteTaskIds) {
        for (const pId of updates.prerequisiteTaskIds) {
          if (wouldIntroduceCycle(ws.tasks, taskId, pId)) {
            throw new Error(`Cannot add dependency: cyclic dependency detected.`);
          }
        }
      }

      // Check if updating task invalidates build nextAction
      let builds = ws.builds;
      if (updated.status === 'done' || (updated.blocker && updated.blocker.trim())) {
        builds = builds.map(b => {
          if (b.nextAction?.taskId === taskId) {
            return { ...b, nextAction: null, updatedAt: nowISO() };
          }
          return b;
        });
      }

      return {
        ...ws,
        tasks: ws.tasks.map(t => (t.id === taskId ? updated : t)),
        builds
      };
    }, immediate);
  }, [applyWorkspaceMutation]);

  const deleteTask = useCallback((taskId: Id) => {
    applyWorkspaceMutation(ws => {
      const taskToDelete = ws.tasks.find(t => t.id === taskId);
      if (!taskToDelete) return ws;

      // Clean up prerequisite references
      const newTasks = ws.tasks
        .filter(t => t.id !== taskId)
        .map(t => ({
          ...t,
          prerequisiteTaskIds: t.prerequisiteTaskIds.filter(pId => pId !== taskId)
        }));

      // Clean up build nextActions
      const newBuilds = ws.builds.map(b => {
        if (b.nextAction?.taskId === taskId) {
          return { ...b, nextAction: null, updatedAt: nowISO() };
        }
        return b;
      });

      // Clean up idea convertedTo
      const newIdeas = ws.ideas.map(i => {
        if (i.convertedTo?.kind === 'task' && i.convertedTo.id === taskId) {
          return { ...i, convertedTo: null, updatedAt: nowISO() };
        }
        return i;
      });

      return {
        ...ws,
        tasks: newTasks,
        builds: newBuilds,
        ideas: newIdeas
      };
    }, true);
    showToast('Task deleted.');
  }, [applyWorkspaceMutation, showToast]);

  const moveTaskStatus = useCallback(
    (
      taskId: Id,
      newStatus: TaskStatus,
      blockerReason?: string,
      confirmSubtasks?: boolean
    ): { success: boolean; reason?: string } => {
      const ws = currentWorkspaceRef.current;
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return { success: false, reason: 'Task not found' };

      const buildTasks = ws.tasks.filter(t => t.buildId === task.buildId);

      // Rule: Doing and Done require unfinished prerequisites to be done
      if (newStatus === 'doing' || newStatus === 'done') {
        const blockerInfo = getTaskBlockerInfo(task, buildTasks);
        if (blockerInfo.prerequisiteBlockers.length > 0) {
          const names = blockerInfo.prerequisiteBlockers.map(p => `"${p.title}"`).join(', ');
          return {
            success: false,
            reason: `Prerequisite tasks not complete: ${names}. Finish them before starting or completing this step.`
          };
        }
      }

      let subtasks = task.subtasks;
      if (newStatus === 'done') {
        if (confirmSubtasks && subtasks.length > 0) {
          subtasks = subtasks.map(s => ({ ...s, done: true }));
        }
      } else if (newStatus === 'todo' || newStatus === 'doing') {
        if (confirmSubtasks && subtasks.length > 0 && subtasks.every(s => s.done)) {
          subtasks = subtasks.map(s => ({ ...s, done: false }));
        }
      }

      const blocker = newStatus === 'blocked' ? (blockerReason || task.blocker || 'Blocked') : '';

      applyWorkspaceMutation(prev => {
        let builds = prev.builds;
        if (newStatus === 'done') {
          builds = builds.map(b => {
            if (b.nextAction?.taskId === taskId) {
              return { ...b, nextAction: null, updatedAt: nowISO() };
            }
            return b;
          });
        }

        return {
          ...prev,
          tasks: prev.tasks.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  status: newStatus,
                  subtasks,
                  blocker,
                  updatedAt: nowISO()
                }
              : t
          ),
          builds
        };
      }, true);

      showToast(`Task moved to ${newStatus}.`);
      return { success: true };
    },
    [applyWorkspaceMutation, showToast]
  );

  const moveTaskDate = useCallback((taskId: Id, newDate: CalendarDate | null, newOrder?: number) => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const sameDateTasks = ws.tasks.filter(
        t => t.buildId === task.buildId && t.plannedDate === newDate && t.id !== taskId
      );
      const calendarOrder = typeof newOrder === 'number' ? newOrder : sameDateTasks.length;

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId
            ? { ...t, plannedDate: newDate, calendarOrder, updatedAt: nowISO() }
            : t
        )
      };
    }, true);

    showToast(newDate ? `Step planned for ${newDate}.` : 'Step moved to Unscheduled.');
  }, [applyWorkspaceMutation, showToast]);

  const moveTaskMilestone = useCallback((taskId: Id, newMilestoneId: Id) => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;
      const targetMilestoneTasks = ws.tasks.filter(t => t.milestoneId === newMilestoneId);

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                milestoneId: newMilestoneId,
                order: targetMilestoneTasks.length,
                updatedAt: nowISO()
              }
            : t
        )
      };
    }, true);
    showToast('Task moved to milestone.');
  }, [applyWorkspaceMutation, showToast]);

  const reorderTaskCalendar = useCallback((taskId: Id, date: CalendarDate | null, newIndex: number) => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const dateTasks = ws.tasks
        .filter(t => t.buildId === task.buildId && t.plannedDate === date)
        .sort((a, b) => a.calendarOrder - b.calendarOrder);

      const reordered = reorderItems(
        dateTasks.map(t => ({ ...t, order: t.calendarOrder })),
        taskId,
        newIndex
      );

      const orderMap = new Map(reordered.map((t, idx) => [t.id, idx]));

      return {
        ...ws,
        tasks: ws.tasks.map(t => {
          if (orderMap.has(t.id)) {
            return {
              ...t,
              calendarOrder: orderMap.get(t.id)!,
              plannedDate: date,
              updatedAt: nowISO()
            };
          }
          return t;
        })
      };
    }, true);
  }, [applyWorkspaceMutation]);

  const reorderTaskMilestone = useCallback((taskId: Id, direction: 'up' | 'down') => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const milestoneTasks = ws.tasks.filter(t => t.milestoneId === task.milestoneId);
      const reordered = moveItemDirection(milestoneTasks, taskId, direction);
      const orderMap = new Map(reordered.map(t => [t.id, t.order]));

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)!, updatedAt: nowISO() } : t
        )
      };
    }, true);
  }, [applyWorkspaceMutation]);

  // Subtask actions
  const addSubtask = useCallback((taskId: Id, title: string): Subtask => {
    const subId = generateId('subtask');
    let createdSub: Subtask | null = null;

    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const newSub: Subtask = {
        id: subId,
        title: title.trim(),
        done: false,
        order: task.subtasks.length
      };
      createdSub = newSub;

      const newSubtasks = [...task.subtasks, newSub];
      const derivedStatus = deriveStatusFromSubtasks(task.status, newSubtasks, !!task.blocker);

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId ? { ...t, subtasks: newSubtasks, status: derivedStatus, updatedAt: nowISO() } : t
        )
      };
    }, true);

    showToast('Subtask added.');
    return createdSub!;
  }, [applyWorkspaceMutation, showToast]);

  const updateSubtask = useCallback((taskId: Id, subtaskId: Id, updates: Partial<Subtask>) => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const newSubtasks = task.subtasks.map(s => (s.id === subtaskId ? { ...s, ...updates } : s));
      const derivedStatus = deriveStatusFromSubtasks(task.status, newSubtasks, !!task.blocker);

      let builds = ws.builds;
      if (derivedStatus === 'done') {
        builds = builds.map(b => {
          if (b.nextAction?.taskId === taskId) {
            return { ...b, nextAction: null, updatedAt: nowISO() };
          }
          return b;
        });
      }

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId ? { ...t, subtasks: newSubtasks, status: derivedStatus, updatedAt: nowISO() } : t
        ),
        builds
      };
    }, true);
  }, [applyWorkspaceMutation]);

  const deleteSubtask = useCallback((taskId: Id, subtaskId: Id) => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const newSubtasks = normalizeOrder(task.subtasks.filter(s => s.id !== subtaskId));
      const derivedStatus = deriveStatusFromSubtasks(task.status, newSubtasks, !!task.blocker);

      let builds = ws.builds;
      builds = builds.map(b => {
        if (b.nextAction?.subtaskId === subtaskId) {
          return { ...b, nextAction: null, updatedAt: nowISO() };
        }
        return b;
      });

      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId ? { ...t, subtasks: newSubtasks, status: derivedStatus, updatedAt: nowISO() } : t
        ),
        builds
      };
    }, true);
  }, [applyWorkspaceMutation]);

  const moveSubtask = useCallback((taskId: Id, subtaskId: Id, direction: 'up' | 'down') => {
    applyWorkspaceMutation(ws => {
      const task = ws.tasks.find(t => t.id === taskId);
      if (!task) return ws;

      const reordered = moveItemDirection(task.subtasks, subtaskId, direction);
      return {
        ...ws,
        tasks: ws.tasks.map(t =>
          t.id === taskId ? { ...t, subtasks: reordered, updatedAt: nowISO() } : t
        )
      };
    }, true);
  }, [applyWorkspaceMutation]);

  // Idea actions
  const addIdea = useCallback(
    (buildId: Id, title: string, group: IdeaGroup = 'inbox', description = '', tags: string[] = []): Idea => {
      const id = generateId('idea');
      const now = nowISO();
      const existingInGroup = currentWorkspaceRef.current.ideas.filter(
        i => i.buildId === buildId && i.group === group
      );

      const newIdea: Idea = {
        id,
        buildId,
        title: title.trim(),
        description: description.trim(),
        group,
        order: existingInGroup.length,
        tags,
        convertedTo: null,
        createdAt: now,
        updatedAt: now
      };

      applyWorkspaceMutation(ws => ({
        ...ws,
        ideas: [...ws.ideas, newIdea]
      }), true);

      showToast(`Idea captured in ${group}.`);
      return newIdea;
    },
    [applyWorkspaceMutation, showToast]
  );

  const updateIdea = useCallback((ideaId: Id, updates: Partial<Idea>, immediate = false) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      ideas: ws.ideas.map(i => (i.id === ideaId ? { ...i, ...updates, updatedAt: nowISO() } : i))
    }), immediate);
  }, [applyWorkspaceMutation]);

  const moveIdeaGroup = useCallback((ideaId: Id, group: IdeaGroup) => {
    applyWorkspaceMutation(ws => {
      const idea = ws.ideas.find(i => i.id === ideaId);
      if (!idea) return ws;
      const countInGroup = ws.ideas.filter(i => i.buildId === idea.buildId && i.group === group).length;

      return {
        ...ws,
        ideas: ws.ideas.map(i =>
          i.id === ideaId ? { ...i, group, order: countInGroup, updatedAt: nowISO() } : i
        )
      };
    }, true);
    showToast(`Idea moved to ${group}.`);
  }, [applyWorkspaceMutation, showToast]);

  const deleteIdea = useCallback((ideaId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      ideas: ws.ideas.filter(i => i.id !== ideaId)
    }), true);
    showToast('Idea removed.');
  }, [applyWorkspaceMutation, showToast]);

  const convertIdea = useCallback(
    (
      ideaId: Id,
      target:
        | { kind: 'feature'; title: string; description: string }
        | { kind: 'task'; milestoneId: Id; title: string; description: string }
    ) => {
      applyWorkspaceMutation(ws => {
        const idea = ws.ideas.find(i => i.id === ideaId);
        if (!idea) return ws;

        const now = nowISO();
        let newFeatures = ws.features;
        let newTasks = ws.tasks;
        let conversionId = '';

        if (target.kind === 'feature') {
          conversionId = generateId('feature');
          const newF: Feature = {
            id: conversionId,
            buildId: idea.buildId,
            title: target.title.trim() || idea.title,
            description: target.description.trim() || idea.description,
            achieved: false,
            order: ws.features.filter(f => f.buildId === idea.buildId).length,
            createdAt: now,
            updatedAt: now
          };
          newFeatures = [...newFeatures, newF];
        } else {
          conversionId = generateId('task');
          const newT: Task = {
            id: conversionId,
            buildId: idea.buildId,
            milestoneId: target.milestoneId,
            title: target.title.trim() || idea.title,
            description: target.description.trim() || idea.description,
            status: 'todo',
            priority: 'normal',
            order: ws.tasks.filter(t => t.milestoneId === target.milestoneId).length,
            boardOrder: ws.tasks.filter(t => t.buildId === idea.buildId && t.status === 'todo').length,
            estimatedMinutes: 20,
            plannedDate: null,
            calendarOrder: ws.tasks.filter(t => t.buildId === idea.buildId && !t.plannedDate).length,
            blocker: '',
            prerequisiteTaskIds: [],
            subtasks: [],
            createdAt: now,
            updatedAt: now
          };
          newTasks = [...newTasks, newT];
        }

        const newIdeas = ws.ideas.map(i =>
          i.id === ideaId
            ? {
                ...i,
                convertedTo: { kind: target.kind, id: conversionId },
                updatedAt: now
              }
            : i
        );

        return {
          ...ws,
          ideas: newIdeas,
          features: newFeatures,
          tasks: newTasks
        };
      }, true);

      showToast(`Idea converted into ${target.kind}.`);
    },
    [applyWorkspaceMutation, showToast]
  );

  // Feature actions
  const addFeature = useCallback((buildId: Id, title: string, description = ''): Feature => {
    const id = generateId('feature');
    const now = nowISO();
    const existing = currentWorkspaceRef.current.features.filter(f => f.buildId === buildId);
    const newF: Feature = {
      id,
      buildId,
      title: title.trim(),
      description: description.trim(),
      achieved: false,
      order: existing.length,
      createdAt: now,
      updatedAt: now
    };

    applyWorkspaceMutation(ws => ({
      ...ws,
      features: [...ws.features, newF]
    }), true);

    showToast(`Feature "${newF.title}" added to first version.`);
    return newF;
  }, [applyWorkspaceMutation, showToast]);

  const updateFeature = useCallback((featureId: Id, updates: Partial<Feature>) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      features: ws.features.map(f =>
        f.id === featureId ? { ...f, ...updates, updatedAt: nowISO() } : f
      )
    }), true);
  }, [applyWorkspaceMutation]);

  const deleteFeature = useCallback((featureId: Id) => {
    applyWorkspaceMutation(ws => {
      // Clean up idea link
      const newIdeas = ws.ideas.map(i => {
        if (i.convertedTo?.kind === 'feature' && i.convertedTo.id === featureId) {
          return { ...i, convertedTo: null, updatedAt: nowISO() };
        }
        return i;
      });

      return {
        ...ws,
        features: ws.features.filter(f => f.id !== featureId),
        ideas: newIdeas
      };
    }, true);
    showToast('Feature removed.');
  }, [applyWorkspaceMutation, showToast]);

  // Note actions
  const addNote = useCallback((buildId: Id, title: string, body = ''): Note => {
    const id = generateId('note');
    const now = nowISO();
    const existing = currentWorkspaceRef.current.notes.filter(n => n.buildId === buildId);
    const newNote: Note = {
      id,
      buildId,
      title: title.trim(),
      body: body.trim(),
      links: [],
      order: existing.length,
      createdAt: now,
      updatedAt: now
    };

    applyWorkspaceMutation(ws => ({
      ...ws,
      notes: [...ws.notes, newNote]
    }), true);

    showToast('Note added.');
    return newNote;
  }, [applyWorkspaceMutation, showToast]);

  const updateNote = useCallback((noteId: Id, updates: Partial<Note>, immediate = false) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      notes: ws.notes.map(n => (n.id === noteId ? { ...n, ...updates, updatedAt: nowISO() } : n))
    }), immediate);
  }, [applyWorkspaceMutation]);

  const deleteNote = useCallback((noteId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      notes: ws.notes.filter(n => n.id !== noteId)
    }), true);
    showToast('Note deleted.');
  }, [applyWorkspaceMutation, showToast]);

  // Review actions
  const addReview = useCallback(
    (buildId: Id, date: CalendarDate, movedForward: string, stuck: string, next: string): Review => {
      const id = generateId('review');
      const now = nowISO();
      const newRev: Review = {
        id,
        buildId,
        date,
        movedForward: movedForward.trim(),
        stuck: stuck.trim(),
        next: next.trim(),
        createdAt: now,
        updatedAt: now
      };

      applyWorkspaceMutation(ws => ({
        ...ws,
        reviews: [newRev, ...ws.reviews]
      }), true);

      showToast('Weekly review recorded.');
      return newRev;
    },
    [applyWorkspaceMutation, showToast]
  );

  const updateReview = useCallback((reviewId: Id, updates: Partial<Review>) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      reviews: ws.reviews.map(r => (r.id === reviewId ? { ...r, ...updates, updatedAt: nowISO() } : r))
    }), false);
  }, [applyWorkspaceMutation]);

  const deleteReview = useCallback((reviewId: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      reviews: ws.reviews.filter(r => r.id !== reviewId)
    }), true);
    showToast('Review removed.');
  }, [applyWorkspaceMutation, showToast]);

  // Next action selection
  const setNextAction = useCallback((buildId: Id, taskId: Id | null, subtaskId?: Id) => {
    applyWorkspaceMutation(ws => ({
      ...ws,
      builds: ws.builds.map(b => {
        if (b.id === buildId) {
          return {
            ...b,
            nextAction: taskId ? { taskId, subtaskId } : null,
            updatedAt: nowISO()
          };
        }
        return b;
      })
    }), true);
    showToast(taskId ? 'Next step selected.' : 'Next step cleared.');
  }, [applyWorkspaceMutation, showToast]);

  // Sample data & reset
  const loadSampleData = useCallback(() => {
    const sampleWs = getSampleWorkspace();
    applyWorkspaceMutation(() => sampleWs, true);
    showToast('Sample builds loaded.');
  }, [applyWorkspaceMutation, showToast]);

  const resetWorkspace = useCallback(() => {
    const emptyWs = createEmptyWorkspace();
    applyWorkspaceMutation(() => emptyWs, true);
    setIsCorrupt(false);
    setRawCorruptData(null);
    showToast('Workspace reset to empty.');
  }, [applyWorkspaceMutation, showToast]);

  // Backups
  const importBackup = useCallback(
    (jsonString: string, mode: 'merge' | 'replace'): { success: boolean; error?: string } => {
      const validation = repository.validateImport(jsonString);
      if (!validation.valid || !validation.backup) {
        return { success: false, error: validation.errors.join('. ') };
      }

      try {
        const result = repository.applyImport(
          validation.backup,
          mode,
          currentWorkspaceRef.current,
          currentRevisionRef.current
        );
        setWorkspace(result.newWorkspace);
        setRevision(result.newRevision);
        currentRevisionRef.current = result.newRevision;
        setIsCorrupt(false);
        setRawCorruptData(null);
        showToast(mode === 'replace' ? 'Backup restored successfully.' : 'Backup merged successfully.');
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    [showToast]
  );

  const exportBackup = useCallback((): string => {
    return repository.exportBackup(currentWorkspaceRef.current, currentRevisionRef.current);
  }, []);

  const retrySave = useCallback(() => {
    commitWorkspaceSave(currentWorkspaceRef.current, true);
  }, [commitWorkspaceSave]);

  const reloadFromStorage = useCallback(() => {
    const loaded = repository.loadWorkspace();
    const cleanWs = deduplicateWorkspace(loaded.workspace);
    setWorkspace(cleanWs);
    setRevision(loaded.revision);
    setIsCorrupt(loaded.isCorrupt);
    setRawCorruptData(loaded.rawCorruptData || null);
    setHasMultiTabConflict(false);
    showToast('Reloaded latest data from storage.');
  }, [showToast]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        revision,
        saveStatus,
        saveErrorMessage,
        isCorrupt,
        rawCorruptData,
        hasMultiTabConflict,
        toastMessage,
        showToast,
        clearToast,
        cloudSyncStatus: cloudStatus,
        syncKey,
        configureCloudSync,
        pairDeviceWithKey,
        manualCloudSync,
        disconnectCloudSync,
        restorePrePairBackup,
        updatePreferences,
        addBuild,
        updateBuild,
        duplicateBuild,
        archiveBuild,
        restoreBuild,
        deleteBuildPermanently,
        changeBuildStatus,
        reorderBuilds,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        moveMilestone,
        addTask,
        updateTask,
        deleteTask,
        moveTaskStatus,
        moveTaskDate,
        moveTaskMilestone,
        reorderTaskCalendar,
        reorderTaskMilestone,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        moveSubtask,
        addIdea,
        updateIdea,
        moveIdeaGroup,
        deleteIdea,
        convertIdea,
        addFeature,
        updateFeature,
        deleteFeature,
        addNote,
        updateNote,
        deleteNote,
        addReview,
        updateReview,
        deleteReview,
        setNextAction,
        loadSampleData,
        resetWorkspace,
        importBackup,
        exportBackup,
        retrySave,
        reloadFromStorage
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
