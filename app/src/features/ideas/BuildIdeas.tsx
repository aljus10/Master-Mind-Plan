import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, Id, Idea, IdeaGroup } from '../../domain/types';
import { Modal } from '../../components/Modal';

const IDEA_GROUPS: { id: IdeaGroup; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'candidate', label: 'First-version candidates' },
  { id: 'later', label: 'Later' },
  { id: 'dropped', label: 'Dropped' }
];

interface BuildIdeasProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const BuildIdeas: React.FC<BuildIdeasProps> = ({ build, onOpenTask }) => {
  const {
    workspace,
    addIdea,
    updateIdea,
    moveIdeaGroup,
    deleteIdea,
    convertIdea,
    showToast
  } = useWorkspace();

  const [quickTitle, setQuickTitle] = useState('');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [convertingIdea, setConvertingIdea] = useState<Idea | null>(null);

  // Convert dialog form states
  const [convertTargetKind, setConvertTargetKind] = useState<'feature' | 'task'>('feature');
  const [convertTitle, setConvertTitle] = useState('');
  const [convertDescription, setConvertDescription] = useState('');
  const [convertMilestoneId, setConvertMilestoneId] = useState<Id>('');

  const buildIdeas = workspace.ideas.filter(i => i.buildId === build.id);
  const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addIdea(build.id, quickTitle.trim(), 'inbox');
    setQuickTitle('');
  };

  const handleDragStart = (e: React.DragEvent, ideaId: string) => {
    e.dataTransfer.setData('text/plain', `idea:${ideaId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  const handleDropColumn = (e: React.DragEvent, targetGroup: IdeaGroup) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('idea:')) return;
    const ideaId = data.slice(5);
    moveIdeaGroup(ideaId, targetGroup);
  };

  const openConvertModal = (idea: Idea) => {
    setConvertingIdea(idea);
    setConvertTargetKind('feature');
    setConvertTitle(idea.title);
    setConvertDescription(idea.description || '');
    if (buildMilestones.length > 0) {
      setConvertMilestoneId(buildMilestones[0].id);
    }
  };

  const handleConfirmConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingIdea) return;

    if (convertTargetKind === 'feature') {
      convertIdea(convertingIdea.id, {
        kind: 'feature',
        title: convertTitle.trim(),
        description: convertDescription.trim()
      });
    } else {
      if (!convertMilestoneId) {
        alert('Please choose a milestone for this task.');
        return;
      }
      convertIdea(convertingIdea.id, {
        kind: 'task',
        milestoneId: convertMilestoneId,
        title: convertTitle.trim(),
        description: convertDescription.trim()
      });
    }

    setConvertingIdea(null);
  };

  return (
    <div>
      <p style={{ color: 'var(--secondary)', marginBottom: 16 }}>
        Ideas can keep growing without bloating your first release. Drag cards between groups to sort
        them. Convert only when you explicitly decide.
      </p>

      {/* Quick Capture Input */}
      <form onSubmit={handleQuickAdd} className="quick-capture">
        <span style={{ color: 'var(--accent)', fontSize: 16 }}>💡</span>
        <input
          type="text"
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="What else could this build become? (Press Enter to capture)"
          aria-label="Quick idea capture"
        />
        <button
          type="submit"
          className="primary"
          style={{ minHeight: 32, padding: '4px 14px', fontSize: 12 }}
          disabled={!quickTitle.trim()}
        >
          Capture
        </button>
      </form>

      {/* 4 Idea Group Columns */}
      <div className="board">
        {IDEA_GROUPS.map(col => {
          const colIdeas = buildIdeas
            .filter(i => i.group === col.id)
            .sort((a, b) => a.order - b.order);

          return (
            <section
              key={col.id}
              className="board-column"
              data-idea-group={col.id}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDropColumn(e, col.id)}
              aria-label={`${col.label} column, ${colIdeas.length} ideas`}
            >
              <h3>
                <span>{col.label}</span>
                <span className="column-count">{colIdeas.length}</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {colIdeas.map(idea => {
                  const isConverted = !!idea.convertedTo;

                  return (
                    <div
                      key={idea.id}
                      className="task-card todo"
                      draggable
                      onDragStart={e => handleDragStart(e, idea.id)}
                      style={{ cursor: 'grab' }}
                    >
                      <span className="grip" aria-hidden="true">⠿</span>
                      <strong className="task-title" style={{ fontWeight: 600 }}>
                        {idea.title}
                      </strong>
                      {idea.description && (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: 11,
                            color: 'var(--secondary)',
                            lineHeight: 1.4
                          }}
                        >
                          {idea.description}
                        </p>
                      )}

                      <div className="task-meta" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                        <span>
                          {isConverted ? (
                            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                              ✓ Linked to {idea.convertedTo?.kind}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>Uncommitted</span>
                          )}
                        </span>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            style={{ fontSize: 11, color: 'var(--secondary)', padding: '2px 4px' }}
                            onClick={() => setEditingIdea(idea)}
                            title="Edit idea"
                          >
                            ✎
                          </button>
                          {!isConverted ? (
                            <button
                              type="button"
                              style={{
                                fontSize: 11,
                                color: 'var(--accent)',
                                padding: '2px 6px',
                                border: '1px solid var(--border)',
                                borderRadius: 4
                              }}
                              onClick={() => openConvertModal(idea)}
                              title="Convert to Feature or Task"
                            >
                              Convert ↗
                            </button>
                          ) : (
                            idea.convertedTo?.kind === 'task' && (
                              <button
                                type="button"
                                style={{ fontSize: 11, color: 'var(--accent)', padding: '2px 4px' }}
                                onClick={() => onOpenTask(idea.convertedTo!.id)}
                              >
                                Open task →
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            style={{ fontSize: 11, color: 'var(--muted)', padding: '2px 4px' }}
                            onClick={() => deleteIdea(idea.id)}
                            title="Delete idea"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colIdeas.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 12,
                      padding: 24,
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 8,
                      marginTop: 8
                    }}
                  >
                    Drag ideas here
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Edit Idea Dialog */}
      {editingIdea && (
        <Modal
          isOpen={!!editingIdea}
          onClose={() => setEditingIdea(null)}
          title="Edit Idea"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label htmlFor="edit-idea-title">Idea Title</label>
              <input
                id="edit-idea-title"
                type="text"
                value={editingIdea.title}
                onChange={e => setEditingIdea({ ...editingIdea, title: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="edit-idea-group">Group</label>
              <select
                id="edit-idea-group"
                value={editingIdea.group}
                onChange={e => setEditingIdea({ ...editingIdea, group: e.target.value as IdeaGroup })}
              >
                {IDEA_GROUPS.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-idea-desc">Notes & Context</label>
              <textarea
                id="edit-idea-desc"
                value={editingIdea.description}
                onChange={e => setEditingIdea({ ...editingIdea, description: e.target.value })}
                placeholder="What details or rationale inspired this idea?"
              />
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingIdea(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  updateIdea(editingIdea.id, {
                    title: editingIdea.title.trim(),
                    description: editingIdea.description.trim(),
                    group: editingIdea.group
                  }, true);
                  setEditingIdea(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert Idea Dialog */}
      {convertingIdea && (
        <Modal
          isOpen={!!convertingIdea}
          onClose={() => setConvertingIdea(null)}
          title={`Convert Idea: "${convertingIdea.title}"`}
        >
          <form onSubmit={handleConfirmConvert}>
            <p>
              Turn this idea into an actionable item while preserving the original idea record and source
              relationship.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Convert to:</label>
              <div className="segmented" style={{ display: 'inline-flex' }}>
                <button
                  type="button"
                  className={convertTargetKind === 'feature' ? 'active' : ''}
                  onClick={() => setConvertTargetKind('feature')}
                >
                  First-version Feature
                </button>
                <button
                  type="button"
                  className={convertTargetKind === 'task' ? 'active' : ''}
                  onClick={() => setConvertTargetKind('task')}
                >
                  Actionable Task
                </button>
              </div>
            </div>

            {convertTargetKind === 'task' && (
              <div>
                <label htmlFor="convert-milestone-select">Target Milestone (required for tasks)</label>
                <select
                  id="convert-milestone-select"
                  value={convertMilestoneId}
                  onChange={e => setConvertMilestoneId(e.target.value)}
                  required
                >
                  {buildMilestones.length === 0 ? (
                    <option value="">No milestones available. Create one first.</option>
                  ) : (
                    buildMilestones.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="convert-title-input">Item Title</label>
              <input
                id="convert-title-input"
                type="text"
                required
                maxLength={160}
                value={convertTitle}
                onChange={e => setConvertTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="convert-desc-input">Description</label>
              <textarea
                id="convert-desc-input"
                value={convertDescription}
                onChange={e => setConvertDescription(e.target.value)}
                placeholder="Details or acceptance outcome..."
              />
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setConvertingIdea(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                disabled={!convertTitle.trim() || (convertTargetKind === 'task' && !convertMilestoneId)}
              >
                Confirm Conversion
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
