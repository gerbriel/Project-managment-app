import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@components/Sidebar';
import ThemeToggle from '@components/ThemeToggle';

// Inline: minimal MoveAnyListModal shell (UI only; no external imports)
const MoveAnyListModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess?: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground border border-border rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold">Move List</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm mb-1">List</label>
            <select className="w-full px-2 py-2 rounded border border-input bg-background" disabled>
              <option>Feature wiring pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Target board</label>
            <select className="w-full px-2 py-2 rounded border border-input bg-background" disabled>
              <option>Feature wiring pending</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded" disabled />
            Move cards with the list
          </label>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AppLayout() {
  const [showMoveList, setShowMoveList] = React.useState(false);

  return (
    <div className="min-h-screen bg-app text-app">
      <Sidebar />
      <div className="lg:pl-[var(--sidebar-w,224px)] pl-0">
        <Outlet />
        <ThemeToggle />
      </div>
      <MoveAnyListModal isOpen={showMoveList} onClose={() => setShowMoveList(false)} onSuccess={() => { /* ...existing code... */ }} />
    </div>
  );
}
