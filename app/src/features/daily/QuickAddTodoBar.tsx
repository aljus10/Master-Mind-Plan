import React, { useState, useRef, useEffect } from 'react';
import { CalendarDate, Id } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import { parseYapInput } from '../../domain/yapParser';

interface QuickAddTodoBarProps {
  currentDate: CalendarDate;
  onAdded?: () => void;
}

export const QuickAddTodoBar: React.FC<QuickAddTodoBarProps> = ({ currentDate, onAdded }) => {
  const { workspace, addDailyTodo, addDailyTodosBatch } = useWorkspace();
  const [text, setText] = useState('');
  const [selectedBuildId, setSelectedBuildId] = useState<Id | ''>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeBuilds = workspace.builds
    .filter(b => !b.archivedAt && b.status !== 'completed')
    .sort((a, b) => a.title.localeCompare(b.title));

  const isMultiLine = text.includes('\n');
  const parsedItems = isMultiLine ? parseYapInput(text, currentDate) : [];

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const buildIdToAttach = selectedBuildId ? selectedBuildId : null;

    if (isMultiLine) {
      const items = parseYapInput(trimmed, currentDate).map(item => ({
        ...item,
        buildId: buildIdToAttach
      }));

      if (items.length > 0) {
        addDailyTodosBatch(items);
        setText('');
        setIsExpanded(false);
        if (onAdded) onAdded();
      }
    } else {
      addDailyTodo(trimmed, currentDate, '', buildIdToAttach);
      setText('');
      if (onAdded) onAdded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter inserts newline
        return;
      }
      if (e.ctrlKey || e.metaKey || !isMultiLine) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <form className="quick-add-bar" onSubmit={handleSubmit}>
      <div className="quick-add-inner">
        <div className="quick-add-icon-col" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="quick-add-plus-icon">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>

        <div className="quick-add-input-col">
          <textarea
            ref={textareaRef}
            className="quick-add-textarea"
            placeholder={
              isExpanded || isMultiLine
                ? "Dump today's thoughts, bullet points, voice yap, or paste notes..."
                : "Add a task for today (or paste thoughts/yap)..."
            }
            value={text}
            onChange={e => {
              setText(e.target.value);
              if (e.target.value.includes('\n') && !isExpanded) {
                setIsExpanded(true);
              }
            }}
            onFocus={() => {
              if (text.length > 30) setIsExpanded(true);
            }}
            onKeyDown={handleKeyDown}
            rows={isExpanded || isMultiLine ? 3 : 1}
          />

          {(isExpanded || isMultiLine || selectedBuildId) && (
            <div className="quick-add-toolbar">
              <div className="quick-add-build-picker">
                <span className="picker-label">Project:</span>
                <select
                  value={selectedBuildId}
                  onChange={e => setSelectedBuildId(e.target.value)}
                  className="quick-add-build-select"
                >
                  <option value="">No Project (General task)</option>
                  {activeBuilds.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              {isMultiLine && parsedItems.length > 0 && (
                <span className="quick-add-yap-pill">
                  {parsedItems.length} item{parsedItems.length > 1 ? 's' : ''} detected
                </span>
              )}

              <div className="quick-add-actions">
                {isMultiLine && (
                  <small className="quick-add-hint">Ctrl+Enter to save all</small>
                )}
                <button
                  type="submit"
                  className="btn-primary quick-add-submit-btn"
                  disabled={!text.trim()}
                >
                  Add {isMultiLine && parsedItems.length > 1 ? `(${parsedItems.length})` : 'Task'}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isExpanded && !isMultiLine && (
          <div className="quick-add-trailing">
            {activeBuilds.length > 0 && (
              <select
                value={selectedBuildId}
                onChange={e => setSelectedBuildId(e.target.value)}
                className="quick-add-build-select compact"
                title="Attach to project"
              >
                <option value="">Project: None</option>
                {activeBuilds.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              className="btn-primary quick-add-submit-btn"
              disabled={!text.trim()}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </form>
  );
};
