import React, { useState } from 'react';
import { IconWind } from './RitualIcons';

/**
 * Практика «Сбросить кокон» — короткая когнитивная разгрузка без сохранения текста.
 */
export function CocoonModal({ activeTheme, isOpen, onClose }) {
  const [burdenText, setBurdenText] = useState('');
  const [isDissolving, setIsDissolving] = useState(false);
  const [isReleased, setIsReleased] = useState(false);

  if (!isOpen) return null;

  const handleRelease = () => {
    if (!burdenText.trim()) return;
    setIsDissolving(true);
    setTimeout(() => {
      setIsDissolving(false);
      setIsReleased(true);
    }, 1200);
  };

  const handleReset = () => {
    setBurdenText('');
    setIsReleased(false);
    setIsDissolving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-5 rounded-2xl shadow-2xl border relative"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-4 right-4 text-xs opacity-60 hover:opacity-100 p-1"
          style={{ color: activeTheme.textSecondary }}
          aria-label="Закрыть"
        >
          ✕
        </button>

        {!isReleased ? (
          <div>
            <div
              className="text-[10px] font-mono uppercase tracking-widest mb-1.5"
              style={{ color: activeTheme.accent }}
            >
              Разгрузка · не сохраняется в память
            </div>

            <h3
              className="text-lg font-serif font-medium leading-snug mb-2"
              style={{ color: activeTheme.textPrimary }}
            >
              Сбросить кокон
            </h3>

            <p
              className="text-xs leading-relaxed mb-4"
              style={{ color: activeTheme.textSecondary }}
            >
              Выпишите навязчивую мысль или чужое ожидание, которое создаёт напряжение.
              Текст никуда не записывается и будет удалён сразу после завершения.
            </p>

            <textarea
              rows={3}
              value={burdenText}
              onChange={(e) => setBurdenText(e.target.value)}
              placeholder="Попытка всё контролировать, лишняя спешка, чувство вины за паузу..."
              disabled={isDissolving}
              className={`w-full text-xs p-3 rounded-xl border focus:outline-none transition-all resize-none mb-4 ${
                isDissolving ? 'opacity-0 scale-95 blur-sm duration-700' : 'duration-200'
              }`}
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            />

            <button
              type="button"
              onClick={handleRelease}
              disabled={!burdenText.trim() || isDissolving}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity ${
                !burdenText.trim() || isDissolving ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: activeTheme.primary,
                color: activeTheme.primaryText,
              }}
            >
              {isDissolving ? 'Удаляется...' : 'Отпустить и очистить'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div
              className="w-11 h-11 mx-auto rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.accent,
              }}
            >
              <IconWind className="w-5 h-5" />
            </div>

            <div>
              <h4
                className="text-base font-serif font-medium mb-1.5"
                style={{ color: activeTheme.textPrimary }}
              >
                Очищено. Этого достаточно.
              </h4>
              <p
                className="text-xs leading-relaxed"
                style={{ color: activeTheme.textSecondary }}
              >
                Запись удалена без следа. Можно вернуться к спокойному ритму вечера.
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2 rounded-xl text-xs font-medium border transition-colors"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
