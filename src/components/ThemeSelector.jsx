import React from 'react';
import { PALETTES } from '../data/brandingTokens';

export function ThemeSelector({ activeTheme, onSelectTheme }) {
  return (
    <div className="flex items-center justify-center gap-1.5 p-1 rounded-full bg-black/5 backdrop-blur-md border border-black/5 shadow-inner">
      {Object.values(PALETTES).map((p) => {
        const isActive = activeTheme.id === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelectTheme(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
              isActive
                ? 'bg-white shadow-sm font-semibold scale-100'
                : 'opacity-70 hover:opacity-100 hover:bg-white/40'
            }`}
            style={{ color: p.textPrimary }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10 transition-transform duration-300"
              style={{ backgroundColor: p.primary, transform: isActive ? 'scale(1.2)' : 'scale(1)' }}
            />
            {p.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
