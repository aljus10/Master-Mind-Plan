import React from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useWorkspace } from './WorkspaceContext';
import { Layout } from './Layout';
import { BuildsPage } from '../features/builds/BuildsPage';
import { BuildWorkspace } from '../features/builds/BuildWorkspace';
import { NextStepsPage } from '../features/next-steps/NextStepsPage';
import { ArchivePage } from '../features/archive/ArchivePage';
import { SettingsPage } from '../features/settings/SettingsPage';

// Redirect root to user's preferred start area
const RootRedirect: React.FC = () => {
  const { workspace } = useWorkspace();
  const target = workspace.preferences.startArea === 'next' ? '/next' : '/builds';
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
          <Route path="builds" element={<BuildsPage />} />
          <Route path="builds/:buildId" element={<BuildDefaultTabRedirect />} />
          <Route path="builds/:buildId/:tab" element={<BuildWorkspace />} />
          <Route path="next" element={<NextStepsPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/builds" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};
