import React, { useState } from 'react';

/**
 * Практика «Пауза перед покупкой» — добавляет реальную 24-часовую запись в очередь проверки.
 */
export function ShoppingPauseModal({ activeTheme, isOpen, onClose, onAddPause }) {
  const [itemName, setItemName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(null);

  if (!isOpen) return null;

  const TRIGGERS = [
    'Покупаю из усталости или перегруза',
    'Будет ли вещь нужна через месяц',
    'Есть ли для неё место и задача',
  ];

  const handleSubmit = (status) => {
    const clean = itemName.trim();
    if (!clean) return;
    if (onAddPause) {
      onAddPause({
        id: `pause_${Date.now()}`,
        item: clean,
        feeling: selectedTrigger,
        createdAt: new Date().toISOString(),
        status, // 'waiting' | 'bought'
      });
    }
    setItemName('');
    setSelectedTrigger(null);
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
          onClick={onClose}
          className="absolute top-4 right-4 text-xs opacity-60 hover:opacity-100 p-1"
          style={{ color: activeTheme.textSecondary }}
          aria-label="Закрыть"
        >
          ✕
        </button>

        <div className="space-y-4">
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest block mb-1"
              style={{ color: activeTheme.accent }}
            >
              Поведенческий фильтр · 24 ч
            </span>
            <h3
              className="text-lg font-serif font-medium"
              style={{ color: activeTheme.textPrimary }}
            >
              Пауза перед покупкой
            </h3>
            <p className="text-xs mt-0.5" style={{ color: activeTheme.textSecondary }}>
              Отложенная позиция появится в списке проверки с таймером на 24 часа.
            </p>
          </div>

          <div>
            <label
              htmlFor="shoppingItemInput"
              className="block text-[10px] font-mono uppercase tracking-wider mb-1.5"
              style={{ color: activeTheme.textSecondary }}
            >
              Что в корзине
            </label>
            <input
              id="shoppingItemInput"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Одежда, книга, техника, предмет для дома..."
              className="w-full text-xs p-2.5 rounded-xl border focus:outline-none"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            />
          </div>

          <div>
            <span
              className="block text-[10px] font-mono uppercase tracking-wider mb-1.5"
              style={{ color: activeTheme.textSecondary }}
            >
              Контрольный вопрос
            </span>
            <div className="space-y-1.5">
              {TRIGGERS.map((q) => {
                const isSel = selectedTrigger === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedTrigger(q)}
                    className="w-full p-2.5 rounded-xl border text-left text-xs transition-colors"
                    style={{
                      backgroundColor: isSel ? activeTheme.surfaceContainer : 'transparent',
                      borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                      color: isSel ? activeTheme.textPrimary : activeTheme.textSecondary,
                    }}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSubmit('waiting')}
              disabled={!itemName.trim()}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-opacity ${
                !itemName.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: activeTheme.primary,
                color: activeTheme.primaryText,
              }}
            >
              Отложить на 24 ч
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('bought')}
              disabled={!itemName.trim()}
              className={`py-2.5 rounded-xl text-xs font-medium border transition-opacity ${
                !itemName.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            >
              Беру осознанно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
