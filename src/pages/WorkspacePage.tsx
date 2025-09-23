import React from 'react';
import Topbar from '@components/Topbar';
import BoardSwitcher from '@components/BoardSwitcher';

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-app text-app">
      <Topbar />
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Workspace</h1>
        <BoardSwitcher />
        <div className="mt-6 text-muted">TODO: Views and workspace content</div>
      </div>
    </div>
  );
}
