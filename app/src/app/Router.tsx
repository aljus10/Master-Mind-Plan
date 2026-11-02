import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useWorkspace } from './WorkspaceContext';
import { Layout } from './Layout';
import { DailyTodoPage } from '../features/daily/DailyTodoPage';

// Lazy load secondary feature views for sub-50ms startup performance
const BuildsPage = lazy(() => import('../features/builds/BuildsPage').then(m => ({ default: m.BuildsPage })));
const BuildWorkspace = lazy(() => import('../features/builds/BuildWorkspace').then(m => ({ default: m.BuildWorkspace })));
const NextStepsPage = lazy(() => import('../features/next-steps/NextStepsPage').then(m => ({ default: m.NextStepsPage })));
const ArchivePage = lazy(() => import('../features/archive/ArchivePage').then(m => ({ default: m.ArchivePage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div style={{ display: 'grid', placeItems: 'center', height: '40vh', color: 'var(--muted)', fontSize: 13 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="save-indicator saving">●</span>
      <span>Loading view...</span>
    </div>
  </div>
);

// Redirect root to user's preferred start area
const RootRedirect: React.FC = () => {
  const { workspace } = useWorkspace();
  const startArea = workspace.preferences.startArea;
  const target = startArea === 'today' ? '/today' : startArea === 'next' ? '/next' : '/builds';
  return <Navigate to={target} replace />;
};

// Route validator to default /builds/:buildId to /builds/:buildId/overview
const BuildDefaultTabRedirect: React.FC = () => {
  const { buildId } = useParams<{ buildId: string }>();
  return <Navigate to={`/builds/${buildId}/overview`} replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RootRedirect />} />
          <Route path="today" element={<DailyTodoPage />} />
          <Route
            path="builds"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <BuildsPage />
              </Suspense>
            }
          />
          <Route path="builds/:buildId" element={<BuildDefaultTabRedirect />} />
          <Route
            path="builds/:buildId/:tab"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <BuildWorkspace />
              </Suspense>
            }
          />
          <Route
            path="next"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <NextStepsPage />
              </Suspense>
            }
          />
          <Route
            path="archive"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <ArchivePage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};
