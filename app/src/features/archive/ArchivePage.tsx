import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build } from '../../domain/types';
import { Modal } from '../../components/Modal';

export const ArchivePage: React.FC = () => {
  const { workspace, restoreBuild, deleteBuildPermanently } = useWorkspace();

  const [search, setSearch] = useState('');
  const [deleteConfirmBuild, setDeleteConfirmBuild] = useState<Build | null>(null);

  const archivedBuilds = workspace.builds.filter(b => !!b.archivedAt);
  const filtered = archivedBuilds.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="heading">
        <div>
          <h1>Archive</h1>
          <p>Projects put aside or completed. Restore anytime without losing your notes, steps, or ideas.</p>
        </div>
      </div>

      {archivedBuilds.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archived builds..."
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13,
              maxWidth: 360,
              width: '100%'
            }}
          />
        </div>
      )}

      {archivedBuilds.length === 0 ? (
        <div className="overview-panel">
          <h3>No archived builds</h3>
          <p>
            When you put a project on hold or finish its initial roadmap, you can archive it from its
            workspace header. All contained milestones, tasks, ideas, and notes are preserved.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="overview-panel">
          <h3>No matching archived builds</h3>
          <p>Try clearing your search query.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(build => {
            const mCount = workspace.milestones.filter(m => m.buildId === build.id).length;
            const tCount = workspace.tasks.filter(t => t.buildId === build.id).length;
            const iCount = workspace.ideas.filter(i => i.buildId === build.id).length;

            return (
              <div
                key={build.id}
                className="overview-panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 22px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{build.title}</h3>
                    <span className={`pill ${build.status}`}>{build.status}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                    Archived on {build.archivedAt?.slice(0, 10)} • {mCount} milestones • {tCount} tasks • {iCount} ideas
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => restoreBuild(build.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setDeleteConfirmBuild(build)}
                  >
                    Permanently delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {deleteConfirmBuild && (
        <Modal
          isOpen={!!deleteConfirmBuild}
          onClose={() => setDeleteConfirmBuild(null)}
          title={`Permanently delete "${deleteConfirmBuild.title}"?`}
        >
          {(() => {
            const mCount = workspace.milestones.filter(m => m.buildId === deleteConfirmBuild.id).length;
            const tCount = workspace.tasks.filter(t => t.buildId === deleteConfirmBuild.id).length;
            const iCount = workspace.ideas.filter(i => i.buildId === deleteConfirmBuild.id).length;

            return (
              <div>
                <p style={{ color: 'var(--error)' }}>
                  This action cannot be undone. All contained data will be permanently removed from your
                  local storage:
                </p>
                <ul style={{ color: 'var(--secondary)', fontSize: 13, lineHeight: 1.8 }}>
                  <li>{mCount} milestone(s)</li>
                  <li>{tCount} task(s)</li>
                  <li>{iCount} idea(s)</li>
                  <li>All associated features, notes, and reviews</li>
                </ul>

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setDeleteConfirmBuild(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      deleteBuildPermanently(deleteConfirmBuild.id);
                      setDeleteConfirmBuild(null);
                    }}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
