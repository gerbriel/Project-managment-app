import React from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useQuery } from '@tanstack/react-query';
import { getMyBoards } from '@api/boards';

export default function Sidebar() {
  const { boardId } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === '1';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
    } catch {}
    const width = collapsed ? 40 : 224; // px
    document.documentElement.style.setProperty('--sidebar-w', width + 'px');
  }, [collapsed]);

  const boardsQuery = useQuery({ queryKey: ['myBoards'], queryFn: getMyBoards });

  const NavItem: React.FC<{ to: string; label: string; icon?: React.ReactNode }> = ({ to, label, icon }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm ' +
          (active ? 'bg-accent/15 text-accent' : 'text-fg-subtle hover:text-fg hover:bg-bg-inset')
        }
        title={label}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-30 bg-surface border-r border-app/60 shadow-sm flex flex-col"
      style={{ width: 'var(--sidebar-w, 224px)' }}
    >
      <div className="h-12 flex items-center justify-between px-2">
        {!collapsed && <div className="px-2 font-semibold">Navigation</div>}
        <button
          className="w-8 h-8 grid place-items-center text-fg-subtle hover:text-fg"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className={collapsed ? '' : 'rotate-180'}>
            <Icon name="arrow-right" />
          </div>
        </button>
      </div>

      <div className="px-2 py-2 space-y-1 overflow-y-auto">
        <NavItem to="/" label="Home" />

        <div className="mt-2">
          {!collapsed && (
            <div className="px-2 text-xs uppercase tracking-wide text-fg-muted mb-1">Boards</div>
          )}
          <div className="flex flex-col gap-1">
            {boardsQuery.isLoading && (
              <div className="px-3 py-2 text-fg-muted text-sm">Loading…</div>
            )}
            {boardsQuery.data?.map((b) => (
              <NavItem key={String(b.id)} to={`/b/${b.id}/board`} label={String(b.name)} icon={<Icon name="board" size={16} />} />
            ))}
            {boardsQuery.data && boardsQuery.data.length === 0 && (
              <div className="px-3 py-2 text-fg-muted text-sm">No boards</div>
            )}
          </div>
        </div>
        {boardId && (
          <div className="mt-2">
            {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-fg-muted mb-1">Dashboards</div>}
            <div className="flex flex-col gap-1">
              <NavItem to={`/b/${boardId}/board`} label="Board" icon={<Icon name="board" size={16} />} />
              <NavItem to={`/b/${boardId}/table`} label="Table" icon={<Icon name="table" size={16} />} />
              <NavItem to={`/b/${boardId}/calendar`} label="Calendar" icon={<Icon name="calendar" size={16} />} />
              <NavItem to={`/b/${boardId}/dashboard`} label="Dashboard" icon={<Icon name="dashboard" size={16} />} />
              <NavItem to={`/b/${boardId}/map`} label="Map" icon={<Icon name="map" size={16} />} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
