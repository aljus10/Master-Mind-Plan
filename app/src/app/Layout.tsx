import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from './WorkspaceContext';
import { Toast } from '../components/Toast';
import { CorruptRecoveryModal } from '../components/CorruptRecoveryModal';

export const Layout: React.FC = () => {
  const {
    workspace,
    saveStatus,
    saveErrorMessage,
    retrySave,
    hasMultiTabConflict,
    reloadFromStorage
  } = useWorkspace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeBuildsCount = workspace.builds.filter(b => !b.archivedAt).length;
  const archivedBuildsCount = workspace.builds.filter(b => !!b.archivedAt).length;
  const pinnedBuilds = workspace.builds.filter(b => b.pinned && !b.archivedAt);

  // Breadcrumbs
  const getBreadcrumb = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0 || parts[0] === 'builds') {
      if (parts.length >= 2) {
        const build = workspace.builds.find(b => b.id === parts[1]);
        return (
          <>
            <button type="button" onClick={() => navigate('/builds')}>
              Builds
            </button>
            <span>/</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>
              {build ? build.title : 'Build Workspace'}
            </span>
          </>
        );
      }
      return <span style={{ color: 'var(--text)', fontWeight: 500 }}>All Builds</span>;
    }
    if (parts[0] === 'next') {
      return <span style={{ color: 'var(--text)', fontWeight: 500 }}>Next Steps</span>;
    }
    if (parts[0] === 'archive') {
      return <span style={{ color: 'var(--text)', fontWeight: 500 }}>Archive</span>;
    }
    if (parts[0] === 'settings') {
      return <span style={{ color: 'var(--text)', fontWeight: 500 }}>Settings</span>;
    }
    return null;
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-bar">
        <div className="brand">
          <span className="brand-mark">↗</span>
          Future Builds
        </div>
        <button
          className="icon-btn"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer nav */}
      {mobileMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile Navigation">
          <NavLink
            to="/builds"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Builds ({activeBuildsCount})
          </NavLink>
          <NavLink
            to="/next"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Next Steps
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Archive ({archivedBuildsCount})
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Settings
          </NavLink>
        </nav>
      )}

      {/* Multi-tab conflict warning */}
      {hasMultiTabConflict && (
        <div
          style={{
            background: 'var(--warning-bg)',
            borderBottom: '1px solid var(--warning-border)',
            padding: '10px 24px',
            color: 'var(--warning)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100
          }}
        >
          <span>
            <strong>Storage update:</strong> Another browser tab modified your organizer data.
          </span>
          <button
            type="button"
            className="secondary"
            style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
            onClick={reloadFromStorage}
          >
            Reload latest
          </button>
        </div>
      )}

      <div className="shell">
        {/* Desktop Sidebar */}
        <aside className="sidebar" aria-label="Sidebar Navigation">
          <div className="brand">
            <span className="brand-mark">↗</span>
            Future Builds
          </div>

          <div className="workspace-label">YOUR WORKSPACE</div>

          <nav aria-label="Main Navigation">
            <NavLink
              to="/builds"
              className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              Builds
              <span className="count">{activeBuildsCount}</span>
            </NavLink>

            <NavLink
              to="/next"
              className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24">
                <path d="m5 12 4 4L19 6" />
                <path d="M5 21h14" />
              </svg>
              Next Steps
            </NavLink>

            <NavLink
              to="/archive"
              className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="4" rx="1" />
                <path d="M5 7v14h14V7M10 11h4" />
              </svg>
              Archive
              {archivedBuildsCount > 0 && <span className="count">{archivedBuildsCount}</span>}
            </NavLink>
          </nav>

          {/* Pinned builds list */}
          {pinnedBuilds.length > 0 && (
            <div className="mini-section">
              PINNED BUILDS
              {pinnedBuilds.map(b => (
                <strong
                  key={b.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/builds/${b.id}/plan`)}
                >
                  <span className="dot" />
                  {b.title}
                </strong>
              ))}
            </div>
          )}

          <div className="sidebar-bottom">
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" />
              </svg>
              Settings
            </NavLink>

            <div className="profile">
              <div className="avatar">P</div>
              <div>
                Personal workspace
                <small>Ideas worth making room for</small>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main">
          <div className="topline">
            <div className="breadcrumb">{getBreadcrumb()}</div>

            {/* Save status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saveStatus === 'saving' && (
                <span className="save-indicator saving">● Saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="save-indicator saved">✓ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="save-indicator error">
                  ⚠ Couldn't save ({saveErrorMessage})
                  <button
                    type="button"
                    onClick={retrySave}
                    style={{ textDecoration: 'underline', color: 'var(--text)', marginLeft: 6 }}
                  >
                    Retry
                  </button>
                </span>
              )}
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <NavLink
          to="/builds"
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Builds</span>
        </NavLink>

        <NavLink
          to="/next"
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24">
            <path d="m5 12 4 4L19 6" />
            <path d="M5 21h14" />
          </svg>
          <span>Next</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" />
          </svg>
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/archive"
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="4" rx="1" />
            <path d="M5 7v14h14V7M10 11h4" />
          </svg>
          <span>Archive</span>
        </NavLink>
      </nav>

      <Toast />
      <CorruptRecoveryModal />
    </>
  );
};
