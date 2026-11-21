import React, { useState } from 'react';
import { StorageService } from '../services/storage';

/**
 * Модальное окно практики «Движение и тренировка» (Телесная радость)
 * Философия Parallelo: Движение без насилия, без подсчёта сожжённых калорий.
 */
export function WorkoutModal({ activeTheme, isOpen, onClose, onComplete }) {
  const [activityType, setActivityType] = useState('Растяжка и йога');
  const [duration, setDuration] = useState('30');
  const [feeling, setFeeling] = useState('Приятное тепло');
  const [enjoyment, setEnjoyment] = useState(8);
  const [resultMessage, setResultMessage] = useState(null);

  if (!isOpen) return null;

  const ACTIVITIES = [
    { id: 'stretch', title: 'Растяжка и йога', desc: 'Снять зажимы в спине и шее', icon: '🧘‍♀️' },
    { id: 'strength', title: 'Силовая / Тонус', desc: 'Опора, сила и осанка', icon: '🏋️‍♀️' },
    { id: 'cardio', title: 'Бег / Кардио', desc: 'Свежий воздух и дыхание', icon: '🏃‍♀️' },
    { id: 'swim', title: 'Плавание / Вода', desc: 'Лёгкость и невесомость суставов', icon: '🏊‍♀️' },
    { id: 'warmup', title: 'Зарядка 15 мин', desc: 'Мягко разбудить тело', icon: '🤸‍♀️' },
  ];

  const FEELINGS = [
    'Приятное тепло',
    'Спина расправилась',
    'Ясность в голове',
    'Снято напряжение',
    'Лёгкость в ногах',
    'Бодрость',
  ];

  const handleSave = () => {
    const workouts = StorageService.get('parallelo_workouts', []);
    const newEntry = {
      type: activityType,
      duration: Number(duration),
      feeling,
      enjoyment,
      date: new Date().toISOString(),
    };
    workouts.unshift(newEntry);
    StorageService.set('parallelo_workouts', workouts.slice(0, 30));

    setResultMessage(`Тело сказало спасибо! «${activityType}» согрела мышцы и подарила лёгкость.`);
    setTimeout(() => {
      setResultMessage(null);
      if (onComplete) onComplete(newEntry);
      onClose();
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-6 rounded-[36px] shadow-2xl border transition-all duration-300 relative max-h-[90vh] overflow-y-auto"
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
          <div className="space-y-4">
            <div>
              <span
                className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${activeTheme.primary}15`,
                  color: activeTheme.primary,
                }}
              >
                Телесная радость
              </span>
              <h3
                className="text-lg font-serif font-medium mt-1.5"
                style={{ color: activeTheme.textPrimary }}
              >
                Движение и тренировка
              </h3>
              <p
                className="text-xs opacity-75 mt-0.5 leading-relaxed"
                style={{ color: activeTheme.textSecondary }}
              >
                Мы двигаемся не ради сожжённых калорий, а чтобы почувствовать жизнь и свободу в теле.
              </p>
            </div>

            {/* 1. Выбор вида активности */}
            <div>
              <span
                className="block text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-2"
                style={{ color: activeTheme.textSecondary }}
              >
                Что это было сегодня
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {ACTIVITIES.map((act) => {
                  const isSelected = activityType === act.title;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActivityType(act.title)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected ? 'shadow-xs font-medium' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? activeTheme.surfaceContainer : 'transparent',
                        borderColor: isSelected ? activeTheme.primary : activeTheme.borderColor,
                        color: activeTheme.textPrimary,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{act.icon}</span>
                        <div>
                          <div className="text-xs font-serif">{act.title}</div>
                          <div className="text-[10px] opacity-65">{act.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: activeTheme.primary }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Длительность в минутах */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[11px] font-semibold tracking-wider uppercase opacity-70"
                  style={{ color: activeTheme.textSecondary }}
                >
                  Сколько длилось движение
                </span>
                <span className="text-xs font-semibold" style={{ color: activeTheme.primary }}>
                  {duration} мин
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['15', '30', '45', '60'].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`py-1.5 rounded-xl border text-xs transition-all ${
                      duration === mins ? 'font-medium shadow-xs' : 'opacity-65'
                    }`}
                    style={{
                      backgroundColor: duration === mins ? activeTheme.surfaceContainer : 'transparent',
                      borderColor: duration === mins ? activeTheme.primary : activeTheme.borderColor,
                      color: activeTheme.textPrimary,
                    }}
                  >
                    {mins}м
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Ощущения в теле */}
            <div>
              <span
                className="block text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-1.5"
                style={{ color: activeTheme.textSecondary }}
              >
                Что почувствовало тело
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FEELINGS.map((f) => {
                  const isSel = feeling === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFeeling(f)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        isSel ? 'shadow-xs font-medium scale-102' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSel ? activeTheme.surfaceContainer : 'transparent',
                        borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                        color: activeTheme.textPrimary,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Шкала радости движения (1-10) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] font-semibold tracking-wider uppercase opacity-70"
                  style={{ color: activeTheme.textSecondary }}
                >
                  Радость движения (без насилия)
                </span>
                <span className="text-xs font-bold" style={{ color: activeTheme.primary }}>
                  {enjoyment} / 10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={enjoyment}
                onChange={(e) => setEnjoyment(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] opacity-50">
                <span>Еле заставила себя</span>
                <span>В кайф и лёгкость</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 rounded-full text-xs font-medium text-white shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: activeTheme.primary }}
            >
              Зафиксировать радость тела
            </button>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3 animate-fade-in">
            <span className="text-3xl">🌿 ✨</span>
            <p
              className="text-sm font-serif italic leading-relaxed"
              style={{ color: activeTheme.textPrimary }}
            >
              {resultMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
