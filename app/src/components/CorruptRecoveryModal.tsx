import React from 'react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Modal } from './Modal';

export const CorruptRecoveryModal: React.FC = () => {
  const { isCorrupt, rawCorruptData, resetWorkspace } = useWorkspace();

  if (!isCorrupt) return null;

  const handleDownloadRaw = () => {
    if (!rawCorruptData) return;
    const blob = new Blob([rawCorruptData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrupt-backup-recovery-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isCorrupt} onClose={() => {}} title="Storage Recovery Mode">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: 'var(--error)' }}>
          The data in your browser storage could not be parsed or validated against the schema.
        </p>
        <p>
          To prevent data loss, your existing raw data has been preserved. You can download the raw data
          file to inspect or repair it, or reset the workspace to a clean state.
        </p>

        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={handleDownloadRaw}>
            Download Raw Data
          </button>
          <button
            type="button"
            className="danger-btn"
            onClick={() => {
              if (window.confirm('Resetting will clear the unreadable storage and initialize an empty workspace. Continue?')) {
                resetWorkspace();
              }
            }}
          >
            Reset Workspace
          </button>
        </div>
      </div>
    </Modal>
  );
};
