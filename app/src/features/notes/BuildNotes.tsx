import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, CalendarDate, Note } from '../../domain/types';
import { getTodayDate } from '../../domain/dates';
import { Modal } from '../../components/Modal';

interface BuildNotesProps {
  build: Build;
}

export const BuildNotes: React.FC<BuildNotesProps> = ({ build }) => {
  const {
    workspace,
    addNote,
    updateNote,
    deleteNote,
    addReview,
    deleteReview
  } = useWorkspace();

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Review form
  const [reviewDate, setReviewDate] = useState<CalendarDate>(getTodayDate());
  const [reviewForward, setReviewForward] = useState('');
  const [reviewStuck, setReviewStuck] = useState('');
  const [reviewNext, setReviewNext] = useState('');
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);

  // New Link modal state
  const [linkNoteId, setLinkNoteId] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');

  const buildNotes = workspace.notes.filter(n => n.buildId === build.id);
  const buildReviews = workspace.reviews
    .filter(r => r.buildId === build.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    addNote(build.id, newNoteTitle.trim(), newNoteBody.trim());
    setNewNoteTitle('');
    setNewNoteBody('');
    setIsAddNoteOpen(false);
  };

  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForward.trim() && !reviewStuck.trim() && !reviewNext.trim()) return;

    addReview(build.id, reviewDate, reviewForward, reviewStuck, reviewNext);
    setReviewForward('');
    setReviewStuck('');
    setReviewNext('');
    setIsAddReviewOpen(false);
  };

  const handleAddLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkNoteId || !linkUrl.trim()) return;

    const trimmedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      alert('Only http and https link URLs are supported.');
      return;
    }

    const note = buildNotes.find(n => n.id === linkNoteId);
    if (!note) return;

    const newLinks = [...(note.links || []), { label: linkLabel.trim() || trimmedUrl, url: trimmedUrl }];
    updateNote(note.id, { links: newLinks }, true);

    setLinkNoteId(null);
    setLinkLabel('');
    setLinkUrl('https://');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20 }}>
      {/* Freeform Notes & References */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Notes & Documentation</h3>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 12, minHeight: 32 }}
            onClick={() => setIsAddNoteOpen(true)}
          >
            ＋ Add Note
          </button>
        </div>

        {buildNotes.length === 0 ? (
          <div className="empty-state">
            <h3>No notes yet</h3>
            <p>Keep research findings, links, architecture decisions, and scratch ideas here.</p>
            <button
              type="button"
              className="primary"
              onClick={() => setIsAddNoteOpen(true)}
            >
              Add first note
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {buildNotes.map(note => (
              <div key={note.id} className="note-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <input
                    type="text"
                    value={note.title}
                    onChange={e => updateNote(note.id, { title: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--text)',
                      outline: 'none',
                      width: '100%',
                      marginBottom: 8
                    }}
                  />
                  <button
                    type="button"
                    style={{ color: 'var(--muted)', fontSize: 12, padding: '0 4px' }}
                    onClick={() => deleteNote(note.id)}
                    title="Delete note"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  value={note.body}
                  onChange={e => updateNote(note.id, { body: e.target.value })}
                  placeholder="Note body..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: 'var(--secondary)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    resize: 'vertical',
                    outline: 'none',
                    whiteSpace: 'pre-wrap'
                  }}
                />

                {/* External links */}
                <div style={{ marginTop: 12, borderTop: '1px solid #1f1f27', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                      Resource Links ({note.links?.length || 0})
                    </span>
                    <button
                      type="button"
                      style={{ fontSize: 11, color: 'var(--accent)', padding: '2px 6px' }}
                      onClick={() => {
                        setLinkNoteId(note.id);
                        setLinkLabel('');
                        setLinkUrl('https://');
                      }}
                    >
                      ＋ Add link
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {note.links?.map((link, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 12,
                          background: 'var(--surface-raised)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                        >
                          {link.label || link.url} ↗
                        </a>
                        <button
                          type="button"
                          style={{ color: 'var(--muted)', fontSize: 10 }}
                          onClick={() => {
                            const filtered = note.links.filter((_, i) => i !== idx);
                            updateNote(note.id, { links: filtered }, true);
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Review Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Weekly Reflection</h3>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 12, minHeight: 32 }}
            onClick={() => setIsAddReviewOpen(true)}
          >
            ＋ Check-in
          </button>
        </div>

        <div className="note-panel" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)' }}>
            The 3-Question Reflection
          </h4>
          <p style={{ fontSize: 12, color: 'var(--secondary)', lineHeight: 1.6, margin: 0 }}>
            1. What moved forward?
            <br />
            2. What is stuck?
            <br />
            3. What will I do next?
          </p>
        </div>

        {buildReviews.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', padding: '10px 0' }}>
            No weekly reviews recorded yet. Click "＋ Check-in" to pause and reflect on your progress.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {buildReviews.map(rev => (
              <div key={rev.id} className="note-panel" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                    Review • {rev.date}
                  </span>
                  <button
                    type="button"
                    style={{ color: 'var(--muted)', fontSize: 12 }}
                    onClick={() => deleteReview(rev.id)}
                    title="Delete review"
                  >
                    ✕
                  </button>
                </div>

                {rev.movedForward && (
                  <div style={{ marginBottom: 8 }}>
                    <small style={{ color: 'var(--success)', fontWeight: 600, display: 'block', fontSize: 11 }}>
                      Moved Forward:
                    </small>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>{rev.movedForward}</p>
                  </div>
                )}

                {rev.stuck && (
                  <div style={{ marginBottom: 8 }}>
                    <small style={{ color: 'var(--warning)', fontWeight: 600, display: 'block', fontSize: 11 }}>
                      Stuck / Friction:
                    </small>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>{rev.stuck}</p>
                  </div>
                )}

                {rev.next && (
                  <div>
                    <small style={{ color: 'var(--accent)', fontWeight: 600, display: 'block', fontSize: 11 }}>
                      Will Do Next:
                    </small>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>{rev.next}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      <Modal isOpen={isAddNoteOpen} onClose={() => setIsAddNoteOpen(false)} title="Add Note">
        <form onSubmit={handleAddNoteSubmit}>
          <div>
            <label htmlFor="new-note-title">Title</label>
            <input
              id="new-note-title"
              type="text"
              required
              maxLength={160}
              value={newNoteTitle}
              onChange={e => setNewNoteTitle(e.target.value)}
              placeholder="e.g. Design inspiration, Architecture decision..."
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="new-note-body">Note Content (plain text)</label>
            <textarea
              id="new-note-body"
              value={newNoteBody}
              onChange={e => setNewNoteBody(e.target.value)}
              placeholder="Write your notes here..."
              style={{ minHeight: 120 }}
            />
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setIsAddNoteOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!newNoteTitle.trim()}>
              Save Note
            </button>
          </div>
        </form>
      </Modal>

      {/* Weekly Review Modal */}
      <Modal isOpen={isAddReviewOpen} onClose={() => setIsAddReviewOpen(false)} title="Record Weekly Review">
        <form onSubmit={handleAddReviewSubmit}>
          <div>
            <label htmlFor="review-date-input">Review Date</label>
            <input
              id="review-date-input"
              type="date"
              value={reviewDate}
              onChange={e => setReviewDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="review-forward-input">1. What moved forward?</label>
            <textarea
              id="review-forward-input"
              value={reviewForward}
              onChange={e => setReviewForward(e.target.value)}
              placeholder="Steps completed, clarity gained, decisions made..."
            />
          </div>

          <div>
            <label htmlFor="review-stuck-input">2. What is stuck or experiencing friction?</label>
            <textarea
              id="review-stuck-input"
              value={reviewStuck}
              onChange={e => setReviewStuck(e.target.value)}
              placeholder="Unresolved blockers, uncertainties, interruptions..."
            />
          </div>

          <div>
            <label htmlFor="review-next-input">3. What will I do next?</label>
            <textarea
              id="review-next-input"
              value={reviewNext}
              onChange={e => setReviewNext(e.target.value)}
              placeholder="Next achievable action for the coming days..."
            />
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setIsAddReviewOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary">
              Save Review
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Link Modal */}
      <Modal isOpen={!!linkNoteId} onClose={() => setLinkNoteId(null)} title="Add Resource Link">
        <form onSubmit={handleAddLinkSubmit}>
          <div>
            <label htmlFor="link-label-input">Link Label (optional)</label>
            <input
              id="link-label-input"
              type="text"
              value={linkLabel}
              onChange={e => setLinkLabel(e.target.value)}
              placeholder="e.g. Documentation, Reference mockups..."
            />
          </div>

          <div>
            <label htmlFor="link-url-input">URL (http:// or https://)</label>
            <input
              id="link-url-input"
              type="url"
              required
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setLinkNoteId(null)}
            >
              Cancel
            </button>
            <button type="submit" className="primary">
              Add Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
