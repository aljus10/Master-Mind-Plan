import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, BuildStatus } from '../../domain/types';
import { calculateProgress } from '../../domain/readiness';
import { StatusChip } from '../../components/StatusChip';
import { AddBuildModal } from '../../components/AddBuildModal';

const STATUS_COLUMNS: { id: BuildStatus; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' }
];

export const BuildsPage: React.FC = () => {
  const {
    workspace,
    updateBuild,
    duplicateBuild,
    archiveBuild,
    changeBuildStatus,
    reorderBuilds,
    updatePreferences,
    loadSampleData
  } = useWorkspace();

  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const buildsView =
    workspace.preferences.buildsView ||
    (typeof window !== 'undefined' && window.innerWidth <= 700 ? 'grid' : 'board');

  const nonArchivedBuilds = workspace.builds.filter(b => !b.archivedAt);

  const filteredBuilds = nonArchivedBuilds.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchDesc = b.description.toLowerCase().includes(q);
      const matchCat = b.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, buildId: string) => {
    e.dataTransfer.setData('text/plain', `build:${buildId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  const handleDropColumn = (e: React.DragEvent, targetStatus: BuildStatus) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('build:')) return;
    const buildId = data.slice(6);
    changeBuildStatus(buildId, targetStatus);
  };

  const renderBuildCard = (build: Build) => {
    const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);
    const progress = calculateProgress(buildTasks);
    const nextActionTask = build.nextAction
      ? workspace.tasks.find(t => t.id === build.nextAction?.taskId)
      : null;

    return (
      <div
        key={build.id}
        className="build-card"
        draggable
        onDragStart={e => handleDragStart(e, build.id)}
        onClick={() => navigate(`/builds/${build.id}/overview`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter') navigate(`/builds/${build.id}/overview`);
        }}
        aria-label={`Open build ${build.title}`}
      >
        <div className="build-card-header">
          <div className="build-card-status-group">
            <StatusChip status={build.status} type="build" />
          </div>

          <div
            className="build-card-actions"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className={`icon-btn ${build.pinned ? 'is-pinned' : ''}`}
              onClick={() => updateBuild(build.id, { pinned: !build.pinned })}
              title={build.pinned ? 'Pinned to top (click to unpin)' : 'Pin to top'}
              aria-label={build.pinned ? 'Unpin build' : 'Pin to top'}
            >
              ★
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => duplicateBuild(build.id)}
              title="Duplicate build"
              aria-label="Duplicate build"
            >
              ⎘
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => archiveBuild(build.id)}
              title="Archive build"
              aria-label="Archive build"
            >
              📥
            </button>
          </div>
        </div>

        {build.category && (
          <div className="build-card-category">{build.category}</div>
        )}

        <h2>{build.title}</h2>
        <p>{build.description || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No purpose defined yet</span>}</p>

        {nextActionTask ? (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: '#1a1724',
              border: '1px solid #3b324d',
              fontSize: 12,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ color: 'var(--accent)', fontSize: 11 }}>↗ Next:</span>
            <span style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextActionTask.title}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            {buildTasks.length === 0 ? 'Not planned yet' : 'No next action selected'}
          </div>
        )}

        <div className="build-card-footer">
          <span>{progress.label}</span>
          <span style={{ color: 'var(--accent)', fontSize: 11 }}>Open Workspace →</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header bar */}
      <div className="heading">
        <div>
          <h1>My Builds</h1>
          <p>A home for the projects and ideas you want to make room for.</p>
        </div>
        <div className="heading-right">
          <div className="segmented" aria-label="Build layout view">
            <button
              className={buildsView === 'board' ? 'active' : ''}
              onClick={() => updatePreferences({ buildsView: 'board' })}
              title="Board view by status"
            >
              Board
            </button>
            <button
              className={buildsView === 'grid' ? 'active' : ''}
              onClick={() => updatePreferences({ buildsView: 'grid' })}
              title="Grid view"
            >
              Grid
            </button>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            ＋ Add Build
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search builds by name, purpose, or category..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13
            }}
          />
        </div>

        <div className="filter-chips-scroll">
          <div className="segmented" aria-label="Filter builds by status">
            <button
              className={filterStatus === 'all' ? 'active' : ''}
              onClick={() => setFilterStatus('all')}
            >
              All ({nonArchivedBuilds.length})
            </button>
            {STATUS_COLUMNS.map(col => {
              const count = nonArchivedBuilds.filter(b => b.status === col.id).length;
              return (
                <button
                  key={col.id}
                  className={filterStatus === col.id ? 'active' : ''}
                  onClick={() => setFilterStatus(col.id)}
                >
                  {col.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main builds display */}
      {nonArchivedBuilds.length === 0 ? (
        <div className="empty-state">
          <h3>Make room for your next idea.</h3>
          <p>
            Capture your future projects without having to plan everything upfront. A simple title is all
            it takes to start.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              Add your first build
            </button>
            <button
              type="button"
              className="secondary"
              onClick={loadSampleData}
            >
              Try sample builds
            </button>
          </div>
        </div>
      ) : filteredBuilds.length === 0 ? (
        <div className="empty-state">
          <h3>No matching builds</h3>
          <p>No builds match your current search or filter query.</p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearch('');
              setFilterStatus('all');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : buildsView === 'grid' || filterStatus !== 'all' ? (
        <div className="cards-grid">
          {filteredBuilds
            .sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return a.order - b.order;
            })
            .map(renderBuildCard)}
        </div>
      ) : (
        /* Board view with 5 columns */
        <div className="builds-board">
          {STATUS_COLUMNS.map(col => {
            const columnBuilds = filteredBuilds
              .filter(b => b.status === col.id)
              .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return a.order - b.order;
              });

            return (
              <section
                key={col.id}
                className="board-column"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDropColumn(e, col.id)}
                aria-label={`${col.label} column, ${columnBuilds.length} builds`}
              >
                <h3>
                  <span>{col.label}</span>
                  <span className="column-count">{columnBuilds.length}</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {columnBuilds.map(renderBuildCard)}
                  {columnBuilds.length === 0 && (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontSize: 12,
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: 8,
                        marginTop: 8
                      }}
                    >
                      Drag builds here
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AddBuildModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
