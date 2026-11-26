import React from 'react';

/**
 * Монохромный пакет SVG-иконок Parallelo
 * Сетка 24x24, strokeWidth 1.75, round caps/joins, currentColor
 */

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.75',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconBanya = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 3c6.4 3.6 6.4 10.9 0 16C5.6 13.9 5.6 6.6 12 3Z" />
    <path d="M12 6.6v14.8" />
  </svg>
);

export const IconWalk = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M5.5 18.5L7 16.5" />
    <path d="M8.5 13.5L10 11.5" />
    <path d="M12 8.5L14 6.5" />
    <path d="M10 19.5L11.5 17.5" />
    <path d="M13 14.5L14.5 12.5" />
    <path d="M16.5 9.5L18.5 7.5" />
  </svg>
);

export const IconTea = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M9.5 8.5C10.8 7 8.8 5.2 10 3.5" />
    <path d="M14.5 8.5C15.8 7 13.8 5.2 15 3.5" />
    <path d="M5.5 12.5H18.5V14C18.5 17.6 15.6 20.5 12 20.5C8.4 20.5 5.5 17.6 5.5 14V12.5Z" />
    <path d="M5 21h14" />
  </svg>
);

export const IconGarden = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M4.5 20.5h15" />
    <path d="M12 20.5V9.5" />
    <path d="M12 14.5C9.4 14.5 7.4 12.8 7.2 10.2C9.8 10.2 11.8 11.9 12 14.5Z" />
    <path d="M12 10.5C14.6 10.5 16.6 8.8 16.8 6.2C14.2 6.2 12.2 7.9 12 10.5Z" />
  </svg>
);

export const IconPresence = ({ className = 'w-5 h-5', isPulsing = false, ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <circle
      cx="12"
      cy="12"
      r="2.4"
      fill="currentColor"
      stroke="none"
      className={isPulsing ? 'animate-presence-breathe' : ''}
    />
  </svg>
);

export const IconBowl = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 4v3" />
    <path d="M8 5c.5.8.5 1.5 0 2" />
    <path d="M16 5c.5.8.5 1.5 0 2" />
    <path d="M4 11h16a8 8 0 0 1-16 0Z" />
    <path d="M8 19h8" />
  </svg>
);

export const IconShopping = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M6 7h12l1.5 13H4.5L6 7Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconMovement = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M4 19c3-3 6-5 8-5s5 2 8 5" />
    <path d="M8 12.5l4-3.5 4 2.5 4-3" />
    <path d="M5 21h14" />
  </svg>
);

export const IconIntimacy = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="9.5" cy="12" r="5" />
    <circle cx="14.5" cy="12" r="5" />
  </svg>
);

export const IconAlcohol = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M8 3h8l-1 6.5a3.5 3.5 0 0 1-6 0L8 3Z" />
    <path d="M12 13v7" />
    <path d="M8.5 20h7" />
  </svg>
);

export const IconSubstances = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <rect x="7" y="4" width="10" height="16" rx="5" transform="rotate(35 12 12)" />
    <path d="M8.5 9.5l7 5" />
  </svg>
);

export const IconWork = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconOvertime = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export const IconFriends = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c1-3 3.2-4.5 5.5-4.5s4.5 1.5 5.5 4.5" />
    <circle cx="16.5" cy="9.5" r="2.2" />
    <path d="M16 14.5c2 0 3.8 1.2 4.5 3.5" />
  </svg>
);

/* Системные и навигационные иконки (без эмодзи) */
export const IconPulse = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </svg>
);

export const IconSliders = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M4 7h16M4 17h16" />
    <circle cx="9" cy="7" r="2" fill="currentColor" />
    <circle cx="15" cy="17" r="2" fill="currentColor" />
  </svg>
);

export const IconChart = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 3 3 5-7" />
  </svg>
);

export const IconUser = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
  </svg>
);

export const IconDrop = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 3.5C12 3.5 6 10.2 6 14.5a6 6 0 0 0 12 0C18 10.2 12 3.5 12 3.5Z" />
  </svg>
);

export const IconMoon = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
  </svg>
);

export const IconSun = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
  </svg>
);

export const IconShield = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
  </svg>
);

export const IconWind = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" />
    <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" />
    <path d="M3 16h7a2 2 0 1 1-2 2" />
  </svg>
);

export const IconCheck = ({ className = 'w-3.5 h-3.5', ...props }) => (
  <svg {...baseProps} strokeWidth="2.5" className={className} {...props}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export const IconClock = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconDownload = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconUpload = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <path d="M12 15V3m0 0l-4 4m4-4l4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconClipboard = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...baseProps} className={className} {...props}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5h6v2.5H9z" />
    <path d="M8.5 12h2l1.2-2.5 2 5 1.3-2.5h2" />
  </svg>
);

export const RITUAL_ICONS = {
  banya: IconBanya,
  walk: IconWalk,
  tea: IconTea,
  garden: IconGarden,
  presence: IconPresence,
  bowl: IconBowl,
  shopping: IconShopping,
  movement: IconMovement,
  intimacy: IconIntimacy,
  alcohol: IconAlcohol,
  substances: IconSubstances,
  work: IconWork,
  overtime: IconOvertime,
  friends: IconFriends,
};
