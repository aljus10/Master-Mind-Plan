import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { repository, STORAGE_KEY } from '../../storage/repository';
import { ValidationResult } from '../../storage/validation';
import { Modal } from '../../components/Modal';
import { getSupabaseConfig } from '../../storage/supabaseSync';

export const SettingsPage: React.FC = () => {
  const {
    workspace,
    revision,
    updatePreferences,
    exportBackup,
    importBackup,
    loadSampleData,
    resetWorkspace,
    showToast,
    cloudSyncStatus,
    syncKey,
    configureCloudSync,
    pairDeviceWithKey,
    manualCloudSync,
    disconnectCloudSync,
    restorePrePairBackup
  } = useWorkspace();

  const [importValidation, setImportValidation] = useState<ValidationResult | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Cloud sync form state
  const [targetPairKey, setTargetPairKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [showCloudConfig, setShowCloudConfig] = useState(() => !getSupabaseConfig().url || !getSupabaseConfig().anonKey);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  // Download backup handler
  const handleDownloadBackup = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `future-builds-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.');
  };

  // Handle file select for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setImportJsonText(text);

      const validation = repository.validateImport(text);
      setImportValidation(validation);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  // Confirm and apply import
  const handleApplyImport = () => {
    if (!importValidation?.valid || !importJsonText) return;

    if (importMode === 'replace') {
      // Step 1: Export current data before replacement as safety backup
      try {
        const preReplaceBackup = exportBackup();
        const blob = new Blob([preReplaceBackup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-pre-replace-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Could not generate safety backup. Aborting replace operation.');
        return;
      }
    }

    const res = importBackup(importJsonText, importMode);
    if (res.success) {
      setIsImportModalOpen(false);
      setImportValidation(null);
      setImportJsonText('');
    } else {
      alert(`Import error: ${res.error}`);
    }
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPairKey.trim()) return;
    setIsPairingLoading(true);
    await pairDeviceWithKey(targetPairKey.trim());
    setIsPairingLoading(false);
    setTargetPairKey('');
  };

  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      showToast('Please enter both Supabase URL and Anon Key');
      return;
    }
    setIsPairingLoading(true);
    await configureCloudSync(supabaseUrl.trim(), supabaseAnonKey.trim());
    setIsPairingLoading(false);
  };

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(syncKey);
      showToast('Pairing key copied to clipboard!');
    }
  };

  return (
    <div>
      <div className="heading">
        <div>
          <h1>Settings & Storage</h1>
          <p>Local backup, import, preferences, and data privacy.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
        {/* Real-Time Cloud Sync & Device Pairing Panel */}
        <div className="overview-panel" style={{ border: '1px solid #3d3550', background: '#111017' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>☁</span> Real-Time Cloud Sync & Device Pairing
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                Keep your Windows PC and Mobile Phone automatically in sync in real time.
              </p>
            </div>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 500,
                  background:
                    cloudSyncStatus === 'connected'
                      ? '#172b1d'
                      : cloudSyncStatus === 'syncing'
                      ? '#2b2315'
                      : '#1c1b24',
                  color:
                    cloudSyncStatus === 'connected'
                      ? '#58d68d'
                      : cloudSyncStatus === 'syncing'
                      ? '#f5b041'
                      : 'var(--muted)',
                  border: `1px solid ${cloudSyncStatus === 'connected' ? '#235933' : '#333140'}`
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background:
                      cloudSyncStatus === 'connected'
                        ? '#58d68d'
                        : cloudSyncStatus === 'syncing'
                        ? '#f5b041'
                        : '#68667a'
                  }}
                />
                {cloudSyncStatus === 'connected'
                  ? 'Cloud Connected'
                  : cloudSyncStatus === 'syncing'
                  ? 'Syncing...'
                  : 'Local Only'}
              </span>
            </div>
          </div>

          {/* Supabase Cloud Database Setup */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--text)' }}>
                  🌐 Supabase Project Connection
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  Enter the credentials from your Supabase project (from Project Settings → API).
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowCloudConfig(prev => !prev)}
                style={{ fontSize: 12, padding: '5px 10px', minHeight: 32 }}
              >
                {showCloudConfig ? '▲ Hide Form' : '⚙ Edit Supabase Credentials'}
              </button>
            </div>

            {showCloudConfig && (
              <form
                onSubmit={handleSaveCloudConfig}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: 'var(--surface-raised)',
                  padding: '14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  marginBottom: 16
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: '#16151f',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                      minHeight: 40
                    }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                    Found in Supabase under Project Settings → API → Project URL
                  </small>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: '#16151f',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                      minHeight: 40
                    }}
                  />
                  <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                    Found in Supabase under Project Settings → API → Project API Keys (anon public)
                  </small>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    className="primary"
                    disabled={isPairingLoading}
                    style={{ fontSize: 13, padding: '9px 18px', minHeight: 40 }}
                  >
                    {isPairingLoading ? 'Connecting...' : '💾 Save & Connect Cloud'}
                  </button>
                  {cloudSyncStatus !== 'disabled' && (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={disconnectCloudSync}
                      style={{ fontSize: 12, padding: '8px 14px', minHeight: 40 }}
                    >
                      Disconnect Cloud
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Device Pairing Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* This Device's Key */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px'
                    }}
                  >
                    This Device's Pairing Key
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: '1px',
                      color: 'var(--accent)',
                      marginTop: 2
                    }}
                  >
                    {syncKey}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleCopyKey}
                    style={{ fontSize: 12, padding: '7px 12px', minHeight: 36 }}
                  >
                    📋 Copy Key
                  </button>
                  {cloudSyncStatus === 'connected' && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={manualCloudSync}
                      style={{ fontSize: 12, padding: '7px 12px', minHeight: 36 }}
                    >
                      🔄 Sync Now
                    </button>
                  )}
                </div>
              </div>

              {/* Pair With Another Device Form */}
              <form
                onSubmit={handlePair}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: 'var(--surface-raised)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}
              >
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  🔗 Link to Another Device (PC or Phone)
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Enter Pairing Key (e.g. MIND-XXXX)"
                    value={targetPairKey}
                    onChange={e => setTargetPairKey(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: '9px 12px',
                      borderRadius: 6,
                      background: '#16151f',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                      minHeight: 40,
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="submit"
                    className="primary"
                    disabled={isPairingLoading || !targetPairKey.trim()}
                    style={{ fontSize: 13, minHeight: 40, padding: '0 16px' }}
                  >
                    {isPairingLoading ? 'Pairing...' : 'Link Device'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 8 }}>
                  <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                    Enter the pairing key from your other device to synchronize your workspaces instantly.
                  </small>
                  <button
                    type="button"
                    className="secondary"
                    onClick={restorePrePairBackup}
                    style={{ fontSize: 11, padding: '3px 8px', minHeight: 26 }}
                    title="Restore workspace snapshot from before the last pairing operation"
                  >
                    ↺ Restore Pre-Pairing Snapshot
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Windows Native Desktop Storage Indicator */}
        {window.electronAPI?.isElectron && (
          <div className="overview-panel" style={{ border: '1px solid #4a3e66', background: '#13111c' }}>
            <h3 style={{ color: 'var(--accent)' }}>💻 Windows Desktop Physical Storage</h3>
            <p>
              Master Mind Plan is running as a native Windows desktop application. Your builds, calendar
              dates, and progress are stored directly as a real JSON file on your computer's hard drive.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => window.electronAPI?.revealDataFolder()}
              >
                📁 Open File Location in Windows Explorer
              </button>
            </div>
          </div>
        )}

        {/* Local Storage Privacy Note */}
        <div className="overview-panel">
          <h3>Local Storage Privacy</h3>
          <p>
            Future Build Organizer stores your data directly in this browser using local storage (key:{' '}
            <code>{STORAGE_KEY}</code>).
            <br />
            No account, remote server, or external service is involved. Always keep downloadable JSON
            backups before clearing browser data or switching devices.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Storage revision: <strong>{revision}</strong> • {workspace.builds.length} builds •{' '}
              {workspace.tasks.length} tasks
            </span>
          </div>
        </div>

        {/* Backup and Restore */}
        <div className="overview-panel">
          <h3>Backup & Restore</h3>
          <p>
            Export all your builds, milestones, scheduled dates, notes, and ideas into a single validated
            JSON file. You can restore this file anytime on any computer.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              type="button"
              className="primary"
              onClick={handleDownloadBackup}
            >
              ⬇ Download Backup (.json)
            </button>

            <label className="secondary" style={{ cursor: 'pointer' }}>
              ⬆ Import Backup File
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Start Area Preference */}
        <div className="overview-panel">
          <h3>Default Landing Area</h3>
          <p>Choose where Future Build Organizer should open when you visit the root URL.</p>

          <div className="segmented" style={{ display: 'inline-flex', marginTop: 8 }}>
            <button
              type="button"
              className={workspace.preferences.startArea === 'builds' ? 'active' : ''}
              onClick={() => updatePreferences({ startArea: 'builds' })}
            >
              All Builds
            </button>
            <button
              type="button"
              className={workspace.preferences.startArea === 'next' ? 'active' : ''}
              onClick={() => updatePreferences({ startArea: 'next' })}
            >
              Next Steps
            </button>
          </div>
        </div>

        {/* Sample Data & Reset */}
        <div className="overview-panel">
          <h3>Sample Data & Reset</h3>
          <p>
            Load the Journal and Future Build Organizer sample blueprints to test out the calendar, or
            reset your workspace to a clean empty state.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (
                  workspace.builds.length > 0 &&
                  !window.confirm('Load sample builds? This will replace your current workspace with the starter package.')
                ) {
                  return;
                }
                loadSampleData();
              }}
            >
              Load Sample Builds
            </button>

            <button
              type="button"
              className="danger-btn"
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to reset your workspace? All local builds will be erased. Download a backup first if you want to keep them.'
                  )
                ) {
                  resetWorkspace();
                }
              }}
            >
              Clear & Reset Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      {isImportModalOpen && importValidation && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Backup File"
        >
          <div>
            {!importValidation.valid ? (
              <div>
                <p style={{ color: 'var(--error)' }}>
                  This backup file failed validation and cannot be imported without risking data corruption:
                </p>
                <ul style={{ color: 'var(--error)', fontSize: 12, maxHeight: 180, overflowY: 'auto' }}>
                  {importValidation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p>The backup file is valid. Review the contents below before proceeding:</p>
                <div
                  style={{
                    background: 'var(--surface-raised)',
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.8,
                    marginBottom: 16
                  }}
                >
                  <div>
                    • <strong>{importValidation.summary?.buildsCount}</strong> Builds
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.milestonesCount}</strong> Milestones
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.tasksCount}</strong> Tasks
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.ideasCount}</strong> Ideas
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.featuresCount}</strong> Features
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.notesCount}</strong> Notes
                  </div>
                  <div>
                    • <strong>{importValidation.summary?.reviewsCount}</strong> Weekly reviews
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    Choose Import Strategy:
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      marginBottom: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                    />
                    <span>
                      <strong>Merge:</strong> Keep all current work and add incoming items. Any colliding
                      IDs will be safely remapped.
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>
                      <strong>Replace:</strong> Completely replace current workspace with the imported
                      backup. (A safety backup of current data will be downloaded first).
                    </span>
                  </label>
                </div>

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={importMode === 'replace' ? 'danger-btn' : 'primary'}
                    onClick={handleApplyImport}
                  >
                    {importMode === 'replace' ? 'Replace Workspace' : 'Merge into Workspace'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
