import React from 'react';
import Icon from './Icon';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  boardId: string;
};

export default function ViewSwitcher({ boardId }: Props) {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const items = [
    { key: 'board', name: 'Board', icon: 'board' as const, to: `/b/${boardId}/board` },
    { key: 'table', name: 'Table', icon: 'table' as const, to: `/b/${boardId}/table` },
    { key: 'calendar', name: 'Calendar', icon: 'calendar' as const, to: `/b/${boardId}/calendar` },
    { key: 'dashboard', name: 'Dashboard', icon: 'dashboard' as const, to: `/b/${boardId}/dashboard` },
    { key: 'map', name: 'Map', icon: 'map' as const, to: `/b/${boardId}/map` },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Layout icons in a semi-circle arc around the trigger when open
  const radius = 88; // px distance from the center button
  const startDeg = 210; // start angle (down-left)
  const endDeg = 330; // end angle (down-right)
  const steps = items.length > 1 ? items.length - 1 : 1;
  const angleFor = (i: number) => (startDeg + (endDeg - startDeg) * (i / steps)) * (Math.PI / 180);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 select-none">
      <div className="relative w-[0px] h-[0px]">
        {items.map((it, i) => {
          const a = angleFor(i);
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          const pos = open ? { transform: `translate(${x}px, ${y}px)` } : { transform: 'translate(0px, 0px)' };
          const cls = 'absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ease-out';
          return (
            <Link
              key={it.key}
              to={it.to}
              title={it.name}
              className={`${cls} w-10 h-10 flex items-center justify-center rounded-full text-lg shadow border will-change-transform hover:scale-110 ${
                isActive(it.to)
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-surface-2 hover:bg-surface-3 border-app text-muted hover:text-app'
              }`}
              style={pos as React.CSSProperties}
              onClick={() => setOpen(false)}
            >
              <Icon name={it.icon} size={18} />
            </Link>
          );
        })}
        <button
          className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-accent text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent/60"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close view switcher' : 'Open view switcher'}
        >
          {open ? '✕' : '⋯'}
        </button>
      </div>
    </div>
  );
}
