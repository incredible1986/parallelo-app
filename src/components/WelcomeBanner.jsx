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
        className="text-[10px] font-mono uppercase tracking-widest mb-1.5"
        style={{ color: activeTheme.primary }}
      >
        Принцип работы · без стриков и штрафов
      </div>

      <h2
        className="text-sm font-serif font-medium leading-snug pr-6 mb-2"
        style={{ color: activeTheme.textPrimary }}
      >
        Личная модель состояния на основе реальных наблюдений
      </h2>

      <p
        className="text-xs leading-relaxed mb-3"
        style={{ color: activeTheme.textSecondary }}
      >
        Фиксируйте 4 числовых показателя и факторы дня. Parallelo считает индекс ресурса,
        среднеквадратическое отклонение, линейный тренд и отложенное влияние ритуалов на следующий день.
      </p>

      <div
        className="grid grid-cols-3 gap-2 pt-3 border-t text-[11px]"
        style={{ borderColor: activeTheme.borderColor }}
      >
        <div>
          <span className="font-mono text-[10px] block" style={{ color: activeTheme.primary }}>
            01 / Ввод
          </span>
          <span style={{ color: activeTheme.textSecondary }}>4 шкалы и сон за 15 сек</span>
        </div>
        <div>
          <span className="font-mono text-[10px] block" style={{ color: activeTheme.primary }}>
            02 / Факторы
          </span>
          <span style={{ color: activeTheme.textSecondary }}>Баня, движение, паузы</span>
        </div>
        <div>
          <span className="font-mono text-[10px] block" style={{ color: activeTheme.primary }}>
            03 / Модель
          </span>
          <span style={{ color: activeTheme.textSecondary }}>МНК, σ, лаг t → t+1</span>
        </div>
      </div>
    </div>
  );
}
