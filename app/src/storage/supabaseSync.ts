import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Workspace } from '../domain/types';

export const DEFAULT_SUPABASE_URL = 'https://krcpihmfabjoezgthyhe.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyY3BpaG1mYWJqb2V6Z3RoeWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzEzNzMsImV4cCI6MjEwNTI0NzM3M30.0IMF7mD-AxQBiy25Woq1CpRHXF76JlHReMA8ZABAyaE';
export const DEFAULT_SYNC_KEY = 'MIND-5UEF';

export const SYNC_STORAGE_KEYS = {
  SUPABASE_URL: 'future-build-organizer:supabase-url',
  SUPABASE_ANON_KEY: 'future-build-organizer:supabase-anon-key',
  SYNC_KEY: 'future-build-organizer:sync-key',
  LAST_SYNCED_REVISION: 'future-build-organizer:last-synced-rev'
};

let clientInstance: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

/**
 * Retrieves the current Supabase configuration from local settings or env vars,
 * falling back to preconfigured defaults so no manual key entry is required.
 */
export function getSupabaseConfig(): { url: string; anonKey: string; syncKey: string } {
  let url =
    (typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEYS.SUPABASE_URL) : '') ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  let anonKey =
    (typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEYS.SUPABASE_ANON_KEY) : '') ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  let syncKey =
    (typeof localStorage !== 'undefined' ? localStorage.getItem(SYNC_STORAGE_KEYS.SYNC_KEY) : '') ||
    DEFAULT_SYNC_KEY;

  // Auto-heal legacy or collided test keys to canonical key
  if (syncKey === 'MIND-D0CJ' || !syncKey) {
    syncKey = DEFAULT_SYNC_KEY;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_STORAGE_KEYS.SYNC_KEY, syncKey);
    }
  }

  return { url: url.trim(), anonKey: anonKey.trim(), syncKey: syncKey.trim().toUpperCase() };
}

/**
 * Saves Supabase credentials and custom sync key.
 */
export function saveSupabaseConfig(url: string, anonKey: string, syncKey?: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SYNC_STORAGE_KEYS.SUPABASE_URL, url.trim());
  localStorage.setItem(SYNC_STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey.trim());
  if (syncKey) {
    localStorage.setItem(SYNC_STORAGE_KEYS.SYNC_KEY, syncKey.trim().toUpperCase());
  }
  // Reset client instance
  clientInstance = null;
}

/**
 * Clears cloud sync configuration (reverts to default keys).
 */
export function clearSupabaseConfig(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SYNC_STORAGE_KEYS.SUPABASE_URL);
  localStorage.removeItem(SYNC_STORAGE_KEYS.SUPABASE_ANON_KEY);
  localStorage.removeItem(SYNC_STORAGE_KEYS.SYNC_KEY);
  clientInstance = null;
}

/**
 * Gets or creates the singleton Supabase client.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  if (clientInstance && currentUrl === url && currentKey === anonKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
    currentUrl = url;
    currentKey = anonKey;
    return clientInstance;
  } catch (err) {
    console.error('[SupabaseSync] Failed to initialize client:', err);
    return null;
  }
}

/**
 * Uploads local workspace payload to Supabase.
 */
export async function uploadToCloud(
  syncKey: string,
  workspace: Workspace,
  revision: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !syncKey) {
    return { success: false, error: 'Cloud sync not configured' };
  }

  try {
    const { error } = await supabase.from('workspaces').upsert(
      {
        sync_key: syncKey.trim().toUpperCase(),
        workspace_data: workspace,
        revision,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'sync_key' }
    );

    if (error) {
      console.warn('[SupabaseSync] Upload error:', error.message);
      return { success: false, error: error.message };
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_STORAGE_KEYS.LAST_SYNCED_REVISION, String(revision));
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Lightweight check to retrieve only the remote revision number without transferring workspace data.
 */
export async function fetchRemoteRevision(
  syncKey: string
): Promise<{ success: boolean; revision?: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !syncKey) {
    return { success: false, error: 'Cloud sync not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('revision')
      .eq('sync_key', syncKey.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: 'No remote workspace found' };
    }

    return { success: true, revision: data.revision as number };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetches the latest remote workspace payload from Supabase.
 */
export async function fetchFromCloud(
  syncKey: string
): Promise<{ success: boolean; workspace?: Workspace; revision?: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase || !syncKey) {
    return { success: false, error: 'Cloud sync not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('workspace_data, revision, updated_at')
      .eq('sync_key', syncKey.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No remote workspace found for this pairing key' };
    }

    return {
      success: true,
      workspace: data.workspace_data as Workspace,
      revision: data.revision as number
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Subscribes to real-time changes on the shared sync key.
 */
export function subscribeToCloudChanges(
  syncKey: string,
  onRemoteChange: (workspace: Workspace, revision: number) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !syncKey) return () => {};

  const cleanKey = syncKey.trim().toUpperCase();
  const channel = supabase
    .channel(`workspace-sync:${cleanKey}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspaces',
        filter: `sync_key=eq.${cleanKey}`
      },
      payload => {
        const row = payload.new as { workspace_data?: Workspace; revision?: number } | undefined;
        if (row && row.revision !== undefined) {
          if (row.workspace_data) {
            onRemoteChange(row.workspace_data, row.revision);
          } else {
            // If postgres TOAST omitted large json in the realtime packet, fetch full payload
            fetchFromCloud(cleanKey).then(res => {
              if (res.success && res.workspace && res.revision !== undefined) {
                onRemoteChange(res.workspace, res.revision);
              }
            });
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
