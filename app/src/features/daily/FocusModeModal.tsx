import React, { useState, useEffect, useRef } from 'react';
import { DailyTodo } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTodo: DailyTodo | null;
  allDayTodos: DailyTodo[];
  onSelectTodo: (todo: DailyTodo) => void;
}

type TimerMode = 'stopwatch' | 'pomodoro';

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  onClose,
  activeTodo,
  allDayTodos,
  onSelectTodo
}) => {
  const { workspace, toggleDailyTodo, updateDailyTodo } = useWorkspace();
  const [timerMode, setTimerMode] = useState<TimerMode>('pomodoro');
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Remaining incomplete tasks
  const pendingTodos = allDayTodos.filter(t => !t.completed);
  const currentTask = activeTodo || pendingTodos[0] || null;
  const linkedBuild = currentTask?.buildId
    ? workspace.builds.find(b => b.id === currentTask.buildId)
    : null;

  // Handle timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => {
          if (timerMode === 'pomodoro') {
            if (prev <= 1) {
              setIsRunning(false);
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
              }
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerMode]);

  // Mode change reset
  const handleModeChange = (mode: TimerMode) => {
    setTimerMode(mode);
    setIsRunning(false);
    setTimerSeconds(mode === 'pomodoro' ? 25 * 60 : 0);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimerSeconds(timerMode === 'pomodoro' ? 25 * 60 : 0);
  };

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mark current task done and advance to next
  const handleCompleteCurrent = () => {
    if (!currentTask) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
    toggleDailyTodo(currentTask.id);

    // Find next pending task
    const nextPending = pendingTodos.find(t => t.id !== currentTask.id);
    if (nextPending) {
      onSelectTodo(nextPending);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompleteCurrent();
        return;
      }
      // Space to toggle timer when not typing in textarea or input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        setIsRunning(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentTask, pendingTodos, onClose]);

  if (!isOpen) return null;

  return (
    <div className="focus-mode-overlay" role="dialog" aria-modal="true" aria-label="Focus Mode">
      <div className="focus-mode-card">
        {/* Top Header */}
        <div className="focus-header">
          <div className="focus-badge">
            <span className="focus-pulse-dot" />
            <span>THE ONE THING</span>
          </div>

          <div className="focus-timer-mode-switcher">
            <button
              type="button"
              className={`focus-pill-btn ${timerMode === 'pomodoro' ? 'active' : ''}`}
              onClick={() => handleModeChange('pomodoro')}
            >
              25m Pomodoro
            </button>
            <button
              type="button"
              className={`focus-pill-btn ${timerMode === 'stopwatch' ? 'active' : ''}`}
              onClick={() => handleModeChange('stopwatch')}
            >
              Stopwatch
            </button>
          </div>

          <button
            type="button"
            className="focus-close-btn"
            onClick={onClose}
            aria-label="Exit Focus Mode (Esc)"
            title="Exit Focus Mode (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Big Ambient Timer */}
        <div className="focus-timer-display">
          <div className="focus-timer-digits tabular-nums">{formatTime(timerSeconds)}</div>
          <div className="focus-timer-controls">
            <button
              type="button"
              className={`focus-timer-toggle-btn ${isRunning ? 'running' : ''}`}
              onClick={() => setIsRunning(prev => !prev)}
            >
              {isRunning ? '⏸ Pause (Space)' : '▶ Start Focus (Space)'}
            </button>
            <button
              type="button"
              className="focus-timer-reset-btn"
              onClick={handleReset}
              title="Reset timer"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Focus Target Card */}
        {currentTask ? (
          <div className="focus-task-container">
            {linkedBuild && (
              <div className="focus-build-chip">
                <svg viewBox="0 0 24 24" className="chip-svg">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>{linkedBuild.title}</span>
              </div>
            )}

            <h2 className="focus-task-title">{currentTask.title}</h2>

            {/* Quick Notes Scratchpad */}
            <div className="focus-notes-scratchpad">
              <label htmlFor="focus-scratchpad-input" className="scratchpad-label">
                Scratchpad / Working Notes
              </label>
              <textarea
                id="focus-scratchpad-input"
                className="focus-notes-textarea"
                placeholder="Jot temporary thoughts, code snippets, or draft notes here (auto-saved to task)..."
                value={currentTask.notes || ''}
                onChange={e => updateDailyTodo(currentTask.id, { notes: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="focus-action-row">
              <button
                type="button"
                className="focus-complete-btn"
                onClick={handleCompleteCurrent}
              >
                ✓ Mark Done & Next (Ctrl+Enter)
              </button>

              {pendingTodos.length > 1 && (
                <button
                  type="button"
                  className="focus-skip-btn"
                  onClick={() => {
                    const currentIndex = pendingTodos.findIndex(t => t.id === currentTask.id);
                    const nextIndex = (currentIndex + 1) % pendingTodos.length;
                    onSelectTodo(pendingTodos[nextIndex]);
                  }}
                >
                  Skip to Next →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="focus-all-clear">
            <div className="focus-all-clear-icon">🎉</div>
            <h3>Everything is accomplished!</h3>
            <p>You have conquered all scheduled tasks for today. Rest, recharge, or add your next blueprint step.</p>
            <button type="button" className="focus-complete-btn" onClick={onClose}>
              Return to Workspace
            </button>
          </div>
        )}

        {/* Footer remaining counter */}
        {pendingTodos.length > 0 && (
          <div className="focus-footer-info">
            <span>{pendingTodos.length} high-leverage {pendingTodos.length === 1 ? 'task' : 'tasks'} remaining today</span>
          </div>
        )}
      </div>
    </div>
  );
};
