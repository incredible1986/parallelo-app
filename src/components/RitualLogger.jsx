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
  customFactors = [],
  onUpdateCustomFactors,
}) {
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [feedback, setFeedback] = useState(null);

  const activeRituals = dayRecord.rituals || [];

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
        ? `«${ritual.title}» убрано из дня.`
        : `«${ritual.title}» отмечено за этот день.`
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
    showNotice(`Записано: ${workoutEntry.type} (${workoutEntry.duration} мин, ${workoutEntry.enjoyment}/10).`);
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

  const handleAddCustomFactor = (e) => {
    e.preventDefault();
    const clean = customName.trim();
    if (!clean || !onUpdateCustomFactors) return;
    const newFactor = {
      id: `custom_${Date.now()}`,
      group: 'custom',
      title: clean,
      iconKey: 'presence',
      category: 'Личное',
      desc: 'Личный фактор — отслеживается в общей аналитике',
      waterBonusMl: 0,
      isCustom: true,
    };
    onUpdateCustomFactors([...customFactors, newFactor]);
    setCustomName('');
    setIsAddingCustom(false);
    showNotice(`Добавлен личный фактор «${clean}».`);
  };

  const handleDeleteCustomFactor = (e, id, title) => {
    e.stopPropagation();
    if (!onUpdateCustomFactors) return;
    onUpdateCustomFactors(customFactors.filter((f) => f.id !== id));
    if (activeRituals.includes(id)) {
      onUpdateDay(selectedDate, {
        rituals: activeRituals.filter((rId) => rId !== id),
      });
    }
    showNotice(`Фактор «${title}» удалён из списка.`);
  };

  const anchorRituals = RITUALS_CATALOG.filter((r) => r.group === 'anchors');
  const workSocialRituals = RITUALS_CATALOG.filter((r) => r.group === 'work_social');
  const bodySubstancesRituals = RITUALS_CATALOG.filter((r) => r.group === 'body_substances');

  const activeWaitingPauses = (shoppingPauses || []).filter((p) => p.status === 'waiting');
  const skippedCount = (shoppingPauses || []).filter((p) => p.status === 'skipped').length;

  const renderRitualButton = (ritual) => {
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
              {totalCount > 0 && (
                <span
                  className="text-[10px] tabular-nums px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: activeTheme.surfaceContainer,
                    color: activeTheme.textSecondary,
                  }}
                >
                  {totalCount} раз
                </span>
              )}
            </div>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: activeTheme.textSecondary }}>
              {ritual.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {ritual.isCustom && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => handleDeleteCustomFactor(e, ritual.id, ritual.title)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDeleteCustomFactor(e, ritual.id, ritual.title);
              }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs opacity-50 hover:opacity-100"
              style={{ color: activeTheme.textSecondary }}
              title="Удалить фактор"
            >
              ✕
            </span>
          )}
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
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs block" style={{ color: activeTheme.textSecondary }}>
            {formatFullRuDate(selectedDate)}
          </span>
          <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
            События и факторы дня
          </h2>
        </div>
        <span
          className="text-xs tabular-nums px-2 py-0.5 rounded-lg border"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
            color: activeTheme.primary,
          }}
        >
          {activeRituals.length} отмечено
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

      {/* Группа 1: Опоры и привычки */}
      <div className="space-y-2">
        <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
          Опоры и привычки
        </span>
        <div className="space-y-2">{anchorRituals.map(renderRitualButton)}</div>
      </div>

      {/* Группа 2: Работа и общение */}
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Работа и общение
          </span>
          <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textMuted }}>
            Помогает замечать усталость по дням недели и вовремя брать выходной.
          </p>
        </div>
        <div className="space-y-2">{workSocialRituals.map(renderRitualButton)}</div>
      </div>

      {/* Группа 3: Близость и вещества */}
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Близость и вещества
          </span>
          <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textMuted }}>
            Без оценок и стыда — эти факторы сильно влияют на сон и состояние на следующий день.
          </p>
        </div>
        <div className="space-y-2">{bodySubstancesRituals.map(renderRitualButton)}</div>
      </div>

      {/* Группа 3: Мои личные факторы */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
              Мои факторы
            </span>
            <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textMuted }}>
              Свои триггеры и привычки: кофе вечером, магний, долгие созвоны...
            </p>
          </div>
          {!isAddingCustom && (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="px-2.5 py-1 rounded-lg border text-xs font-medium shrink-0 transition-colors"
              style={{
                backgroundColor: activeTheme.surfaceCard,
                borderColor: activeTheme.borderColor,
                color: activeTheme.primary,
              }}
            >
              + Добавить
            </button>
          )}
        </div>

        {isAddingCustom && (
          <form
            onSubmit={handleAddCustomFactor}
            className="p-3 rounded-2xl border space-y-2.5 animate-fade-in"
            style={{
              backgroundColor: activeTheme.surfaceCard,
              borderColor: activeTheme.primary,
            }}
          >
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Например: Кофе после 15:00"
              maxLength={40}
              autoFocus
              className="w-full text-xs p-2.5 rounded-xl border focus:outline-none"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustom(false);
                  setCustomName('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: activeTheme.textSecondary }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!customName.trim()}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                  !customName.trim() ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                style={{
                  backgroundColor: activeTheme.primary,
                  color: activeTheme.primaryText,
                }}
              >
                Создать
              </button>
            </div>
          </form>
        )}

        {customFactors.length > 0 && (
          <div className="space-y-2">{customFactors.map(renderRitualButton)}</div>
        )}
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
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
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
              <div className="text-right tabular-nums text-[11px]">
                <div style={{ color: activeTheme.primary }}>{w.duration} мин</div>
                <div style={{ color: activeTheme.textSecondary }}>{w.enjoyment}/10</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Очередь 24-часовых пауз перед покупкой */}
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
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Отложенные покупки (24 ч)
            </span>
          </div>
          {skippedCount > 0 && (
            <span className="text-[11px] tabular-nums" style={{ color: activeTheme.accent }}>
              не куплено: {skippedCount}
            </span>
          )}
        </div>

        {activeWaitingPauses.length === 0 ? (
          <p className="text-xs" style={{ color: activeTheme.textSecondary }}>
            Пока пусто. Нажмите «Пауза перед покупкой» выше, если сомневаетесь перед оплатой.
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
                      className="text-[11px] tabular-nums shrink-0"
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

      {/* Пульс покоя */}
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
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Пульс покоя
            </span>
          </div>
          <span
            className="text-[11px] px-2 py-0.5 rounded border"
            style={{
              borderColor: activeTheme.borderColor,
              color: activeTheme.textMuted,
            }}
          >
            Вручную
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="restingHrInput" className="text-xs" style={{ color: activeTheme.textSecondary }}>
            Ударов в минуту (с часов)
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
            className="w-24 text-right tabular-nums text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          />
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textMuted }}>
          Пока приложение работает в браузере, данные с часов вводятся вручную. Прямое чтение из Google Health Connect появится в версии для Android.
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
