import React, { useState } from 'react';
import { RITUALS_CATALOG } from '../data/questionsData';
import { RITUAL_ICONS } from './RitualIcons';
import { ShoppingPauseModal } from './ShoppingPauseModal';
import { WorkoutModal } from './WorkoutModal';
import { StorageService } from '../services/storage';

export function RitualLogger({ activeTheme, onLogRitual }) {
  // Чистый старт: никаких предвыбранных ритуалов-заглушек
  const [loggedRituals, setLoggedRituals] = useState(() => 
    StorageService.get('parallelo_logged_rituals', [])
  );
  const [feedback, setFeedback] = useState(null);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);

  const handleToggleRitual = (ritual) => {
    if (ritual.id === 'mindful_shopping') {
      setIsShoppingOpen(true);
      return;
    }

    if (ritual.id === 'movement') {
      setIsWorkoutOpen(true);
      return;
    }

    const isAlready = loggedRituals.includes(ritual.id);
    let updated;
    if (isAlready) {
      updated = loggedRituals.filter((id) => id !== ritual.id);
      setFeedback(`Ритуал «${ritual.title}» снят.`);
    } else {
      updated = [...loggedRituals, ritual.id];
      if (ritual.id === 'warm_plate') {
        setFeedback('Тёплая пища согрела тело. Чувство лёгкости и заботы.');
      } else {
        setFeedback(`Ритуал «${ritual.title}» зафиксирован. Твой якорь силы.`);
      }
      if (onLogRitual) onLogRitual(ritual);
    }
    setLoggedRituals(updated);
    StorageService.set('parallelo_logged_rituals', updated);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleWorkoutComplete = (workoutData) => {
    if (!loggedRituals.includes('movement')) {
      const updated = [...loggedRituals, 'movement'];
      setLoggedRituals(updated);
      StorageService.set('parallelo_logged_rituals', updated);
    }
    setFeedback(`«${workoutData.type}» зафиксирована. Тело наполнено жизнью и теплом.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-5">
      {/* Шапка блока */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-serif font-normal"
            style={{ color: activeTheme.textPrimary }}
          >
            Якоря и ритуалы
          </h3>
          <p
            className="text-xs opacity-70"
            style={{ color: activeTheme.textSecondary }}
          >
            Действия, которые возвращают тебя в тело и настоящее
          </p>
        </div>
      </div>

      {/* Плитки авторских ритуалов */}
      <div className="grid grid-cols-1 gap-3">
        {RITUALS_CATALOG.map((ritual) => {
          const isDone = loggedRituals.includes(ritual.id);
          const IconComponent = RITUAL_ICONS[ritual.iconKey] || RITUAL_ICONS.presence;

          return (
            <div
              key={ritual.id}
              onClick={() => handleToggleRitual(ritual)}
              className={`p-4 rounded-3xl border cursor-pointer transition-all duration-300 flex items-center justify-between shadow-xs hover:shadow-md ${
                isDone ? 'scale-[1.01]' : 'hover:scale-[1.005]'
              }`}
              style={{
                backgroundColor: isDone ? activeTheme.surfaceContainer : activeTheme.surfaceCard,
                borderColor: isDone ? activeTheme.primary : activeTheme.borderColor,
              }}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: isDone ? activeTheme.primary : 'rgba(0,0,0,0.03)',
                    color: isDone ? '#FFFFFF' : activeTheme.primary,
                  }}
                >
                  <IconComponent className="w-6 h-6" isPulsing={isDone} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-serif font-medium"
                      style={{ color: activeTheme.textPrimary }}
                    >
                      {ritual.title}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: isDone ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.04)',
                        color: activeTheme.textSecondary,
                      }}
                    >
                      {ritual.duration}
                    </span>
                  </div>
                  <p
                    className="text-xs opacity-75 mt-0.5"
                    style={{ color: activeTheme.textSecondary }}
                  >
                    {ritual.desc}
                  </p>
                </div>
              </div>

              {/* Индикатор выбора */}
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  isDone ? 'scale-110 shadow-xs' : 'border-black/20'
                }`}
                style={{
                  backgroundColor: isDone ? activeTheme.primary : 'transparent',
                  borderColor: isDone ? activeTheme.primary : activeTheme.borderColor,
                }}
              >
                {isDone && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div
          className="p-3 rounded-2xl text-center text-xs font-serif italic animate-fade-in border border-black/5"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            color: activeTheme.textPrimary,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Пассивная интеграция с Apple Health (Связь тела и души) */}
      <div
        className="p-4 rounded-3xl border border-dashed flex items-center justify-between"
        style={{
          borderColor: activeTheme.borderColor,
          backgroundColor: 'rgba(0,0,0,0.015)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
            }}
          >
            ♥
          </div>
          <div>
            <div
              className="text-xs font-medium"
              style={{ color: activeTheme.textPrimary }}
            >
              Синхронизация здоровья (Health Connect / realme)
            </div>
            <div
              className="text-[11px] opacity-70"
              style={{ color: activeTheme.textSecondary }}
            >
              Сон 7 ч 40 мин · Глубокий сон 1.9 ч · Пульс покоя 58 уд/мин
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700"
        >
          Подключено
        </span>
      </div>

      {/* Модальное окно осознанного шоппинга */}
      <ShoppingPauseModal
        activeTheme={activeTheme}
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
      />

      {/* Модальное окно движения и тренировок */}
      <WorkoutModal
        activeTheme={activeTheme}
        isOpen={isWorkoutOpen}
        onClose={() => setIsWorkoutOpen(false)}
        onComplete={handleWorkoutComplete}
      />
    </div>
  );
}
