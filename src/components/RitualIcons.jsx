import React from 'react';

/**
 * Пак авторских иконок Parallelo от Arena AI (Argon High)
 * Сетка 24x24, stroke-width 2, round caps/joins, currentColor
 */

export const IconBanya = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 3c6.4 3.6 6.4 10.9 0 16C5.6 13.9 5.6 6.6 12 3Z" />
    <path d="M12 6.6v14.8" />
  </svg>
);

export const IconWalk = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M5.5 18.5L7 16.5" />
    <path d="M8.5 13.5L10 11.5" />
    <path d="M12 8.5L14 6.5" />
    <path d="M10 19.5L11.5 17.5" />
    <path d="M13 14.5L14.5 12.5" />
    <path d="M16.5 9.5L18.5 7.5" />
  </svg>
);

export const IconTea = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9.5 8.5C10.8 7 8.8 5.2 10 3.5" />
    <path d="M14.5 8.5C15.8 7 13.8 5.2 15 3.5" />
    <path d="M5.5 12.5H18.5V14C18.5 17.6 15.6 20.5 12 20.5C8.4 20.5 5.5 17.6 5.5 14V12.5Z" />
    <path d="M5 21h14" />
  </svg>
);

export const IconGarden = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4.5 20.5h15" />
    <path d="M12 20.5V9.5" />
    <path d="M12 14.5C9.4 14.5 7.4 12.8 7.2 10.2C9.8 10.2 11.8 11.9 12 14.5Z" />
    <path d="M12 10.5C14.6 10.5 16.6 8.8 16.8 6.2C14.2 6.2 12.2 7.9 12 10.5Z" />
  </svg>
);

export const IconPresence = ({ className = 'w-6 h-6', isPulsing = true, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
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

// Тёплая тарелка (Питание и тепло)
export const IconBowl = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 4v3" />
    <path d="M8 5c.5.8.5 1.5 0 2" />
    <path d="M16 5c.5.8.5 1.5 0 2" />
    <path d="M4 11h16a8 8 0 0 1-16 0Z" />
    <path d="M8 19h8" />
  </svg>
);

// Осознанная покупка (Пауза перед шоппингом)
export const IconShopping = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M6 7h12l1.5 13H4.5L6 7Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
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
};
