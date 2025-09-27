import React, { useEffect, useState } from 'react';

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('tryed-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('tryed-theme', theme);
  }, [theme]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Theme"
          className="h-10 w-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 flex items-center justify-center shadow-lg hover:bg-neutral-800"
          title="Theme"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        {open && (
          <div className="absolute bottom-12 right-0 w-40 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 shadow-xl p-2">
            <div className="text-xs text-neutral-400 px-2 pb-1">Appearance</div>
            <button
              onClick={() => {
                setTheme('light');
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                theme === 'light' ? 'bg-neutral-800' : ''
              }`}
            >
              Light
            </button>
            <button
              onClick={() => {
                setTheme('dark');
                setOpen(false);
              }}
              className={`mt-1 w-full text-left px-2 py-1 rounded hover:bg-neutral-800 ${
                theme === 'dark' ? 'bg-neutral-800' : ''
              }`}
            >
              Dark
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
