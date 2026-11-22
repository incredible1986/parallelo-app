import React, { useState } from 'react';
import { IconCheck } from './RitualIcons';

/**
 * Модальное окно фиксации движения и тренировки (без подсчёта калорий, с числовой шкалой отклика 1–10).
 */
export function WorkoutModal({ activeTheme, isOpen, onClose, onComplete }) {
  const [activityType, setActivityType] = useState('Растяжка и мобильность');
  const [duration, setDuration] = useState(30);
  const [feeling, setFeeling] = useState('Приятное тепло');
  const [enjoyment, setEnjoyment] = useState(8);

  if (!isOpen) return null;

  const ACTIVITIES = [
    { id: 'stretch', title: 'Растяжка и мобильность', desc: 'Снятие зажимов, спина и суставы' },
    { id: 'strength', title: 'Силовая / тонус', desc: 'Опора, мышечный корсет, осанка' },
    { id: 'cardio', title: 'Бег / кардио', desc: 'Выносливость и ровное дыхание' },
    { id: 'swim', title: 'Плавание / вода', desc: 'Разгрузка позвоночника и суставов' },
    { id: 'warmup', title: 'Зарядка 15 мин', desc: 'Базовая активация тела' },
  ];

  const FEELINGS = [
    'Приятное тепло',
    'Спина расправилась',
    'Ясность в голове',
    'Снято напряжение',
    'Лёгкость в ногах',
    'Усталость без перегруза',
  ];

  const handleSave = () => {
    const entry = {
      type: activityType,
      duration: Number(duration),
      feeling,
      enjoyment: Number(enjoyment),
      timestamp: new Date().toISOString(),
    };
    if (onComplete) onComplete(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-5 rounded-2xl shadow-2xl border relative max-h-[90vh] overflow-y-auto"
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
              style={{ color: activeTheme.primary }}
            >
              Фактор · нагрузка и отклик
            </span>
            <h3
              className="text-lg font-serif font-medium"
              style={{ color: activeTheme.textPrimary }}
            >
              Движение и тренировка
            </h3>
            <p className="text-xs mt-0.5" style={{ color: activeTheme.textSecondary }}>
              Учитывается в корреляциях сна и ресурса на следующий день (+350 мл к норме воды).
            </p>
          </div>

          <div>
            <span
              className="block text-[10px] font-mono uppercase tracking-wider mb-2"
              style={{ color: activeTheme.textSecondary }}
            >
              Тип активности
            </span>
            <div className="space-y-1.5">
              {ACTIVITIES.map((act) => {
                const isSelected = activityType === act.title;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivityType(act.title)}
                    className="w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors"
                    style={{
                      backgroundColor: isSelected ? activeTheme.surfaceContainer : 'transparent',
                      borderColor: isSelected ? activeTheme.primary : activeTheme.borderColor,
                      color: activeTheme.textPrimary,
                    }}
                  >
                    <div>
                      <div className="text-xs font-medium">{act.title}</div>
                      <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                        {act.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: activeTheme.primary,
                          color: activeTheme.primaryText,
                        }}
                      >
                        <IconCheck className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: activeTheme.textSecondary }}
              >
                Длительность
              </span>
              <span className="text-xs font-mono tabular-nums font-medium" style={{ color: activeTheme.primary }}>
                {duration} мин
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 45, 60].map((mins) => {
                const isSel = duration === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className="py-1.5 rounded-lg border text-xs font-mono tabular-nums transition-colors"
                    style={{
                      backgroundColor: isSel ? activeTheme.primary : activeTheme.surfaceContainer,
                      borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                      color: isSel ? activeTheme.primaryText : activeTheme.textPrimary,
                    }}
                  >
                    {mins}м
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span
              className="block text-[10px] font-mono uppercase tracking-wider mb-1.5"
              style={{ color: activeTheme.textSecondary }}
            >
              Телесный отклик
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FEELINGS.map((f) => {
                const isSel = feeling === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeeling(f)}
                    className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                    style={{
                      backgroundColor: isSel ? activeTheme.surfaceContainer : 'transparent',
                      borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                      color: isSel ? activeTheme.textPrimary : activeTheme.textSecondary,
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: activeTheme.textSecondary }}
              >
                Удовольствие от движения
              </span>
              <span className="text-xs font-mono tabular-nums font-semibold" style={{ color: activeTheme.primary }}>
                {enjoyment} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={enjoyment}
              onChange={(e) => setEnjoyment(Number(e.target.value))}
              className="w-full parallelo-range"
              style={{
                background: activeTheme.borderColor,
                '--range-accent': activeTheme.primary,
                '--range-surface': activeTheme.surfaceCard,
              }}
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: activeTheme.textMuted }}>
              <span>Через усилие</span>
              <span>Лёгкость и ресурс</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: activeTheme.primary,
              color: activeTheme.primaryText,
            }}
          >
            Зафиксировать в дне
          </button>
        </div>
      </div>
    </div>
  );
}
