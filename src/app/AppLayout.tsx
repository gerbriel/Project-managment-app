import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@components/Sidebar';
import ThemeToggle from '@components/ThemeToggle';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-app text-app">
      <Sidebar />
      <div style={{ paddingLeft: 'var(--sidebar-w, 224px)' }}>
        <Outlet />
        <ThemeToggle />
      </div>
    </div>
  );
}
