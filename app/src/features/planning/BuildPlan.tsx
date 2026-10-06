import React from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, Id, PlanView } from '../../domain/types';
import { calculateProgress } from '../../domain/readiness';
import { CalendarPlanView } from '../calendar/CalendarPlanView';
import { ListPlanView } from './ListPlanView';
import { BoardPlanView } from './BoardPlanView';

interface BuildPlanProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const BuildPlan: React.FC<BuildPlanProps> = ({ build, onOpenTask }) => {
  const { workspace, updateBuild } = useWorkspace();
  const planView = build.planView || 'calendar';

  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);
  const progress = calculateProgress(buildTasks);

  const setPlanView = (v: PlanView) => {
    updateBuild(build.id, { planView: v });
  };

  return (
    <div>
      {/* Plan Toolbar */}
      <div className="plan-toolbar">
        <div className="segmented" role="tablist" aria-label="Plan view mode">
          <button
            type="button"
            className={planView === 'calendar' ? 'active' : ''}
            onClick={() => setPlanView('calendar')}
            role="tab"
            aria-selected={planView === 'calendar'}
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M7 3v4m10-4v4M3 11h18" />
            </svg>
            Calendar
          </button>

          <button
            type="button"
            className={planView === 'list' ? 'active' : ''}
            onClick={() => setPlanView('list')}
            role="tab"
            aria-selected={planView === 'list'}
          >
            <svg viewBox="0 0 24 24">
              <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />
            </svg>
            List
          </button>

          <button
            type="button"
            className={planView === 'board' ? 'active' : ''}
            onClick={() => setPlanView('board')}
            role="tab"
            aria-selected={planView === 'board'}
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="5" height="15" rx="1" />
              <rect x="10" y="4" width="5" height="10" rx="1" />
              <rect x="17" y="4" width="4" height="13" rx="1" />
            </svg>
            Board
          </button>
        </div>

        <span className="progress-label">
          {progress.isUnplanned ? (
            <span>Not planned yet</span>
          ) : (
            <>
              <b>{progress.doneLeafUnits} / {progress.totalLeafUnits}</b> steps complete ({progress.percentage}%)
            </>
          )}
        </span>
      </div>

      {/* Selected View */}
      {planView === 'calendar' && (
        <CalendarPlanView build={build} onOpenTask={onOpenTask} />
      )}
      {planView === 'list' && (
        <ListPlanView build={build} onOpenTask={onOpenTask} />
      )}
      {planView === 'board' && (
        <BoardPlanView build={build} onOpenTask={onOpenTask} />
      )}
    </div>
  );
};
