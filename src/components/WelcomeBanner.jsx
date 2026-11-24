import React, { useState } from 'react';
import { StorageService } from '../services/storage';

/**
 * Лаконичная вводная карточка. Состояние скрытия сохраняется в localStorage.
 */
export function WelcomeBanner({ activeTheme }) {
  const [dismissed, setDismissed] = useState(() => Boolean(StorageService.getUiPrefs().welcomeDismissed));

  const handleDismiss = () => {
    setDismissed(true);
    StorageService.saveUiPrefs({ welcomeDismissed: true });
  };

  if (dismissed) return null;

  return (
    <div
      className="p-4 rounded-2xl border relative animate-fade-in"
      style={{
        backgroundColor: activeTheme.surfaceContainer,
        borderColor: activeTheme.borderColor,
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 text-xs px-1.5 py-0.5 rounded hover:opacity-100 opacity-60 transition-opacity"
        style={{ color: activeTheme.textSecondary }}
        aria-label="Скрыть описание"
      >
        ✕
      </button>

      <div
        className="text-[11px] font-medium mb-1"
        style={{ color: activeTheme.primary }}
      >
        Без оценок, давления и чувства вины
      </div>

      <h2
        className="text-sm font-serif font-medium leading-snug pr-6 mb-2"
        style={{ color: activeTheme.textPrimary }}
      >
        Честные наблюдения за своим состоянием
      </h2>

      <p
        className="text-xs leading-relaxed mb-3"
        style={{ color: activeTheme.textSecondary }}
      >
        Отмечайте самочувствие, сон и события дня — Parallelo сам заметит, что даёт вам силы,
        а что их забирает.
      </p>

      <div
        className="grid grid-cols-3 gap-2 pt-3 border-t text-[11px]"
        style={{ borderColor: activeTheme.borderColor }}
      >
        <div>
          <span className="font-medium block" style={{ color: activeTheme.primary }}>
            1. День
          </span>
          <span style={{ color: activeTheme.textSecondary }}>Самочувствие и сон за 15 сек</span>
        </div>
        <div>
          <span className="font-medium block" style={{ color: activeTheme.primary }}>
            2. Факторы
          </span>
          <span style={{ color: activeTheme.textSecondary }}>Привычки, близость, алкоголь</span>
        </div>
        <div>
          <span className="font-medium block" style={{ color: activeTheme.primary }}>
            3. Связи
          </span>
          <span style={{ color: activeTheme.textSecondary }}>Что меняет ваше завтра</span>
        </div>
      </div>
    </div>
  );
}
