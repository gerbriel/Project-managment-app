import React from 'react';

type IconName =
  | 'board'
  | 'table'
  | 'calendar'
  | 'calendar-stack'
  | 'dashboard'
  | 'map'
  | 'map-pin'
  | 'edit'
  | 'archive'
  | 'trash'
  | 'comment'
  | 'paperclip'
  | 'phone'
  | 'mail'
  | 'arrow-right'
  | 'x'
  | 'plus'
  | 'more'
  | 'menu';

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function Icon({ name, size = 18, className, strokeWidth = 1.75 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'board':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="6" height="16" rx="1" />
          <rect x="11" y="4" width="10" height="16" rx="1" />
        </svg>
      );
    case 'table':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M3 10h18M9 4v16M15 4v16" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      );
    case 'calendar-stack':
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="14" rx="2" fill="none" />
          <path d="M14 4v4M10 4v4M4 12h16" />
          <rect x="2" y="4" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M12 2v4M8 2v4M2 10h16" strokeWidth="1.2" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg {...common}>
          <path d="M4 14h4v6H4zM10 10h4v10h-4zM16 6h4v14h-4z" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="M12 21s7-5.373 7-11a7 7 0 10-14 0c0 5.627 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'map-pin':
      return (
        <svg {...common}>
          <path d="M12 21s7-5.373 7-11a7 7 0 10-14 0c0 5.627 7 11 7 11z" />
          <circle cx="12" cy="10" r="1.5" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case 'archive':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M7 8h10v9a2 2 0 01-2 2H9a2 2 0 01-2-2V8z" />
          <path d="M10 12h4" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6l1-2h6l1 2" />
          <rect x="6" y="6" width="12" height="14" rx="2" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case 'comment':
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg {...common}>
          <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 115.66 5.66L9.05 18.78a2 2 0 01-2.83-2.83l8.49-8.49" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.33 1.77.63 2.6a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.48-1.15a2 2 0 012.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0122 16.92z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      );
    default:
      return null;
  }
}
