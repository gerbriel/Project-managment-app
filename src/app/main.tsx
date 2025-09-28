import '../index.css';
import './theme.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import ThemeToggle from '@components/ThemeToggle';
import TaskFeatureStatus from '@components/TaskFeatureStatus';
import DevAuthGate from './DevAuthGate';

const queryClient = new QueryClient();

function AppRoot() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <DevAuthGate>
          <div className="min-h-screen bg-app text-app">
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
            <ThemeToggle />
            <TaskFeatureStatus />
          </div>
        </DevAuthGate>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default AppRoot;

if (typeof document !== 'undefined') {
  ReactDOM.createRoot(document.getElementById('root')!).render(<AppRoot />);
}
