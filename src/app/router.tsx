import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './AppLayout';
import WorkspacePage from '@pages/WorkspacePage';
import HomePage from '@pages/HomePage';
import DevStatus from '@pages/DevStatus';
import BoardPage from '@pages/BoardPage';
import TableView from '@pages/TableView';
import CalendarView from '@pages/CalendarView';
import DashboardView from '@pages/DashboardView';
import BoardMap from '@pages/BoardMap';

const basePath = import.meta.env.PROD ? '/Project-managment-app' : '';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dev/status', element: <DevStatus /> },
      { path: 'w/:workspaceId', element: <WorkspacePage /> },
      { path: 'w/:workspaceId/calendar', element: <CalendarView /> },
      { path: 'b/:boardId/board', element: <BoardPage /> },
      { path: 'b/:boardId/table', element: <TableView /> },
      { path: 'b/:boardId/calendar', element: <CalendarView /> },
      { path: 'b/:boardId/dashboard', element: <DashboardView /> },
      { path: 'b/:boardId/map', element: <BoardMap /> },
    ],
  },
], {
  basename: basePath
});

export default router;
