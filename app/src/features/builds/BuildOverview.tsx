import React, { useState } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Build, Feature, Id } from '../../domain/types';
import { calculateProgress } from '../../domain/readiness';

interface BuildOverviewProps {
  build: Build;
  onOpenTask: (taskId: Id) => void;
}

export const BuildOverview: React.FC<BuildOverviewProps> = ({ build, onOpenTask }) => {
  const {
    workspace,
    updateBuild,
    addFeature,
    updateFeature,
    deleteFeature
  } = useWorkspace();

  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [showConstraints, setShowConstraints] = useState(
    !!(
      build.constraints?.timeNotes ||
      build.constraints?.budgetNotes ||
      build.constraints?.resourceNotes ||
      build.constraints?.targetDate
    )
  );

  const buildMilestones = workspace.milestones.filter(m => m.buildId === build.id);
  const buildTasks = workspace.tasks.filter(t => t.buildId === build.id);
  const buildFeatures = workspace.features.filter(f => f.buildId === build.id);
  const buildIdeas = workspace.ideas.filter(i => i.buildId === build.id);
  const progress = calculateProgress(buildTasks);

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureTitle.trim()) return;
    addFeature(build.id, newFeatureTitle.trim());
    setNewFeatureTitle('');
  };

  return (
    <div className="overview-grid">
      {/* Primary Column */}
      <div>
        {/* Goal & Definition of Done */}
        <div className="overview-panel">
          <h3>Why I’m building this</h3>
          <textarea
            value={build.goal}
            onChange={e => updateBuild(build.id, { goal: e.target.value })}
            placeholder="What is the core reason this build matters? (Click to edit)"
            style={{
              width: '100%',
              minHeight: 60,
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none'
            }}
          />

          <h3 style={{ marginTop: 24 }}>What finished means</h3>
          <textarea
            value={build.definitionOfDone}
            onChange={e => updateBuild(build.id, { definitionOfDone: e.target.value })}
            placeholder="Describe the concrete finish line. How will you know it is done? (Click to edit)"
            style={{
              width: '100%',
              minHeight: 60,
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>

        {/* Concise Planning Summary */}
        <div className="overview-panel">
          <h3>Planning Summary</h3>
          <p>
            {buildMilestones.length} milestone{buildMilestones.length === 1 ? '' : 's'} •{' '}
            {progress.label}
          </p>

          <button
            type="button"
            className="secondary"
            onClick={() => setShowConstraints(prev => !prev)}
            style={{ fontSize: 12, minHeight: 34, marginTop: 8 }}
          >
            {showConstraints ? 'Hide constraints' : 'Show optional constraints (time, budget, date)'}
          </button>

          {showConstraints && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Time availability
                </label>
                <input
                  type="text"
                  value={build.constraints?.timeNotes || ''}
                  onChange={e =>
                    updateBuild(build.id, {
                      constraints: { ...build.constraints, timeNotes: e.target.value }
                    })
                  }
                  placeholder="e.g. Short evening sessions, weekends only..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                    marginBottom: 10
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Budget notes
                </label>
                <input
                  type="text"
                  value={build.constraints?.budgetNotes || ''}
                  onChange={e =>
                    updateBuild(build.id, {
                      constraints: { ...build.constraints, budgetNotes: e.target.value }
                    })
                  }
                  placeholder="e.g. Free local version first, $0 hosting..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                    marginBottom: 10
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Required skills & resources
                </label>
                <input
                  type="text"
                  value={build.constraints?.resourceNotes || ''}
                  onChange={e =>
                    updateBuild(build.id, {
                      constraints: { ...build.constraints, resourceNotes: e.target.value }
                    })
                  }
                  placeholder="e.g. React, local storage, API docs..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                    marginBottom: 10
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Target Completion Date (optional)
                </label>
                <input
                  type="date"
                  value={build.constraints?.targetDate || ''}
                  onChange={e =>
                    updateBuild(build.id, {
                      constraints: { ...build.constraints, targetDate: e.target.value || undefined }
                    })
                  }
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Column: First Version Features & Scope Discipline */}
      <div>
        <div className="overview-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>First Version Scope</h3>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {buildFeatures.filter(f => f.achieved).length} / {buildFeatures.length} achieved
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            What belongs in the very first release? Keep it achievable. Extra ideas belong in Later.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {buildFeatures.map(feat => {
              const sourceIdea = buildIdeas.find(i => i.convertedTo?.id === feat.id);
              return (
                <div
                  key={feat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#18181f',
                    border: '1px solid var(--border)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={feat.achieved}
                    aria-label={`Mark feature "${feat.title}" achieved`}
                    onChange={e => updateFeature(feat.id, { achieved: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: feat.achieved ? 'var(--muted)' : 'var(--text)',
                        textDecoration: feat.achieved ? 'line-through' : 'none'
                      }}
                    >
                      {feat.title}
                    </span>
                    {sourceIdea && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--accent)',
                          marginLeft: 6,
                          background: 'rgba(181, 161, 255, 0.1)',
                          padding: '1px 5px',
                          borderRadius: 4
                        }}
                      >
                        From idea
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ color: 'var(--muted)', fontSize: 12, padding: '2px 4px' }}
                    onClick={() => deleteFeature(feat.id)}
                    title="Remove feature"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {buildFeatures.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', padding: '6px 0' }}>
                No first-version features added yet.
              </div>
            )}
          </div>

          <form onSubmit={handleAddFeature} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={newFeatureTitle}
              onChange={e => setNewFeatureTitle(e.target.value)}
              placeholder="Add first-version outcome..."
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12
              }}
            />
            <button type="submit" className="secondary" style={{ minHeight: 34, padding: '0 10px', fontSize: 12 }}>
              Add
            </button>
          </form>

          {/* Quick Later Ideas Preview */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--secondary)' }}>
              Later Possibilities ({buildIdeas.filter(i => i.group === 'later').length})
            </h4>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {buildIdeas
                .filter(i => i.group === 'later')
                .slice(0, 3)
                .map(i => (
                  <div key={i.id} style={{ marginBottom: 4 }}>
                    • {i.title}
                  </div>
                ))}
              {buildIdeas.filter(i => i.group === 'later').length > 3 && (
                <div style={{ marginTop: 4 }}>+ more under Ideas tab</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
