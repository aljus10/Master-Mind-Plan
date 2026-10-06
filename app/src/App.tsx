import React from 'react';
import { WorkspaceProvider } from './app/WorkspaceContext';
import { AppRouter } from './app/Router';
import './styles/app.css';

export function App() {
  return (
    <WorkspaceProvider>
      <AppRouter />
    </WorkspaceProvider>
  );
}

export default App;
