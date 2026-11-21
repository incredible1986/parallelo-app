import React, { useState } from 'react';
import { StorageService } from '../services/storage';

/**
 * Практика «Осознанная покупка» (Пауза перед корзиной маркетплейса)
 * Философия Брэдбери: «Сирень лучше орхидей. Не гонись за большим».
 */
export function ShoppingPauseModal({ activeTheme, isOpen, onClose }) {
  const [itemName, setItemName] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);

  if (!isOpen) return null;

  const handlePostpone = () => {
    if (itemName.trim()) {
      const pauses = StorageService.get('parallelo_shopping_pauses', []);
      pauses.unshift({
        item: itemName.trim(),
        feeling: selectedFeeling,
        timestamp: new Date().toISOString(),
      });
      StorageService.set('parallelo_shopping_pauses', pauses.slice(0, 20));
    }
    setResultMessage('Отложено на 24 часа. Ты сберегла внимание и место в доме. Выдохни.');
    setTimeout(() => {
      setResultMessage(null);
      setItemName('');
      onClose();
    }, 2800);
  };

  const handleConfirmMindful = () => {
    setResultMessage('Покупка осознана. Пусть эта вещь дарит тепло и уют.');
    setTimeout(() => {
      setResultMessage(null);
      setItemName('');
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-6 rounded-[36px] shadow-2xl border transition-all duration-300 relative"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-sm opacity-50 hover:opacity-100 p-1"
          style={{ color: activeTheme.textSecondary }}
        >
          ✕
        </button>

        {!resultMessage ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${activeTheme.secondary}20`,
                  color: activeTheme.secondary,
                }}
              >
                Осознанное потребление
              </span>
              <span className="text-xs font-serif italic opacity-70" style={{ color: activeTheme.textSecondary }}>
                Пауза перед оплатой
              </span>
            </div>

            <h3
              className="text-lg font-serif font-medium leading-snug mb-2"
              style={{ color: activeTheme.textPrimary }}
            >
              Что ты собираешься купить?
            </h3>

            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Новое платье, книга, посуда, техника..."
              className="w-full text-xs p-3 rounded-2xl bg-black/[0.02] border border-black/5 focus:outline-none focus:ring-1 mb-4"
              style={{ color: activeTheme.textPrimary, ringColor: activeTheme.primary }}
            />

            <div className="space-y-2 mb-5">
              <span className="block text-[11px] font-semibold tracking-wider uppercase opacity-70" style={{ color: activeTheme.textSecondary }}>
                Честный вопрос к телу:
              </span>
              {[
                'Я покупаю это от усталости или скуки?',
                'Будет ли эта вещь согревать меня через месяц?',
                'Есть ли для неё свободное место в доме?',
              ].map((q) => (
                <div
                  key={q}
                  onClick={() => setSelectedFeeling(q)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedFeeling === q ? 'font-medium shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: selectedFeeling === q ? activeTheme.surfaceContainer : 'transparent',
                    borderColor: selectedFeeling === q ? activeTheme.primary : activeTheme.borderColor,
                    color: activeTheme.textPrimary,
                  }}
                >
                  {q}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePostpone}
                className="py-2.5 rounded-full text-xs font-medium border transition-all hover:bg-black/5"
                style={{
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              >
                Отложить на сутки
              </button>
              <button
                onClick={handleConfirmMindful}
                className="py-2.5 rounded-full text-xs font-medium text-white transition-all shadow-xs hover:shadow-md hover:scale-102"
                style={{ backgroundColor: activeTheme.primary }}
              >
                Беру осознанно
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3 animate-fade-in">
            <div className="text-3xl">🌿</div>
            <p className="text-xs font-serif leading-relaxed" style={{ color: activeTheme.textPrimary }}>
              {resultMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
