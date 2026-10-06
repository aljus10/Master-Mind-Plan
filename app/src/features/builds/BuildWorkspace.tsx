import React, { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import { BuildStatus, Id, Task } from '../../domain/types';
import { evaluateNextAction, getReadyTaskCandidates } from '../../domain/readiness';
import { TaskDetailModal } from '../../components/TaskDetailModal';

// Tab components (we will create each one)
import { BuildOverview } from './BuildOverview';
import { BuildPlan } from '../planning/BuildPlan';
import { BuildIdeas } from '../ideas/BuildIdeas';
import { BuildNotes } from '../notes/BuildNotes';

export const BuildWorkspace: React.FC = () => {
  const { buildId, tab = 'overview' } = useParams<{ buildId: string; tab: string }>();
  const navigate = useNavigate();

  const {
    workspace,
    updateBuild,
    duplicateBuild,
    archiveBuild,
    changeBuildStatus,
    setNextAction
  } = useWorkspace();

  const [activeTaskId, setActiveTaskId] = useState<Id | null>(null);

  const build = workspace.builds.find(b => b.id === buildId);

  if (!build) {
    return (
      <div className="empty-state">
        <h3>Build not found</h3>
        <p>The build you requested does not exist or was removed.</p>
        <button type="button" className="primary" onClick={() => navigate('/builds')}>
          Back to Builds
        </button>
      </div>
    );
  }

  const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);
  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);
  const buildIdeas = workspace.ideas.filter(i => i.buildId === build.id);
  const buildNotes = workspace.notes.filter(n => n.buildId === build.id);

  const nextActionEval = evaluateNextAction(build, buildTasks);
  const readyCandidates = getReadyTaskCandidates(build.id, buildMilestones, buildTasks, 3);
  const allRemainingTasksBlocked =
    buildTasks.length > 0 &&
    buildTasks.filter(t => t.status !== 'done').every(t => t.status === 'blocked' || !!t.blocker);

  const handleStatusChange = (newStatus: BuildStatus) => {
    if (newStatus === 'completed') {
      const unfinishedTasks = buildTasks.filter(t => t.status !== 'done');
      if (unfinishedTasks.length > 0) {
        if (!window.confirm(`There are still ${unfinishedTasks.length} unfinished tasks. Mark build as completed?`)) {
          return;
        }
      }
    }
    changeBuildStatus(build.id, newStatus);
  };

  return (
    <div>
      {/* Workspace Header */}
      <div className="heading">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={build.title}
            onChange={e => updateBuild(build.id, { title: e.target.value })}
            placeholder="Build Title"
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: '-1px',
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text)',
              width: '100%',
              outline: 'none',
              marginBottom: 4
            }}
          />
          <input
            type="text"
            value={build.description}
            onChange={e => updateBuild(build.id, { description: e.target.value })}
            placeholder="Add one-sentence purpose..."
            style={{
              fontSize: 14,
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--secondary)',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        <div className="heading-right">
          <select
            value={build.status}
            onChange={e => handleStatusChange(e.target.value as BuildStatus)}
            style={{
              padding: '6px 12px',
              borderRadius: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            <option value="idea">● Idea</option>
            <option value="planned">● Planned</option>
            <option value="active">● Active</option>
            <option value="paused">● Paused</option>
            <option value="completed">● Completed</option>
          </select>

          <button
            type="button"
            className="icon-btn"
            onClick={() => updateBuild(build.id, { pinned: !build.pinned })}
            title={build.pinned ? 'Unpin build' : 'Pin to top'}
            aria-label="Pin build"
          >
            ★
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              const dup = duplicateBuild(build.id);
              navigate(`/builds/${dup.id}/overview`);
            }}
            title="Duplicate build"
            aria-label="Duplicate build"
          >
            ⎘
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              archiveBuild(build.id);
              navigate('/builds');
            }}
            title="Archive build"
            aria-label="Archive build"
          >
            📥
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Build workspace sections">
        <NavLink
          to={`/builds/${build.id}/overview`}
          className={tab === 'overview' ? 'active' : ''}
          role="tab"
          aria-selected={tab === 'overview'}
        >
          Overview
        </NavLink>
        <NavLink
          to={`/builds/${build.id}/plan`}
          className={tab === 'plan' ? 'active' : ''}
          role="tab"
          aria-selected={tab === 'plan'}
        >
          Plan
        </NavLink>
        <NavLink
          to={`/builds/${build.id}/ideas`}
          className={tab === 'ideas' ? 'active' : ''}
          role="tab"
          aria-selected={tab === 'ideas'}
        >
          Ideas <span className="tab-badge">{buildIdeas.length}</span>
        </NavLink>
        <NavLink
          to={`/builds/${build.id}/notes`}
          className={tab === 'notes' ? 'active' : ''}
          role="tab"
          aria-selected={tab === 'notes'}
        >
          Notes <span className="tab-badge">{buildNotes.length}</span>
        </NavLink>
      </div>

      {/* Next Action Strip */}
      <section className="next-strip" aria-label="Selected next action">
        <div className="next-icon">↗</div>
        {nextActionEval.isValid && nextActionEval.task ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <small>Your next action</small>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong>
                {nextActionEval.subtask
                  ? `${nextActionEval.task.title} → ${nextActionEval.subtask.title}`
                  : nextActionEval.task.title}
              </strong>
              {nextActionEval.blockerInfo?.isBlocked && (
                <span className="pill blocked" style={{ fontSize: 10, padding: '2px 8px' }}>
                  ⚠ Blocked: {nextActionEval.blockerInfo.summaryReason}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <small>Next step needed</small>
            {buildTasks.length === 0 ? (
              <span style={{ color: 'var(--secondary)', fontSize: 13 }}>
                No tasks yet. Break down your first milestone under Plan.
              </span>
            ) : allRemainingTasksBlocked ? (
              <span style={{ color: 'var(--warning)', fontSize: 13 }}>
                All remaining tasks are blocked. Review blockers under Plan.
              </span>
            ) : readyCandidates.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <span style={{ color: 'var(--secondary)', fontSize: 13 }}>Ready candidates:</span>
                {readyCandidates.map(cand => (
                  <button
                    key={cand.id}
                    type="button"
                    className="secondary"
                    style={{ minHeight: 30, padding: '2px 8px', fontSize: 11 }}
                    onClick={() => setNextAction(build.id, cand.id)}
                  >
                    ＋ {cand.title}
                  </button>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--secondary)', fontSize: 13 }}>
                Choose a next step from the Plan tab.
              </span>
            )}
          </div>
        )}

        {nextActionEval.task && (
          <div className="actions">
            <span className="next-meta">
              {nextActionEval.task.estimatedMinutes ? `${nextActionEval.task.estimatedMinutes} min • ` : ''}
              {nextActionEval.task.status}
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => setActiveTaskId(nextActionEval.task!.id)}
            >
              Open task ↗
            </button>
          </div>
        )}
      </section>

      {/* Tab Content */}
      <div style={{ marginTop: 20 }}>
        {tab === 'overview' && <BuildOverview build={build} onOpenTask={setActiveTaskId} />}
        {tab === 'plan' && <BuildPlan build={build} onOpenTask={setActiveTaskId} />}
        {tab === 'ideas' && <BuildIdeas build={build} onOpenTask={setActiveTaskId} />}
        {tab === 'notes' && <BuildNotes build={build} />}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
    </div>
  );
};
