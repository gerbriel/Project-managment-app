import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './AppLayout';
import ProtectedRoute from '@components/ProtectedRoute';
import WorkspacePage from '@pages/WorkspacePage';
import HomePage from '@pages/HomePage';
import LoginPage from '@pages/LoginPage';
import PricingPage from '@pages/PricingPage';
import DevStatus from '@pages/DevStatus';
import BoardPage from '@pages/BoardPage';
import TableView from '@pages/TableView';
import CalendarView from '@pages/CalendarView';
import DashboardView from '@pages/DashboardView';
import BoardMap from '@pages/BoardMap';

const basePath = import.meta.env.PROD ? '/Project-managment-app' : '';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/pricing', element: <PricingPage /> },
  
  // Protected routes
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ProtectedRoute><HomePage /></ProtectedRoute> },
      { path: 'dev/status', element: <DevStatus /> },
      { path: 'w/:workspaceId', element: <ProtectedRoute><WorkspacePage /></ProtectedRoute> },
      { path: 'w/:workspaceId/calendar', element: <ProtectedRoute><CalendarView /></ProtectedRoute> },
      { path: 'b/:boardId/board', element: <ProtectedRoute><BoardPage /></ProtectedRoute> },
      { path: 'b/:boardId/table', element: <ProtectedRoute><TableView /></ProtectedRoute> },
      { path: 'b/:boardId/calendar', element: <ProtectedRoute><CalendarView /></ProtectedRoute> },
      { path: 'b/:boardId/dashboard', element: <ProtectedRoute><DashboardView /></ProtectedRoute> },
      { path: 'b/:boardId/map', element: <ProtectedRoute><BoardMap /></ProtectedRoute> },
    ],
  },
], {
  basename: basePath
});

export default router;
