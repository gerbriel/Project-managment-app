import React, { useState } from 'react';

/**
 * Development helper component to show task enhancement status
 * Only shows in development mode
 */
export default function TaskFeatureStatus() {
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-16 right-4 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs z-50 transition-colors"
      >
        🧪 DB Status
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs text-xs z-50 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-blue-800">🧪 Database Schema</div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-400 hover:text-blue-600 text-xs ml-2"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1 text-blue-700">
        <div className="flex items-center gap-1">
          <span className="text-amber-600">⏳</span>
          <span>Enhanced columns pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-600">✅</span>
          <span>UI components ready</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-600">✅</span>
          <span>Backward compatibility</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-blue-200">
        <div className="text-blue-600 text-xs">
          Run migration script to enable all features
        </div>
      </div>
    </div>
  );
}