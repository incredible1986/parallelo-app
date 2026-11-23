import React, { useState, useMemo } from 'react';
import { MOOD_COLORS, SYMPTOMS_LIST } from '../data/brandingTokens';
import { WEEKLY_QUESTIONS } from '../data/questionsData';
import { formatFullRuDate, getLocalDateKey, parseDateKey } from '../services/storage';
import { computeCycleInfo, computeDayIndex, computeHydrationTarget } from '../services/analytics';
import { IconDrop, IconPresence, IconShield, IconWind } from './RitualIcons';
import { WelcomeBanner } from './WelcomeBanner';
import { CocoonModal } from './CocoonModal';

export function DailyCheckin({
  activeTheme,
  selectedDate,
  onChangeDate,
  dayRecord,
  allRecords,
  onUpdateDay,
  profile,
  baselineMean,
}) {
  const todayKey = getLocalDateKey();
  const isToday = selectedDate === todayKey;

  const dayOfWeek = parseDateKey(selectedDate).getDay();
  const todayQuestions = useMemo(
    () => WEEKLY_QUESTIONS.filter((q) => q.dayIndex === dayOfWeek),
    [dayOfWeek]
  );
  const [questionIdx, setQuestionIdx] = useState(0);
  const activeQuestion =
    todayQuestions[questionIdx % Math.max(1, todayQuestions.length)] || WEEKLY_QUESTIONS[0];

  const [isCocoonOpen, setIsCocoonOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const liveIndex = computeDayIndex(dayRecord);
  const deltaFromMean =
    baselineMean !== null ? Math.round((liveIndex - baselineMean) * 10) / 10 : null;
  const hydration = computeHydrationTarget(profile?.weight, dayRecord);
  const cycleInfo = profile?.trackCycle
    ? computeCycleInfo(selectedDate, allRecords, Number(profile.cycleLength || 28))
    : null;

  const selectedColorObj =
    MOOD_COLORS.find((c) => c.id === dayRecord.colorId) || MOOD_COLORS[2];

  const flashStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3200);
  };

  const shiftDate = (deltaDays) => {
    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    const nextKey = getLocalDateKey(d);
    if (nextKey > todayKey) return;
    onChangeDate(nextKey);
  };

  const patchDay = (patch, markSaved = true) => {
    onUpdateDay(selectedDate, { ...patch, ...(markSaved ? { isSaved: true } : {}) });
  };

  const handleWellbeingChange = (mode) => {
    const patch = { wellbeing: mode };
    if (mode === 'sick') {
      patch.colorId = 'stone';
      flashStatus('Режим восстановления включён. Этот день не испортит вашу обычную норму.');
    } else if (mode === 'tired') {
      patch.colorId = 'stone';
      flashStatus('Усталость отмечена. Вечер без завышенных ожиданий.');
    } else {
      flashStatus('Состояние отмечено как обычное.');
    }
    patchDay(patch, true);
  };

  const handleToggleSymptom = (label) => {
    const current = dayRecord.symptoms || [];
    const next = current.includes(label)
      ? current.filter((s) => s !== label)
      : [...current, label];
    patchDay({ symptoms: next }, true);
  };

  const handleSaveExplicit = () => {
    patchDay({ isSaved: true }, true);
    flashStatus(`Сохранено за ${formatFullRuDate(selectedDate)}.`);
  };

  const displayQuestion =
    dayRecord.wellbeing === 'sick'
      ? 'Что прямо сейчас снизит нагрузку и поможет телу восстановиться?'
      : activeQuestion.question;

  const displayTags =
    dayRecord.wellbeing === 'sick'
      ? ['Тёплое питьё', 'Сон и тишина', 'Свежий воздух', 'Отказ от лишних дел']
      : activeQuestion.tags;

  const sliders = [
    {
      key: 'energy',
      label: 'Энергия',
      value: dayRecord.energy,
      low: 'Нет сил',
      high: 'Много сил',
    },
    {
      key: 'calm',
      label: 'Спокойствие',
      value: dayRecord.calm,
      low: 'Напряжение',
      high: 'Тишина внутри',
    },
    {
      key: 'bodyComfort',
      label: 'Комфорт в теле',
      value: dayRecord.bodyComfort,
      low: 'Тяжесть / зажимы',
      high: 'Лёгкость',
    },
  ];

  return (
    <div className="space-y-4">
      <WelcomeBanner activeTheme={activeTheme} />

      {/* 1. Навигация по дате */}
      <div
        className="px-3.5 py-2.5 rounded-2xl border flex items-center justify-between"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-colors hover:opacity-80"
          style={{
            borderColor: activeTheme.borderColor,
            backgroundColor: activeTheme.surfaceContainer,
            color: activeTheme.textPrimary,
          }}
          aria-label="Предыдущий день"
        >
          ←
        </button>

        <div className="text-center">
          <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
            {formatFullRuDate(selectedDate)}
          </div>
          <div className="text-[11px] tabular-nums" style={{ color: activeTheme.textSecondary }}>
            {isToday ? 'Сегодня' : 'Прошлый день'} ·{' '}
            {dayRecord.isSaved ? 'сохранено' : 'черновик'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-colors ${
            isToday ? 'opacity-25 cursor-not-allowed' : 'hover:opacity-80'
          }`}
          style={{
            borderColor: activeTheme.borderColor,
            backgroundColor: activeTheme.surfaceContainer,
            color: activeTheme.textPrimary,
          }}
          aria-label="Следующий день"
        >
          →
        </button>
      </div>

      {/* 2. Общее состояние дня + вода */}
      <div
        className="p-4 rounded-2xl border"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className="text-xs font-medium block"
              style={{ color: activeTheme.textSecondary }}
            >
              Общее состояние
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span
                className="text-4xl font-semibold tabular-nums leading-none"
                style={{ color: activeTheme.primary }}
              >
                {liveIndex}
              </span>
              <span className="text-xs" style={{ color: activeTheme.textMuted }}>
                из 100
              </span>
              {deltaFromMean !== null && (
                <span
                  className="text-xs tabular-nums px-2 py-0.5 rounded-lg"
                  style={{
                    backgroundColor: activeTheme.surfaceContainer,
                    color:
                      deltaFromMean > 0
                        ? activeTheme.accent
                        : deltaFromMean < 0
                        ? activeTheme.danger
                        : activeTheme.textSecondary,
                  }}
                >
                  {deltaFromMean > 0
                    ? `+${deltaFromMean} к вашей норме`
                    : deltaFromMean < 0
                    ? `${deltaFromMean} от вашей нормы`
                    : 'на уровне нормы'}
                </span>
              )}
            </div>
          </div>

          {dayRecord.wellbeing === 'sick' && (
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border shrink-0"
              style={{
                borderColor: activeTheme.accent,
                color: activeTheme.accent,
                backgroundColor: activeTheme.surfaceContainer,
              }}
            >
              Восстановление
            </span>
          )}
        </div>

        {hydration && (
          <div
            className="mt-3 pt-3 border-t flex items-center justify-between gap-2 text-[11px]"
            style={{ borderColor: activeTheme.borderColor }}
          >
            <div className="flex items-center gap-1.5" style={{ color: activeTheme.textSecondary }}>
              <IconDrop className="w-3.5 h-3.5 shrink-0" style={{ color: activeTheme.secondary }} />
              <span>Вода на сегодня:</span>
              <span className="tabular-nums font-medium" style={{ color: activeTheme.textPrimary }}>
                {hydration.totalLiters} л
              </span>
            </div>
            <span className="text-[11px] text-right" style={{ color: activeTheme.textMuted }}>
              {hydration.noteText}
            </span>
          </div>
        )}
      </div>

      {/* 3. Оценка самочувствия и сна */}
      <div
        className="p-4 rounded-2xl border space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
            Как вы сегодня
          </span>
          <span className="text-[11px]" style={{ color: activeTheme.textMuted }}>
            от 1 до 10
          </span>
        </div>

        {sliders.map((s) => (
          <div key={s.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: activeTheme.textPrimary }}>{s.label}</span>
              <span className="tabular-nums font-semibold" style={{ color: activeTheme.primary }}>
                {s.value}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={s.value}
              onChange={(e) => patchDay({ [s.key]: Number(e.target.value) }, true)}
              className="w-full parallelo-range"
              style={{
                background: activeTheme.borderColor,
                '--range-accent': activeTheme.primary,
                '--range-surface': activeTheme.surfaceCard,
              }}
            />

            <div className="flex justify-between text-[10px]" style={{ color: activeTheme.textMuted }}>
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </div>
        ))}

        {/* Сон */}
        <div
          className="pt-3.5 border-t space-y-3"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: activeTheme.textPrimary }}>Сколько спали</span>
            <span className="tabular-nums font-semibold" style={{ color: activeTheme.accent }}>
              {Number(dayRecord.sleepHours).toFixed(1)} ч
            </span>
          </div>

          <input
            type="range"
            min="3"
            max="12"
            step="0.5"
            value={dayRecord.sleepHours}
            onChange={(e) => patchDay({ sleepHours: Number(e.target.value) }, true)}
            className="w-full parallelo-range"
            style={{
              background: activeTheme.borderColor,
              '--range-accent': activeTheme.accent,
              '--range-surface': activeTheme.surfaceCard,
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: activeTheme.textSecondary }}>
              Качество сна
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((q) => {
                const isSel = Number(dayRecord.sleepQuality) === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => patchDay({ sleepQuality: q }, true)}
                    className="w-7 h-7 rounded-lg border text-xs tabular-nums transition-colors"
                    style={{
                      backgroundColor: isSel ? activeTheme.accent : activeTheme.surfaceContainer,
                      borderColor: isSel ? activeTheme.accent : activeTheme.borderColor,
                      color: isSel ? activeTheme.primaryText : activeTheme.textPrimary,
                    }}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Самочувствие тела и симптомы */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
            Самочувствие тела
          </span>
          <IconShield className="w-3.5 h-3.5" style={{ color: activeTheme.textMuted }} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'in_flow', label: 'В норме' },
            { id: 'tired', label: 'Усталость' },
            { id: 'sick', label: 'Приболела' },
          ].map((item) => {
            const isSel = dayRecord.wellbeing === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleWellbeingChange(item.id)}
                className="py-2 px-2 rounded-xl border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isSel ? activeTheme.surfaceElevated : 'transparent',
                  borderColor: isSel
                    ? item.id === 'sick'
                      ? activeTheme.danger
                      : activeTheme.primary
                    : activeTheme.borderColor,
                  color: isSel ? activeTheme.textPrimary : activeTheme.textSecondary,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {dayRecord.wellbeing === 'sick' && (
          <div
            className="pt-3 border-t space-y-2.5 animate-fade-in"
            style={{ borderColor: activeTheme.borderColor }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textSecondary }}>
              Этот день не будет портить вашу обычную статистику — просто отметьте симптомы, если хочется.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS_LIST.map((sym) => {
                const isChecked = (dayRecord.symptoms || []).includes(sym.label);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleToggleSymptom(sym.label)}
                    className="px-2.5 py-1 rounded-lg text-[11px] border transition-colors"
                    style={{
                      backgroundColor: isChecked ? activeTheme.surfaceElevated : 'transparent',
                      borderColor: isChecked ? activeTheme.danger : activeTheme.borderColor,
                      color: isChecked ? activeTheme.textPrimary : activeTheme.textSecondary,
                    }}
                  >
                    {sym.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {profile?.trackCycle && (
          <div
            className="pt-3 border-t flex items-center justify-between gap-3"
            style={{ borderColor: activeTheme.borderColor }}
          >
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                {cycleInfo ? `День цикла: ${cycleInfo.cycleDay}` : 'Учёт цикла'}
              </div>
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                {cycleInfo ? cycleInfo.phaseLabel : 'Отметьте 1-й день цикла, чтобы считать фазу'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => patchDay({ isCycleStart: !dayRecord.isCycleStart }, true)}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-medium shrink-0 transition-colors"
              style={{
                backgroundColor: dayRecord.isCycleStart
                  ? activeTheme.primary
                  : activeTheme.surfaceContainer,
                borderColor: dayRecord.isCycleStart ? activeTheme.primary : activeTheme.borderColor,
                color: dayRecord.isCycleStart ? activeTheme.primaryText : activeTheme.textSecondary,
              }}
            >
              {dayRecord.isCycleStart ? '1-й день ✓' : '1-й день цикла'}
            </button>
          </div>
        )}
      </div>

      {/* 5. Настроение и вечерний вопрос */}
      <div
        className="p-4 rounded-2xl border space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Оттенок дня
            </span>
            <span className="text-xs font-medium" style={{ color: selectedColorObj.hex }}>
              {selectedColorObj.name}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {MOOD_COLORS.map((c) => {
              const isChosen = selectedColorObj.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patchDay({ colorId: c.id }, true)}
                  className="h-9 rounded-xl border flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: isChosen ? activeTheme.textPrimary : 'transparent',
                    opacity: isChosen ? 1 : 0.65,
                  }}
                  title={`${c.name} — ${c.desc}`}
                  aria-label={c.name}
                >
                  {isChosen && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t space-y-3" style={{ borderColor: activeTheme.borderColor }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Вопрос вечера · {activeQuestion.day}
            </span>
            {todayQuestions.length > 1 && dayRecord.wellbeing !== 'sick' && (
              <button
                type="button"
                onClick={() => setQuestionIdx((prev) => prev + 1)}
                className="text-[11px] underline decoration-dotted opacity-70 hover:opacity-100"
                style={{ color: activeTheme.textSecondary }}
              >
                Другой
              </button>
            )}
          </div>

          <h3
            className="text-base font-serif font-normal leading-snug"
            style={{ color: activeTheme.textPrimary }}
          >
            {displayQuestion}
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => {
              const isSel = dayRecord.questionTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    patchDay({ questionTag: tag }, true);
                    flashStatus('Тихо. Этого достаточно.');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                  style={{
                    backgroundColor: isSel ? activeTheme.primary : activeTheme.surfaceContainer,
                    borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                    color: isSel ? activeTheme.primaryText : activeTheme.textPrimary,
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[11px]" style={{ color: activeTheme.textMuted }}>
            <button
              type="button"
              onClick={() => {
                patchDay({ questionTag: 'Не помню' }, true);
                flashStatus('Тихо. Этого достаточно.');
              }}
              className="hover:underline"
            >
              Не помню
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                patchDay({ questionTag: 'Пропустить' }, true);
                flashStatus('Пропущено без последствий.');
              }}
              className="hover:underline"
            >
              Пропустить
            </button>
          </div>
        </div>
      </div>

      {/* 6. Момент присутствия и «Сбросить кокон» */}
      <div className="grid grid-cols-1 gap-2.5">
        <button
          type="button"
          onClick={() => patchDay({ feltAlive: !dayRecord.feltAlive }, true)}
          className="p-3.5 rounded-2xl border flex items-center justify-between text-left transition-colors"
          style={{
            backgroundColor: dayRecord.feltAlive ? activeTheme.surfaceElevated : activeTheme.surfaceCard,
            borderColor: dayRecord.feltAlive ? activeTheme.accent : activeTheme.borderColor,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: dayRecord.feltAlive ? activeTheme.accent : activeTheme.surfaceContainer,
                borderColor: dayRecord.feltAlive ? activeTheme.accent : activeTheme.borderColor,
                color: dayRecord.feltAlive ? activeTheme.primaryText : activeTheme.textSecondary,
              }}
            >
              <IconPresence className="w-4 h-4" isPulsing={dayRecord.feltAlive} />
            </span>
            <div>
              <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                Момент, когда чувствовалась жизнь
              </div>
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                {dayRecord.feltAlive ? 'Было сегодня' : 'Отметить, если такой момент был'}
              </div>
            </div>
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: dayRecord.feltAlive ? activeTheme.accent : activeTheme.textMuted }}
          >
            {dayRecord.feltAlive ? 'Отмечено' : 'Отметить'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsCocoonOpen(true)}
          className="p-3.5 rounded-2xl border flex items-center justify-between text-left transition-colors"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textSecondary,
              }}
            >
              <IconWind className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                Сбросить кокон
              </div>
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                Выписать и сразу удалить лишнее напряжение
              </div>
            </div>
          </div>
          <span className="text-xs" style={{ color: activeTheme.textSecondary }}>
            →
          </span>
        </button>
      </div>

      {/* 7. Заметка */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <label
          htmlFor="sensoryNote"
          className="block text-xs font-medium"
          style={{ color: activeTheme.textSecondary }}
        >
          Заметка о дне (по желанию)
        </label>
        <textarea
          id="sensoryNote"
          rows={2}
          value={dayRecord.note || ''}
          onChange={(e) => patchDay({ note: e.target.value }, false)}
          placeholder="Что запомнилось, от чего стало легче или тяжелее..."
          className="w-full text-xs p-2.5 rounded-xl border focus:outline-none resize-none"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
            color: activeTheme.textPrimary,
          }}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] min-h-[16px]" style={{ color: activeTheme.accent }}>
            {statusMessage}
          </div>
          <button
            type="button"
            onClick={handleSaveExplicit}
            className="px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: activeTheme.primary,
              color: activeTheme.primaryText,
            }}
          >
            Сохранить день
          </button>
        </div>
      </div>

      <CocoonModal
        activeTheme={activeTheme}
        isOpen={isCocoonOpen}
        onClose={() => setIsCocoonOpen(false)}
      />
    </div>
  );
}
