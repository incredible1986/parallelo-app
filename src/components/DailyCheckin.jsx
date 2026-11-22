import React, { useState, useMemo } from 'react';
import { MOOD_COLORS, SYMPTOMS_LIST } from '../data/brandingTokens';
import { WEEKLY_QUESTIONS } from '../data/questionsData';
import { formatFullRuDate, getLocalDateKey, parseDateKey } from '../services/storage';
import { computeDayIndex, computeHydrationTarget } from '../services/analytics';
import { IconDrop, IconPresence, IconShield, IconWind } from './RitualIcons';
import { WelcomeBanner } from './WelcomeBanner';
import { CocoonModal } from './CocoonModal';

export function DailyCheckin({
  activeTheme,
  selectedDate,
  onChangeDate,
  dayRecord,
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
  const activeQuestion = todayQuestions[questionIdx % Math.max(1, todayQuestions.length)] || WEEKLY_QUESTIONS[0];

  const [isCocoonOpen, setIsCocoonOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const liveIndex = computeDayIndex(dayRecord);
  const deltaFromMean = baselineMean !== null ? Math.round((liveIndex - baselineMean) * 10) / 10 : null;
  const hydration = computeHydrationTarget(profile?.weight, dayRecord);

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
      flashStatus('Режим восстановления активен. День исключён из базовой нормы.');
    } else if (mode === 'tired') {
      patch.colorId = 'stone';
      flashStatus('Отмечена усталость. Вечер без завышенных ожиданий.');
    } else {
      flashStatus('Режим дня: в ресурсе.');
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
    flashStatus(`Наблюдение за ${formatFullRuDate(selectedDate)} сохранено.`);
  };

  const displayQuestion =
    dayRecord.wellbeing === 'sick'
      ? 'Что прямо сейчас снизит нагрузку и поможет восстановлению?'
      : activeQuestion.question;

  const displayTags =
    dayRecord.wellbeing === 'sick'
      ? ['Тёплое питьё', 'Сон и тишина', 'Свежий воздух', 'Отказ от лишних дел']
      : activeQuestion.tags;

  const sliders = [
    {
      key: 'energy',
      label: 'Энергия / ресурс',
      code: 'E',
      value: dayRecord.energy,
      low: 'Истощение',
      high: 'Полный ресурс',
    },
    {
      key: 'calm',
      label: 'Внутренний покой',
      code: 'C',
      value: dayRecord.calm,
      low: 'Напряжение',
      high: 'Тишина',
    },
    {
      key: 'bodyComfort',
      label: 'Телесный комфорт',
      code: 'B',
      value: dayRecord.bodyComfort,
      low: 'Зажимы / тяжесть',
      high: 'Лёгкость в теле',
    },
  ];

  return (
    <div className="space-y-4">
      <WelcomeBanner activeTheme={activeTheme} />

      {/* 1. Навигация по дате (реальные календарные дни) */}
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
          className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-mono transition-colors hover:opacity-80"
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
          <div className="text-[10px] font-mono tabular-nums" style={{ color: activeTheme.textSecondary }}>
            {isToday ? 'Текущий день' : 'Архивная запись'} ·{' '}
            {dayRecord.isSaved ? 'зафиксировано' : 'черновик'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-mono transition-colors ${
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

      {/* 2. Живой индекс состояния W(t) + расчёт воды */}
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
              className="text-[10px] font-mono uppercase tracking-widest block"
              style={{ color: activeTheme.textSecondary }}
            >
              Композитный индекс дня W
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span
                className="text-4xl font-mono font-semibold tabular-nums leading-none"
                style={{ color: activeTheme.primary }}
              >
                {liveIndex}
              </span>
              <span className="text-xs font-mono" style={{ color: activeTheme.textMuted }}>
                / 100
              </span>
              {deltaFromMean !== null && (
                <span
                  className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded"
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
                  {deltaFromMean > 0 ? `+${deltaFromMean}` : deltaFromMean} к норме
                </span>
              )}
            </div>
            <div
              className="text-[10px] font-mono tabular-nums mt-2"
              style={{ color: activeTheme.textMuted }}
            >
              W = 10·(0.32·E + 0.28·C + 0.25·B + 0.15·2Q)
            </div>
          </div>

          {dayRecord.wellbeing === 'sick' && (
            <span
              className="text-[10px] font-mono px-2 py-1 rounded-lg border shrink-0"
              style={{
                borderColor: activeTheme.accent,
                color: activeTheme.accent,
                backgroundColor: activeTheme.surfaceContainer,
              }}
            >
              RECOVERY
            </span>
          )}
        </div>

        {/* Прозрачная формула воды, если указан вес */}
        {hydration && (
          <div
            className="mt-3 pt-3 border-t flex items-center justify-between text-[11px]"
            style={{ borderColor: activeTheme.borderColor }}
          >
            <div className="flex items-center gap-1.5" style={{ color: activeTheme.textSecondary }}>
              <IconDrop className="w-3.5 h-3.5" style={{ color: activeTheme.secondary }} />
              <span>Ориентир воды:</span>
              <span className="font-mono tabular-nums font-medium" style={{ color: activeTheme.textPrimary }}>
                {hydration.totalMl} мл
              </span>
            </div>
            <span className="text-[10px] font-mono tabular-nums" style={{ color: activeTheme.textMuted }}>
              {hydration.formulaText}
            </span>
          </div>
        )}
      </div>

      {/* 3. Числовые оси состояния (вход для корреляций и МНК) */}
      <div
        className="p-4 rounded-2xl border space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: activeTheme.textSecondary }}
          >
            Вектор состояния
          </span>
          <span className="text-[10px] font-mono" style={{ color: activeTheme.textMuted }}>
            шкала 1–10
          </span>
        </div>

        {sliders.map((s) => (
          <div key={s.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center border"
                  style={{
                    borderColor: activeTheme.borderColor,
                    backgroundColor: activeTheme.surfaceContainer,
                    color: activeTheme.textSecondary,
                  }}
                >
                  {s.code}
                </span>
                <span style={{ color: activeTheme.textPrimary }}>{s.label}</span>
              </div>
              <span
                className="font-mono tabular-nums font-semibold"
                style={{ color: activeTheme.primary }}
              >
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

        {/* Сон: длительность + субъективное качество Q */}
        <div
          className="pt-3.5 border-t space-y-3"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center border"
                style={{
                  borderColor: activeTheme.borderColor,
                  backgroundColor: activeTheme.surfaceContainer,
                  color: activeTheme.textSecondary,
                }}
              >
                S
              </span>
              <span style={{ color: activeTheme.textPrimary }}>Длительность сна</span>
            </div>
            <span
              className="font-mono tabular-nums font-semibold"
              style={{ color: activeTheme.accent }}
            >
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
            <span className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
              Глубина сна (Q)
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((q) => {
                const isSel = Number(dayRecord.sleepQuality) === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => patchDay({ sleepQuality: q }, true)}
                    className="w-7 h-7 rounded-lg border text-xs font-mono tabular-nums transition-colors"
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

      {/* 4. Статус тела и режим восстановления */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: activeTheme.textSecondary }}
          >
            Физиологический режим
          </span>
          <IconShield className="w-3.5 h-3.5" style={{ color: activeTheme.textMuted }} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'in_flow', label: 'В норме' },
            { id: 'tired', label: 'Усталость' },
            { id: 'sick', label: 'Болезнь' },
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
              Режим восстановления активен: день маркируется отдельно и может быть исключён из базовой
              нормы в аналитике, чтобы болезнь не искажала тренд.
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
      </div>

      {/* 5. Оттенок состояния + Вечерний микро-вопрос */}
      <div
        className="p-4 rounded-2xl border space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: activeTheme.textSecondary }}
            >
              Тон состояния
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
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: activeTheme.textSecondary }}
            >
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

      {/* 6. Маркер присутствия и практика «Сбросить кокон» */}
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
                Точка живого присутствия
              </div>
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                {dayRecord.feltAlive
                  ? 'Зафиксировано в дне'
                  : 'Отметить момент полной включённости'}
              </div>
            </div>
          </div>
          <span
            className="text-[10px] font-mono uppercase"
            style={{ color: dayRecord.feltAlive ? activeTheme.accent : activeTheme.textMuted }}
          >
            {dayRecord.feltAlive ? 'ДА' : 'НЕТ'}
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
          <span className="text-xs font-mono" style={{ color: activeTheme.textSecondary }}>
            →
          </span>
        </button>
      </div>

      {/* 7. Заметка и кнопка фиксации */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <label
          htmlFor="sensoryNote"
          className="block text-[10px] font-mono uppercase tracking-widest"
          style={{ color: activeTheme.textSecondary }}
        >
          Контекст и заметка (необязательно)
        </label>
        <textarea
          id="sensoryNote"
          rows={2}
          value={dayRecord.note || ''}
          onChange={(e) => patchDay({ note: e.target.value }, false)}
          placeholder="Ключевое событие дня, телесное наблюдение, причина спада или подъёма..."
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
