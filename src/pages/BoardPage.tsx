import React from 'react';
import Topbar from '@components/Topbar';
import Board from '@components/Board';

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-app text-app">
      <Topbar />
      <Board />
    </div>
  );
}
