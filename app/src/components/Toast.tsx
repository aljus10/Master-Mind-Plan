import React from 'react';
import { useWorkspace } from '../app/WorkspaceContext';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useWorkspace();

  if (!toastMessage) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toastMessage}</span>
      <button
        type="button"
        onClick={clearToast}
        style={{ color: 'var(--muted)', padding: '0 4px', fontSize: 14 }}
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
};
