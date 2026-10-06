import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, BuildStatus, Id } from '../../domain/types';
import { evaluateNextAction, getReadyTaskCandidates } from '../../domain/readiness';
import { TaskDetailModal } from '../../components/TaskDetailModal';

export const NextStepsPage: React.FC = () => {
  const { workspace, setNextAction, moveTaskStatus } = useWorkspace();
  const navigate = useNavigate();

  const [filterBuildStatus, setFilterBuildStatus] = useState<string>('active');
  const [activeTaskId, setActiveTaskId] = useState<Id | null>(null);

  const nonArchivedBuilds = workspace.builds.filter(b => !b.archivedAt);
  const displayedBuilds = nonArchivedBuilds.filter(b => {
    if (filterBuildStatus === 'all') return true;
    return b.status === filterBuildStatus;
  });

  const handleMarkComplete = (taskId: Id) => {
    const task = workspace.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.subtasks.length > 0 && task.subtasks.some(s => !s.done)) {
      if (window.confirm('Complete all smaller subtasks too?')) {
        const res = moveTaskStatus(taskId, 'done', undefined, true);
        if (!res.success) alert(res.reason);
      }
      return;
    }

    const res = moveTaskStatus(taskId, 'done');
    if (!res.success) {
      alert(res.reason);
    }
  };

  return (
    <div>
      <div className="heading">
        <div>
          <h1>Next Steps</h1>
          <p>One clear next action per project. Never reread an entire plan just to get started.</p>
        </div>

        <div className="heading-right">
          <div className="segmented" aria-label="Filter builds">
            <button
              className={filterBuildStatus === 'active' ? 'active' : ''}
              onClick={() => setFilterBuildStatus('active')}
            >
              Active builds
            </button>
            <button
              className={filterBuildStatus === 'all' ? 'active' : ''}
              onClick={() => setFilterBuildStatus('all')}
            >
              All non-archived
            </button>
          </div>
        </div>
      </div>

      {displayedBuilds.length === 0 ? (
        <div className="empty-state">
          <h3>No builds to show</h3>
          <p>
            {filterBuildStatus === 'active'
              ? 'You have no builds with "Active" status right now. Switch to "All non-archived" or activate a build.'
              : 'You have no builds in your workspace.'}
          </p>
          <button type="button" className="primary" onClick={() => navigate('/builds')}>
            Go to Builds
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayedBuilds.map(build => {
            const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);
            const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);
            const nextActionEval = evaluateNextAction(build, buildTasks);
            const milestone = nextActionEval.task
              ? buildMilestones.find(m => m.id === nextActionEval.task?.milestoneId)
              : null;
            const readyCandidates = getReadyTaskCandidates(build.id, buildMilestones, buildTasks, 3);

            return (
              <div
                key={build.id}
                className="overview-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderColor: nextActionEval.isValid ? '#3b324d' : 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{build.title}</h3>
                    {build.description && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                        {build.description}
                      </p>
                    )}
                  </div>
                  <span className={`pill ${build.status}`}>{build.status}</span>
                </div>

                {nextActionEval.isValid && nextActionEval.task ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      background: 'linear-gradient(95deg, #1b1724, #121216 78%)',
                      border: '1px solid #3b324d',
                      borderRadius: 10
                    }}
                  >
                    <div className="next-icon">↗</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <small style={{ color: 'var(--accent)', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>
                        {milestone ? milestone.title : 'Selected Next Step'}
                      </small>
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--text)' }}>
                        {nextActionEval.subtask
                          ? `${nextActionEval.task.title} → ${nextActionEval.subtask.title}`
                          : nextActionEval.task.title}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {nextActionEval.task.estimatedMinutes ? `${nextActionEval.task.estimatedMinutes}m • ` : ''}
                        Status: {nextActionEval.task.status}
                      </span>
                    </div>

                    {nextActionEval.blockerInfo?.isBlocked ? (
                      <div
                        style={{
                          padding: '6px 10px',
                          background: 'var(--warning-bg)',
                          border: '1px solid var(--warning-border)',
                          borderRadius: 6,
                          color: 'var(--warning)',
                          fontSize: 11
                        }}
                      >
                        ⚠ Blocked: {nextActionEval.blockerInfo.summaryReason}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => handleMarkComplete(nextActionEval.task!.id)}
                      >
                        ✓ Mark Complete
                      </button>
                    )}

                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveTaskId(nextActionEval.task!.id)}
                    >
                      Open task ↗
                    </button>
                  </div>
                ) : (
                  /* No next action selected */
                  <div
                    style={{
                      padding: '14px 16px',
                      background: '#15151c',
                      border: '1px dashed var(--border)',
                      borderRadius: 10
                    }}
                  >
                    <div style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 8 }}>
                      No next action currently chosen for this build.
                    </div>
                    {readyCandidates.length > 0 ? (
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                          Choose from ready steps:
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {readyCandidates.map(cand => (
                            <button
                              key={cand.id}
                              type="button"
                              className="secondary"
                              style={{ fontSize: 12, minHeight: 32 }}
                              onClick={() => setNextAction(build.id, cand.id)}
                            >
                              ＋ {cand.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => navigate(`/builds/${build.id}/plan`)}
                      >
                        Open Plan to break down steps →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
    </div>
  );
};
