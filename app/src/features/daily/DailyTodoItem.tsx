import React, { useState } from 'react';
import { DailyTodo } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import { shiftDays, getTodayDate, formatFriendlyDate } from '../../domain/dates';
import { useNavigate } from 'react-router-dom';

interface DailyTodoItemProps {
  todo: DailyTodo;
  onFocus?: (todo: DailyTodo) => void;
}

export const DailyTodoItem: React.FC<DailyTodoItemProps> = ({ todo, onFocus }) => {
  const {
    workspace,
    toggleDailyTodo,
    updateDailyTodo,
    deleteDailyTodo
  } = useWorkspace();
  const navigate = useNavigate();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(todo.title);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editedNotes, setEditedNotes] = useState(todo.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const associatedBuild = todo.buildId
    ? workspace.builds.find(b => b.id === todo.buildId)
    : null;

  const handleTitleSubmit = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== todo.title) {
      updateDailyTodo(todo.id, { title: trimmed });
    } else {
      setEditedTitle(todo.title);
    }
    setIsEditingTitle(false);
  };

  const handleNotesBlur = () => {
    if (editedNotes !== todo.notes) {
      updateDailyTodo(todo.id, { notes: editedNotes });
    }
  };

  const handleMoveToTomorrow = () => {
    const tomorrow = shiftDays(todo.date, 1);
    updateDailyTodo(todo.id, { date: tomorrow });
  };

  const handleDateChange = (newDate: string) => {
    if (newDate && newDate !== todo.date) {
      updateDailyTodo(todo.id, { date: newDate });
      setShowDatePicker(false);
    }
  };

  const handleToggle = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    toggleDailyTodo(todo.id);
  };

  const formatCompletedTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`daily-todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="daily-todo-main-row">
        {/* Optical checkbox */}
        <label className="daily-checkbox-container" title={todo.completed ? 'Mark incomplete' : 'Mark complete'}>
          <input
            type="checkbox"
            className="daily-checkbox-input"
            checked={todo.completed}
            onChange={handleToggle}
            aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          />
          <span className="daily-checkbox-visual">
            <svg viewBox="0 0 24 24" className="daily-checkbox-check" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </label>

        {/* Content & Inline Edit */}
        <div className="daily-todo-content">
          {isEditingTitle ? (
            <input
              type="text"
              className="daily-todo-title-edit"
              value={editedTitle}
              autoFocus
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setEditedTitle(todo.title);
                  setIsEditingTitle(false);
                }
              }}
            />
          ) : (
            <div
              className="daily-todo-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit task title"
            >
              {todo.title}
            </div>
          )}

          {/* Metadata badges row */}
          <div className="daily-todo-meta">
            {associatedBuild && (
              <span
                className="daily-meta-badge build-badge"
                onClick={() => navigate(`/builds/${associatedBuild.id}/overview`)}
                title="View linked project workspace"
              >
                📁 {associatedBuild.title}
              </span>
            )}

            {todo.rolledFromDate && (
              <span className="daily-meta-badge rolled-badge" title={`Rolled over from ${todo.rolledFromDate}`}>
                ↺ Rolled from {formatFriendlyDate(todo.rolledFromDate)}
              </span>
            )}

            {todo.completed && todo.completedAt && (
              <span className="daily-meta-badge completed-badge">
                ✓ Done {formatCompletedTime(todo.completedAt)}
              </span>
            )}

            {/* Notes Toggle Pill */}
            {(todo.notes || isNotesOpen) ? (
              <button
                type="button"
                className={`daily-notes-toggle ${isNotesOpen ? 'open' : ''}`}
                onClick={() => setIsNotesOpen(prev => !prev)}
                title="Toggle notes drawer"
              >
                📝 {isNotesOpen ? 'Hide notes' : 'View notes'}
              </button>
            ) : (
              <button
                type="button"
                className="daily-notes-add-btn"
                onClick={() => setIsNotesOpen(true)}
                title="Add notes, email draft, or code"
              >
                + note
              </button>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="daily-todo-actions">
          {!todo.completed && onFocus && (
            <button
              type="button"
              className="daily-action-btn focus-action-btn"
              onClick={() => onFocus(todo)}
              title="Enter Focus Mode on this task"
              aria-label="Focus on this task"
            >
              <span className="focus-dot" /> Focus
            </button>
          )}

          {!todo.completed && (
            <button
              type="button"
              className="daily-action-btn"
              onClick={handleMoveToTomorrow}
              title="Move to tomorrow"
              aria-label="Move to tomorrow"
            >
              Tomorrow →
            </button>
          )}

          <div className="daily-date-picker-wrapper">
            <button
              type="button"
              className="daily-action-btn icon-only"
              onClick={() => setShowDatePicker(prev => !prev)}
              title="Pick a different date"
              aria-label="Reschedule task"
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            {showDatePicker && (
              <input
                type="date"
                className="daily-inline-date-input"
                autoFocus
                defaultValue={todo.date}
                onChange={e => handleDateChange(e.target.value)}
                onBlur={() => setShowDatePicker(false)}
              />
            )}
          </div>

          <button
            type="button"
            className="daily-action-btn icon-only delete"
            onClick={() => deleteDailyTodo(todo.id)}
            title="Delete task"
            aria-label="Delete task"
          >
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Notes Drawer */}
      {isNotesOpen && (
        <div className="daily-todo-notes-drawer">
          <textarea
            className="daily-notes-textarea"
            placeholder="Add notes, email drafts, links, or snippets for this task..."
            value={editedNotes}
            onChange={e => setEditedNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={Math.max(3, editedNotes.split('\n').length)}
          />
        </div>
      )}
    </div>
  );
};
