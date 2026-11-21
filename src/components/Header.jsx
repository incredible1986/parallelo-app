import React from 'react';

export function Header({ activeTheme }) {
  return (
    <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-black/5">
      <div className="flex items-center gap-3">
        {/* 1. App Icon: 3D Ribbon P (Stitch #1) */}
        <div className="relative group cursor-pointer">
          <img
            src="/branding/parallelo-p-3d.jpg"
            alt="Parallelo Icon"
            className="w-11 h-11 rounded-2xl shadow-sm object-cover border border-white/60 transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs animate-presence-breathe"
            style={{ backgroundColor: activeTheme.accent }}
            title="Присутствие активно"
          />
        </div>

        {/* Brand Title: Тело и душа */}
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl font-serif font-normal tracking-wide leading-none"
              style={{ color: activeTheme.textPrimary }}
            >
              PARALLELO
            </h1>
            <span
              className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md bg-black/5"
              style={{ color: activeTheme.textSecondary }}
            >
              Тело и душа
            </span>
          </div>
          <p
            className="text-xs font-sans mt-0.5 opacity-80"
            style={{ color: activeTheme.textSecondary }}
          >
            {activeTheme.subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}
