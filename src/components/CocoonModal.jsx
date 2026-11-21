import React, { useState } from 'react';

/**
 * Практика «Сбросить кокон» (Ритуал отпускания Миссис Бентли)
 * Позволяет написать то, что давит и стало тесным, и осознанно растворить это.
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
    }, 1800);
  };

  const handleReset = () => {
    setBurdenText('');
    setIsReleased(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-6 rounded-[36px] shadow-2xl border transition-all duration-500 relative"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-sm opacity-50 hover:opacity-100 p-1"
          style={{ color: activeTheme.textSecondary }}
        >
          ✕
        </button>

        {!isReleased ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${activeTheme.accent}20`,
                  color: activeTheme.accent,
                }}
              >
                Практика отпускания
              </span>
              <span className="text-xs font-serif italic opacity-70" style={{ color: activeTheme.textSecondary }}>
                по Рэю Брэдбери
              </span>
            </div>

            <h3
              className="text-lg font-serif font-medium leading-snug mb-2"
              style={{ color: activeTheme.textPrimary }}
            >
              Сбросить кокон
            </h3>

            <p
              className="text-xs leading-relaxed opacity-80 mb-4"
              style={{ color: activeTheme.textSecondary }}
            >
              «Ты сохраняешь коконы, корсеты, которые уже никогда не будут тебе впору.
              Будь той, кто ты есть сегодня вечером — схорони то, чем ты не являешься».
            </p>

            <div className="mb-4">
              <label
                htmlFor="burdenInput"
                className="block text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-1.5"
                style={{ color: activeTheme.textSecondary }}
              >
                Что стало тесным и больше тебе не служит?
              </label>
              <textarea
                id="burdenInput"
                rows={3}
                value={burdenText}
                onChange={(e) => setBurdenText(e.target.value)}
                placeholder="Пытаться всё успеть, чувство вины за отдых, чужие ожидания..."
                disabled={isDissolving}
                className={`w-full text-xs p-3 rounded-2xl bg-black/[0.02] border border-black/5 focus:outline-none focus:ring-1 transition-all resize-none ${
                  isDissolving ? 'opacity-0 scale-95 blur-md duration-1000' : 'duration-300'
                }`}
                style={{
                  color: activeTheme.textPrimary,
                  ringColor: activeTheme.primary,
                }}
              />
            </div>

            <button
              onClick={handleRelease}
              disabled={!burdenText.trim() || isDissolving}
              className={`w-full py-3 rounded-full text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-2 ${
                !burdenText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-102 hover:shadow-md'
              }`}
              style={{
                backgroundColor: activeTheme.primary,
                color: '#FFFFFF',
              }}
            >
              {isDissolving ? (
                <span className="italic font-serif animate-pulse">Растворяется в воздухе...</span>
              ) : (
                <span>Сбросить кокон и отпустить</span>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-xl shadow-inner animate-presence-breathe"
              style={{
                backgroundColor: `${activeTheme.secondary}20`,
                color: activeTheme.secondary,
              }}
            >
              ✦
            </div>

            <div>
              <h4
                className="text-base font-serif font-medium leading-snug mb-2"
                style={{ color: activeTheme.textPrimary }}
              >
                Ты — та, кто ты есть сегодня вечером.
              </h4>
              <p
                className="text-xs leading-relaxed opacity-80"
                style={{ color: activeTheme.textSecondary }}
              >
                Схоронено то, чем ты не являешься. Старый корсет сброшен. Твоё дыхание свободно, и в саду появилось место для нового ростка.
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-full text-xs font-medium transition-all shadow-xs hover:scale-105"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                color: activeTheme.textPrimary,
              }}
            >
              Сделать глубокий вдох
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
