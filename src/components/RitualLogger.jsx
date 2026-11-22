import React, { useState, useMemo } from 'react';
import { RITUALS_CATALOG } from '../data/questionsData';
import { formatFullRuDate } from '../services/storage';
import { RITUAL_ICONS, IconCheck, IconClock, IconPulse } from './RitualIcons';
import { ShoppingPauseModal } from './ShoppingPauseModal';
import { WorkoutModal } from './WorkoutModal';

function formatRemaining24h(createdAtIso) {
  const createdMs = new Date(createdAtIso).getTime();
  const targetMs = createdMs + 24 * 60 * 60 * 1000;
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return { ready: true, text: '24 ч прошли · можно решить' };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { ready: false, text: `осталось ${hours} ч ${mins} м` };
}

export function RitualLogger({
  activeTheme,
  selectedDate,
  dayRecord,
  allRecords,
  onUpdateDay,
  shoppingPauses,
  onUpdatePauses,
}) {
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const activeRituals = dayRecord.rituals || [];

  // Реальные счётчики каждого фактора по всей истории записей
  const historyCounts = useMemo(() => {
    const counts = {};
    Object.values(allRecords || {}).forEach((rec) => {
      (rec.rituals || []).forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [allRecords]);

  const showNotice = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleRitual = (ritual) => {
    if (ritual.id === 'mindful_shopping') {
      setIsShoppingOpen(true);
      return;
    }

    if (ritual.id === 'movement') {
      setIsWorkoutOpen(true);
      return;
    }

    const exists = activeRituals.includes(ritual.id);
    const nextRituals = exists
      ? activeRituals.filter((id) => id !== ritual.id)
      : [...activeRituals, ritual.id];

    onUpdateDay(selectedDate, { rituals: nextRituals, isSaved: true });
    showNotice(
      exists
        ? `Фактор «${ritual.title}» снят с записи дня.`
        : `Фактор «${ritual.title}» учтён в модели дня.`
    );
  };

  const handleWorkoutComplete = (workoutEntry) => {
    const nextWorkouts = [...(dayRecord.workouts || []), workoutEntry];
    const nextRituals = activeRituals.includes('movement')
      ? activeRituals
      : [...activeRituals, 'movement'];
    onUpdateDay(selectedDate, {
      rituals: nextRituals,
      workouts: nextWorkouts,
      isSaved: true,
    });
    showNotice(`Зафиксировано: ${workoutEntry.type} (${workoutEntry.duration} мин, ${workoutEntry.enjoyment}/10).`);
  };

  const handleAddShoppingPause = (pauseObj) => {
    const nextPauses = [pauseObj, ...(shoppingPauses || [])];
    onUpdatePauses(nextPauses);
    if (!activeRituals.includes('mindful_shopping')) {
      onUpdateDay(selectedDate, {
        rituals: [...activeRituals, 'mindful_shopping'],
        isSaved: true,
      });
    }
    showNotice(
      pauseObj.status === 'waiting'
        ? `«${pauseObj.item}» отложено на 24 часа.`
        : `Покупка «${pauseObj.item}» отмечена как осознанная.`
    );
  };

  const handleResolvePause = (id, newStatus) => {
    const next = (shoppingPauses || []).map((p) =>
      p.id === id ? { ...p, status: newStatus, resolvedAt: new Date().toISOString() } : p
    );
    onUpdatePauses(next);
  };

  const activeWaitingPauses = (shoppingPauses || []).filter((p) => p.status === 'waiting');
  const skippedCount = (shoppingPauses || []).filter((p) => p.status === 'skipped').length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: activeTheme.textSecondary }}
          >
            Факторы дня · {formatFullRuDate(selectedDate)}
          </span>
          <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
            Переменные и якоря
          </h2>
        </div>
        <span
          className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-lg border"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
            color: activeTheme.primary,
          }}
        >
          {activeRituals.length} / {RITUALS_CATALOG.length}
        </span>
      </div>

      {feedback && (
        <div
          className="px-3.5 py-2.5 rounded-xl border text-xs animate-fade-in"
          style={{
            backgroundColor: activeTheme.surfaceElevated,
            borderColor: activeTheme.accent,
            color: activeTheme.textPrimary,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Каталог факторов */}
      <div className="space-y-2">
        {RITUALS_CATALOG.map((ritual) => {
          const isDone = activeRituals.includes(ritual.id);
          const IconComponent = RITUAL_ICONS[ritual.iconKey] || RITUAL_ICONS.presence;
          const totalCount = historyCounts[ritual.id] || 0;

          return (
            <button
              key={ritual.id}
              type="button"
              onClick={() => handleToggleRitual(ritual)}
              className="w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors"
              style={{
                backgroundColor: isDone ? activeTheme.surfaceElevated : activeTheme.surfaceCard,
                borderColor: isDone ? activeTheme.primary : activeTheme.borderColor,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isDone ? activeTheme.primary : activeTheme.surfaceContainer,
                    borderColor: isDone ? activeTheme.primary : activeTheme.borderColor,
                    color: isDone ? activeTheme.primaryText : activeTheme.textSecondary,
                  }}
                >
                  <IconComponent className="w-5 h-5" isPulsing={isDone && ritual.iconKey === 'presence'} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                      {ritual.title}
                    </span>
                    <span
                      className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: activeTheme.surfaceContainer,
                        color: activeTheme.textSecondary,
                      }}
                    >
                      n={totalCount}
                    </span>
                    {ritual.waterBonusMl > 0 && (
                      <span
                        className="text-[10px] font-mono tabular-nums"
                        style={{ color: activeTheme.secondary }}
                      >
                        +{ritual.waterBonusMl}мл
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: activeTheme.textSecondary }}>
                    {ritual.desc}
                  </p>
                </div>
              </div>

              <div
                className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: isDone ? activeTheme.primary : 'transparent',
                  borderColor: isDone ? activeTheme.primary : activeTheme.borderColor,
                  color: activeTheme.primaryText,
                }}
              >
                {isDone && <IconCheck className="w-3.5 h-3.5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Зафиксированные тренировки за выбранный день */}
      {(dayRecord.workouts || []).length > 0 && (
        <div
          className="p-4 rounded-2xl border space-y-2"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: activeTheme.textSecondary }}
          >
            Движение за этот день
          </span>
          {dayRecord.workouts.map((w, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <div>
                <div className="font-medium" style={{ color: activeTheme.textPrimary }}>
                  {w.type}
                </div>
                <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                  {w.feeling}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums text-[11px]">
                <div style={{ color: activeTheme.primary }}>{w.duration} мин</div>
                <div style={{ color: activeTheme.textSecondary }}>{w.enjoyment}/10</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Активная очередь 24-часовых пауз перед покупкой */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconClock className="w-4 h-4" style={{ color: activeTheme.accent }} />
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: activeTheme.textSecondary }}
            >
              Очередь пауз 24 ч
            </span>
          </div>
          {skippedCount > 0 && (
            <span className="text-[10px] font-mono tabular-nums" style={{ color: activeTheme.accent }}>
              отменено импульсов: {skippedCount}
            </span>
          )}
        </div>

        {activeWaitingPauses.length === 0 ? (
          <p className="text-xs" style={{ color: activeTheme.textSecondary }}>
            Нет отложенных покупок. Нажмите «Пауза перед покупкой» выше, чтобы добавить позицию на 24-часовую проверку.
          </p>
        ) : (
          <div className="space-y-2">
            {activeWaitingPauses.map((p) => {
              const timer = formatRemaining24h(p.createdAt);
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border space-y-2"
                  style={{
                    backgroundColor: activeTheme.surfaceContainer,
                    borderColor: timer.ready ? activeTheme.primary : activeTheme.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                      {p.item}
                    </span>
                    <span
                      className="text-[10px] font-mono tabular-nums shrink-0"
                      style={{ color: timer.ready ? activeTheme.primary : activeTheme.textSecondary }}
                    >
                      {timer.text}
                    </span>
                  </div>
                  {p.feeling && (
                    <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                      Вопрос: {p.feeling}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolvePause(p.id, 'skipped')}
                      className="py-1.5 rounded-lg border text-[11px] font-medium transition-colors"
                      style={{
                        borderColor: activeTheme.accent,
                        color: activeTheme.accent,
                      }}
                    >
                      Не понадобилось
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolvePause(p.id, 'bought')}
                      className="py-1.5 rounded-lg border text-[11px] transition-colors"
                      style={{
                        borderColor: activeTheme.borderColor,
                        color: activeTheme.textSecondary,
                      }}
                    >
                      Куплено осознанно
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Честная биометрия: ручной ввод пульса покоя вместо фейкового «Подключено» */}
      <div
        className="p-4 rounded-2xl border space-y-2.5"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconPulse className="w-4 h-4" style={{ color: activeTheme.secondary }} />
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: activeTheme.textSecondary }}
            >
              Биометрия (ручной ввод)
            </span>
          </div>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              borderColor: activeTheme.borderColor,
              color: activeTheme.textMuted,
            }}
          >
            PWA · без Health Connect
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="restingHrInput" className="text-xs" style={{ color: activeTheme.textSecondary }}>
            Пульс покоя (уд/мин)
          </label>
          <input
            id="restingHrInput"
            type="number"
            min="35"
            max="130"
            placeholder="—"
            value={dayRecord.restingHr ?? ''}
            onChange={(e) =>
              onUpdateDay(selectedDate, {
                restingHr: e.target.value ? Number(e.target.value) : null,
                isSaved: true,
              })
            }
            className="w-24 text-right font-mono tabular-nums text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          />
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textMuted }}>
          Браузерные PWA не имеют прямого доступа к Google Health Connect. Автоматическое чтение сна и пульса с Realme появится в нативной Android-обёртке (Capacitor).
        </p>
      </div>

      <ShoppingPauseModal
        activeTheme={activeTheme}
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        onAddPause={handleAddShoppingPause}
      />

      <WorkoutModal
        activeTheme={activeTheme}
        isOpen={isWorkoutOpen}
        onClose={() => setIsWorkoutOpen(false)}
        onComplete={handleWorkoutComplete}
      />
    </div>
  );
}
