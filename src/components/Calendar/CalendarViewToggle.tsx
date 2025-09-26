import React from 'react';
import { CalendarViewMode } from '../../types/calendar';

interface CalendarViewToggleProps {
  currentMode: CalendarViewMode;
  onModeChange: (mode: CalendarViewMode) => void;
}

export default function CalendarViewToggle({ currentMode, onModeChange }: CalendarViewToggleProps) {
  const modes: CalendarViewMode[] = ['day', 'week', 'month', 'year'];

  const handleClick = (mode: CalendarViewMode) => {
    // If clicking the currently active mode, toggle it off (return to default view)
    if (currentMode === mode) {
      onModeChange(null); // Return to default view
    } else {
      onModeChange(mode); // Switch to the clicked mode
    }
  };

  return (
    <div className="inline-flex items-center gap-1 bg-muted/60 rounded p-1">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => handleClick(m)}
          className={
            'px-3 py-1.5 text-sm rounded ' +
            (currentMode === m
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {m![0].toUpperCase() + m!.slice(1)}
        </button>
      ))}
    </div>
  );
}
