import React from 'react';
import { IconMoon, IconSun } from './RitualIcons';

export function Header({ activeTheme, onQuickToggleTheme, totalDays }) {
  return (
    <header
      className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b"
      style={{ borderColor: activeTheme.borderColor }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src="./branding/parallelo-p-3d.jpg"
            alt="Parallelo"
            className="w-9 h-9 rounded-xl object-cover border"
            style={{ borderColor: activeTheme.borderColor }}
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 animate-presence-breathe"
            style={{
              backgroundColor: activeTheme.accent,
              borderColor: activeTheme.surface,
            }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-lg font-serif font-medium tracking-wider leading-none"
              style={{ color: activeTheme.textPrimary }}
            >
              PARALLELO
            </h1>
            <span
              className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border"
              style={{
                borderColor: activeTheme.borderColor,
                color: activeTheme.textSecondary,
                backgroundColor: activeTheme.surfaceContainer,
              }}
            >
              n={totalDays}
            </span>
          </div>
          <p
            className="text-[11px] mt-0.5 tracking-tight"
            style={{ color: activeTheme.textSecondary }}
          >
            Ритмы · Телеметрия · Корреляции
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onQuickToggleTheme}
        className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
          color: activeTheme.textSecondary,
        }}
        title={activeTheme.isDark ? 'Светлая тема (Известняк)' : 'Тёмная тема (Ночной прибор)'}
        aria-label="Переключить тему"
      >
        {activeTheme.isDark ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
      </button>
    </header>
  );
}
