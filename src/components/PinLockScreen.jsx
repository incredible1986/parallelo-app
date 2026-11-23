import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { IconShield } from './RitualIcons';

/**
 * Экран блокировки 4-значным PIN-кодом (опциональная защита чувствительных данных).
 */
export function PinLockScreen({ activeTheme, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = async (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      const ok = await StorageService.verifyPin(next);
      if (ok) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
        }, 450);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 font-sans"
      style={{
        backgroundColor: activeTheme.surface,
        color: activeTheme.textPrimary,
      }}
    >
      <div className="w-full max-w-xs space-y-6 text-center">
        <div
          className="w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
            color: activeTheme.primary,
          }}
        >
          <IconShield className="w-5 h-5" />
        </div>

        <div>
          <h1 className="text-lg font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
            PARALLELO
          </h1>
          <p className="text-xs mt-1" style={{ color: error ? activeTheme.danger : activeTheme.textSecondary }}>
            {error ? 'Неверный PIN-код' : 'Введите 4-значный PIN-код'}
          </p>
        </div>

        {/* Индикатор 4 точек */}
        <div className="flex items-center justify-center gap-4 py-1">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < pin.length;
            return (
              <span
                key={idx}
                className="w-3.5 h-3.5 rounded-full border transition-all"
                style={{
                  backgroundColor: filled
                    ? error
                      ? activeTheme.danger
                      : activeTheme.primary
                    : 'transparent',
                  borderColor: error
                    ? activeTheme.danger
                    : filled
                    ? activeTheme.primary
                    : activeTheme.borderColor,
                }}
              />
            );
          })}
        </div>

        {/* Цифровая клавиатура */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl border text-lg font-medium tabular-nums transition-colors active:scale-95"
              style={{
                backgroundColor: activeTheme.surfaceCard,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl border text-lg font-medium tabular-nums transition-colors active:scale-95"
            style={{
              backgroundColor: activeTheme.surfaceCard,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl border text-sm font-medium transition-colors active:scale-95"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textSecondary,
            }}
            aria-label="Удалить цифру"
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
}
