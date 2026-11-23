import React, { useState, useMemo } from 'react';
import { RITUALS_CATALOG } from '../data/questionsData';
import {
  formatShortRuDate,
  getLocalDateKey,
  getMonthTitleRu,
} from '../services/storage';
import {
  computeFullAnalytics,
  generateDemoDataset21Days,
} from '../services/analytics';
import { RITUAL_ICONS } from './RitualIcons';

function formatSigned(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (val > 0) return `+${val}`;
  return String(val);
}

export function AnalyticsDashboard({
  activeTheme,
  allRecords,
  profile,
  customFactors = [],
  shoppingPauses = [],
  onToggleExcludeSick,
  onSelectDateToEdit,
}) {
  const fullCatalog = useMemo(
    () => [...RITUALS_CATALOG, ...customFactors],
    [customFactors]
  );
  const ritualTitles = useMemo(
    () => Object.fromEntries(fullCatalog.map((r) => [r.id, r.title])),
    [fullCatalog]
  );

  const realCount = Object.values(allRecords || {}).filter(
    (r) => r && (r.isSaved || (r.rituals && r.rituals.length > 0))
  ).length;

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedPointIdx, setSelectedPointIdx] = useState(null);

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  const demoRecords = useMemo(() => generateDemoDataset21Days(), []);
  const sourceRecords = isDemoMode ? demoRecords : allRecords;
  const excludeSick = profile?.excludeSickFromBaseline ?? true;

  const analytics = useMemo(
    () =>
      computeFullAnalytics(sourceRecords, fullCatalog, {
        excludeSick,
        trackCycle: Boolean(profile?.trackCycle),
        cycleLength: Number(profile?.cycleLength || 28),
        shoppingPauses: isDemoMode ? [] : shoppingPauses,
      }),
    [sourceRecords, fullCatalog, excludeSick, profile?.trackCycle, profile?.cycleLength, isDemoMode, shoppingPauses]
  );

  // Построение календарной сетки для выбранного месяца (Пн..Вс)
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const todayKey = getLocalDateKey();

    const byDate = new Map(analytics.allSeries.map((s) => [s.date, s]));
    const cells = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ empty: true, key: `empty_${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = getLocalDateKey(new Date(calYear, calMonth, day));
      const rec = byDate.get(dateKey) || null;
      cells.push({
        empty: false,
        day,
        dateKey,
        isToday: dateKey === todayKey,
        isFuture: dateKey > todayKey,
        record: rec,
      });
    }
    return cells;
  }, [calYear, calMonth, analytics.allSeries]);

  const shiftCalendarMonth = (delta) => {
    const dt = new Date(calYear, calMonth + delta, 1);
    setCalYear(dt.getFullYear());
    setCalMonth(dt.getMonth());
    setSelectedCalDay(null);
  };

  // Геометрия основного SVG-графика
  const chartW = 340;
  const chartH = 165;
  const padL = 26;
  const padR = 12;
  const padT = 14;
  const padB = 22;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const series = analytics.series;
  const xFor = (i) =>
    series.length <= 1 ? padL + plotW / 2 : padL + (i / (series.length - 1)) * plotW;
  const yFor = (val) => padT + ((100 - Math.max(0, Math.min(100, val))) / 100) * plotH;

  const linePath =
    series.length > 1
      ? series.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(pt.index).toFixed(1)}`).join(' ')
      : '';

  const maPath =
    series.length > 1
      ? analytics.movingAvg
          .map((val, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(val).toFixed(1)}`)
          .join(' ')
      : '';

  const reg = analytics.trendRegression;
  const regLine =
    reg && series.length >= 2
      ? {
          x1: xFor(0),
          y1: yFor(reg.predict(0)),
          x2: xFor(series.length - 1),
          y2: yFor(reg.predict(series.length - 1)),
        }
      : null;

  const minPositions = new Set(analytics.extrema.localMinima.map((m) => m.position));
  const maxPositions = new Set(analytics.extrema.localMaxima.map((m) => m.position));

  const activePoint =
    selectedPointIdx !== null && series[selectedPointIdx]
      ? series[selectedPointIdx]
      : series.length > 0
      ? series[series.length - 1]
      : null;

  // Геометрия графика Сон -> Завтра
  const sleepPairs = analytics.sleepPairs;
  const sleepReg = analytics.sleepRegression;
  const scW = 340;
  const scH = 140;
  const scPadL = 28;
  const scPadR = 14;
  const scPadT = 12;
  const scPadB = 24;
  const scPlotW = scW - scPadL - scPadR;
  const scPlotH = scH - scPadT - scPadB;
  const minSleep = 4.5;
  const maxSleep = 9.5;
  const sxFor = (h) => scPadL + ((Math.max(minSleep, Math.min(maxSleep, h)) - minSleep) / (maxSleep - minSleep)) * scPlotW;
  const syFor = (w) => scPadT + ((100 - Math.max(0, Math.min(100, w))) / 100) * scPlotH;

  const heatColorForIndex = (index) => {
    if (index === null || index === undefined) return 'transparent';
    if (index >= 78) return activeTheme.accent;
    if (index >= 62) return activeTheme.primary;
    if (index >= 45) return activeTheme.secondary;
    return activeTheme.danger;
  };

  const describeSleepImpact = () => {
    if (!sleepReg) return null;
    if (sleepReg.k >= 1) {
      return `В среднем каждый дополнительный час сна добавляет +${sleepReg.k} к состоянию на следующий день.`;
    }
    if (sleepReg.k <= -1) {
      return `В этих записях длинный сон чаще совпадал с накопившейся усталостью (${sleepReg.k} на следующий день).`;
    }
    return 'Заметной связи между количеством часов сна и следующим днём пока не видно.';
  };

  return (
    <div className="space-y-4">
      {/* Шапка и переключение реальные / демо-выборка */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-xs block" style={{ color: activeTheme.textSecondary }}>
            Личная картина
          </span>
          <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
            Ритмы и связи
          </h2>
        </div>

        <div
          className="flex p-0.5 rounded-xl border text-[11px] shrink-0"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(false);
              setSelectedPointIdx(null);
            }}
            className="px-2.5 py-1 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: !isDemoMode ? activeTheme.surfaceCard : 'transparent',
              color: !isDemoMode ? activeTheme.textPrimary : activeTheme.textSecondary,
            }}
          >
            Мои ({realCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(true);
              setSelectedPointIdx(null);
            }}
            className="px-2.5 py-1 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: isDemoMode ? activeTheme.primary : 'transparent',
              color: isDemoMode ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            Демо 21д
          </button>
        </div>
      </div>

      {/* Индикатор режима демо или набора данных */}
      {isDemoMode ? (
        <div
          className="px-3.5 py-2.5 rounded-xl border text-xs"
          style={{
            backgroundColor: activeTheme.surfaceElevated,
            borderColor: activeTheme.primary,
            color: activeTheme.textPrimary,
          }}
        >
          Пример на тестовых данных за 21 день. Ваши личные записи остаются нетронутыми.
        </div>
      ) : (
        realCount < 7 && (
          <div
            className="p-3.5 rounded-xl border text-xs space-y-2"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: activeTheme.textPrimary }}>
                Собираем вашу обычную норму
              </span>
              <span className="tabular-nums text-[11px]" style={{ color: activeTheme.primary }}>
                {realCount} из 7 дней
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: activeTheme.borderColor }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (realCount / 7) * 100)}%`,
                  backgroundColor: activeTheme.primary,
                }}
              />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textSecondary }}>
              Чтобы уверенно находить закономерности, нужно хотя бы 7 отмеченных дней.
              Нажмите <strong style={{ color: activeTheme.textPrimary }}>«Демо 21д»</strong> выше, чтобы посмотреть, как будут выглядеть ваши графики.
            </p>
          </div>
        )
      )}

      {/* БЛОК 0: Наблюдение дня (живые выводы словами) */}
      {analytics.insights && analytics.insights.length > 0 && (
        <div
          className="p-4 rounded-2xl border space-y-2.5"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Наблюдение дня
          </span>
          <div className="space-y-2">
            {analytics.insights.map((ins) => {
              const accentBar =
                ins.tone === 'positive'
                  ? activeTheme.accent
                  : ins.tone === 'caution'
                  ? activeTheme.danger
                  : activeTheme.primary;
              return (
                <div
                  key={ins.id}
                  className="p-3 rounded-xl border-l-2 border space-y-0.5"
                  style={{
                    backgroundColor: activeTheme.surfaceContainer,
                    borderColor: activeTheme.borderColor,
                    borderLeftColor: accentBar,
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                    {ins.title}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textSecondary }}>
                    {ins.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Фильтр исключения дней болезни */}
      {analytics.sickDaysCount > 0 && (
        <button
          type="button"
          onClick={onToggleExcludeSick}
          className="w-full px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span style={{ color: activeTheme.textSecondary }}>
            Не учитывать дни болезни в общей норме ({analytics.sickDaysCount} дн.)
          </span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: excludeSick ? activeTheme.accent : activeTheme.surfaceContainer,
              color: excludeSick ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            {excludeSick ? 'Включено' : 'Выключено'}
          </span>
        </button>
      )}

      {/* БЛОК 1: График динамики состояния */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
              Динамика состояния
            </span>
            <div className="text-xs mt-0.5" style={{ color: activeTheme.primary }}>
              {analytics.trendLabel}
            </div>
          </div>
          {reg && (
            <span
              className="text-[11px] tabular-nums px-2 py-0.5 rounded border shrink-0"
              style={{
                borderColor: activeTheme.borderColor,
                backgroundColor: activeTheme.surfaceContainer,
                color: reg.k >= 0 ? activeTheme.accent : activeTheme.danger,
              }}
            >
              {reg.k >= 0 ? `+${reg.k}` : reg.k} в день
            </span>
          )}
        </div>

        {series.length >= 2 ? (
          <>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
              {[0, 25, 50, 75, 100].map((val) => {
                const y = yFor(val);
                return (
                  <g key={val}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke={activeTheme.gridLine}
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 5}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="8.5"
                      fontFamily="Inter, sans-serif"
                      fill={activeTheme.textMuted}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Плавная линия ритма */}
              <path
                d={maPath}
                fill="none"
                stroke={activeTheme.secondary}
                strokeWidth="1.25"
                strokeOpacity="0.65"
                strokeDasharray="3 3"
              />

              {/* Общий тренд */}
              {regLine && (
                <line
                  x1={regLine.x1}
                  y1={regLine.y1}
                  x2={regLine.x2}
                  y2={regLine.y2}
                  stroke={activeTheme.primary}
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
              )}

              {/* Основная линия по дням */}
              <path
                d={linePath}
                fill="none"
                stroke={activeTheme.textPrimary}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Точки и пики/спады */}
              {series.map((pt, i) => {
                const cx = xFor(i);
                const cy = yFor(pt.index);
                const isMin = minPositions.has(i);
                const isMax = maxPositions.has(i);
                const isSelected = activePoint && activePoint.date === pt.date;

                return (
                  <g
                    key={pt.date}
                    onClick={() => setSelectedPointIdx(i)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={cx} cy={cy} r="9" fill="transparent" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 4.5 : isMin || isMax ? 3.5 : 2.3}
                      fill={
                        isMax
                          ? activeTheme.accent
                          : isMin
                          ? activeTheme.danger
                          : activeTheme.textPrimary
                      }
                      stroke={activeTheme.surfaceCard}
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {[0, Math.floor((series.length - 1) / 2), series.length - 1]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((idx) => (
                  <text
                    key={idx}
                    x={xFor(idx)}
                    y={chartH - 4}
                    textAnchor={idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle'}
                    fontSize="8.5"
                    fontFamily="Inter, sans-serif"
                    fill={activeTheme.textMuted}
                  >
                    {formatShortRuDate(series[idx].date)}
                  </text>
                ))}
            </svg>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: activeTheme.textSecondary }}>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: activeTheme.textPrimary }} />
                По дням
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 inline-block border-t border-dashed" style={{ borderColor: activeTheme.primary }} />
                Общий тренд
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeTheme.accent }} />
                Пики
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeTheme.danger }} />
                Спады
              </span>
            </div>

            {activePoint && (
              <div
                className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="min-w-0">
                  <div className="tabular-nums text-[11px] font-medium" style={{ color: activeTheme.textPrimary }}>
                    {formatShortRuDate(activePoint.date)} · Состояние {activePoint.index} · Сон{' '}
                    {Number(activePoint.sleepHours).toFixed(1)} ч
                  </div>
                  <div className="text-[11px] truncate" style={{ color: activeTheme.textSecondary }}>
                    {(activePoint.rituals || []).length > 0
                      ? activePoint.rituals.map((id) => ritualTitles[id] || id).join(', ')
                      : 'Без отмеченных факторов'}
                  </div>
                </div>
                {!isDemoMode && (
                  <button
                    type="button"
                    onClick={() => onSelectDateToEdit(activePoint.date)}
                    className="text-[11px] px-2 py-1 rounded border shrink-0"
                    style={{
                      borderColor: activeTheme.borderColor,
                      color: activeTheme.primary,
                    }}
                  >
                    Открыть
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div
            className="py-8 text-center text-xs rounded-xl border border-dashed"
            style={{
              borderColor: activeTheme.borderColor,
              color: activeTheme.textSecondary,
            }}
          >
            Сохраните минимум 2 дня наблюдений, чтобы появился график.
          </div>
        )}
      </div>

      {/* БЛОК 2: Основные ориентиры ритма (человеческим языком) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[11px] block" style={{ color: activeTheme.textSecondary }}>
            Среднее состояние
          </span>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-xl font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.mean ?? '—'}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>
              из 100
            </span>
          </div>
          <div className="text-[11px]" style={{ color: activeTheme.primary }}>
            {analytics.stabilityLabel}
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[11px] block" style={{ color: activeTheme.textSecondary }}>
            Подъёмы и спады
          </span>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-semibold" style={{ color: activeTheme.accent }}>
              +{analytics.signedDeviations.meanPositive}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>/</span>
            <span className="text-base font-semibold" style={{ color: activeTheme.danger }}>
              {analytics.signedDeviations.meanNegative}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
            в хорошие и трудные дни
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[11px] block" style={{ color: activeTheme.textSecondary }}>
            Рабочий коридор
          </span>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.extrema.maxOfLocalMinima ? analytics.extrema.maxOfLocalMinima.index : '—'}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>—</span>
            <span className="text-base font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.extrema.minOfLocalMaxima ? analytics.extrema.minOfLocalMaxima.index : '—'}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
            обычные границы ритма
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[11px] block" style={{ color: activeTheme.textSecondary }}>
            Разнообразие дней
          </span>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-xl font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.diversity.distinctRituals}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>
              из {analytics.diversity.catalogLength}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
            факторов уже отмечено
          </div>
        </div>
      </div>

      {/* БЛОК 3: Самые заметные перемены за сутки */}
      {(analytics.adjacent.maxJump || analytics.adjacent.maxDrop) && (
        <div
          className="p-4 rounded-2xl border space-y-2.5"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Самые заметные перемены за сутки
          </span>

          <div className="grid grid-cols-1 gap-2">
            {analytics.adjacent.maxJump && (
              <div
                className="p-3 rounded-xl border space-y-1"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: activeTheme.textPrimary }}>Лучшее восстановление</span>
                  <span className="tabular-nums font-semibold" style={{ color: activeTheme.accent }}>
                    +{analytics.adjacent.maxJump.delta}
                  </span>
                </div>
                <div className="text-[11px] tabular-nums" style={{ color: activeTheme.textSecondary }}>
                  {formatShortRuDate(analytics.adjacent.maxJump.fromDate)} ({analytics.adjacent.maxJump.fromIndex}) →{' '}
                  {formatShortRuDate(analytics.adjacent.maxJump.toDate)} ({analytics.adjacent.maxJump.toIndex})
                </div>
                {analytics.adjacent.maxJump.prevRituals.length > 0 && (
                  <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                    Накануне: {analytics.adjacent.maxJump.prevRituals.map((id) => ritualTitles[id] || id).join(', ')}
                  </div>
                )}
              </div>
            )}

            {analytics.adjacent.maxDrop && (
              <div
                className="p-3 rounded-xl border space-y-1"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: activeTheme.textPrimary }}>Самый сильный спад</span>
                  <span className="tabular-nums font-semibold" style={{ color: activeTheme.danger }}>
                    {analytics.adjacent.maxDrop.delta}
                  </span>
                </div>
                <div className="text-[11px] tabular-nums" style={{ color: activeTheme.textSecondary }}>
                  {formatShortRuDate(analytics.adjacent.maxDrop.fromDate)} ({analytics.adjacent.maxDrop.fromIndex}) →{' '}
                  {formatShortRuDate(analytics.adjacent.maxDrop.toDate)} ({analytics.adjacent.maxDrop.toIndex})
                </div>
                {analytics.adjacent.maxDrop.currSymptoms.length > 0 && (
                  <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                    Симптомы: {analytics.adjacent.maxDrop.currSymptoms.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* БЛОК 4: Как сон влияет на завтра */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Как сон влияет на завтрашний день
          </span>
          {!sleepReg && (
            <div className="text-xs mt-1" style={{ color: activeTheme.textMuted }}>
              Появится после 3 дней наблюдений подряд
            </div>
          )}
        </div>

        {sleepReg && sleepPairs.length >= 3 && (
          <>
            <svg viewBox={`0 0 ${scW} ${scH}`} className="w-full h-auto overflow-visible">
              {[25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line
                    x1={scPadL}
                    y1={syFor(v)}
                    x2={scW - scPadR}
                    y2={syFor(v)}
                    stroke={activeTheme.gridLine}
                    strokeWidth="1"
                  />
                  <text
                    x={scPadL - 5}
                    y={syFor(v) + 3}
                    textAnchor="end"
                    fontSize="8.5"
                    fontFamily="Inter, sans-serif"
                    fill={activeTheme.textMuted}
                  >
                    {v}
                  </text>
                </g>
              ))}

              {[5, 6, 7, 8, 9].map((h) => (
                <text
                  key={h}
                  x={sxFor(h)}
                  y={scH - 5}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="Inter, sans-serif"
                  fill={activeTheme.textMuted}
                >
                  {h} ч
                </text>
              ))}

              <line
                x1={sxFor(minSleep)}
                y1={syFor(sleepReg.predict(minSleep))}
                x2={sxFor(maxSleep)}
                y2={syFor(sleepReg.predict(maxSleep))}
                stroke={activeTheme.accent}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {sleepPairs.map((p, idx) => (
                <circle
                  key={idx}
                  cx={sxFor(p.x)}
                  cy={syFor(p.y)}
                  r="3.2"
                  fill={activeTheme.primary}
                  fillOpacity="0.85"
                />
              ))}
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: activeTheme.textSecondary }}>
              {describeSleepImpact()}
            </p>
          </>
        )}
      </div>

      {/* БЛОК 4.5: Что влияет на ваш сон (факторы -> сон следующей ночью) */}
      {analytics.factorImpacts.some(
        (f) => f.count >= 1 && (f.sleepHoursDelta !== null || f.sleepQualityDelta !== null)
      ) && (
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
                Что влияет на ваш сон
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textSecondary }}>
                Как меняется сон следующей ночью после события
              </p>
            </div>
            <div className="flex gap-3 text-[10px] shrink-0" style={{ color: activeTheme.textMuted }}>
              <span>Длительность</span>
              <span>Качество</span>
            </div>
          </div>

          <div className="space-y-2">
            {analytics.factorImpacts
              .filter(
                (f) => f.count >= 1 && (f.sleepHoursDelta !== null || f.sleepQualityDelta !== null)
              )
              .sort(
                (a, b) =>
                  Math.abs(b.sleepQualityDelta ?? 0) +
                  Math.abs(b.sleepHoursDelta ?? 0) -
                  (Math.abs(a.sleepQualityDelta ?? 0) + Math.abs(a.sleepHoursDelta ?? 0))
              )
              .slice(0, 6)
              .map((f) => {
                const IconComp = RITUAL_ICONS[f.iconKey] || RITUAL_ICONS.presence;
                const hColor =
                  f.sleepHoursDelta === null
                    ? activeTheme.textMuted
                    : f.sleepHoursDelta > 0
                    ? activeTheme.accent
                    : f.sleepHoursDelta < 0
                    ? activeTheme.danger
                    : activeTheme.textSecondary;
                const qColor =
                  f.sleepQualityDelta === null
                    ? activeTheme.textMuted
                    : f.sleepQualityDelta > 0
                    ? activeTheme.accent
                    : f.sleepQualityDelta < 0
                    ? activeTheme.danger
                    : activeTheme.textSecondary;

                return (
                  <div
                    key={`sleep_${f.id}`}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: activeTheme.surfaceContainer,
                      borderColor: activeTheme.borderColor,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp className="w-4 h-4 shrink-0" style={{ color: activeTheme.textSecondary }} />
                      <div className="text-xs font-medium truncate" style={{ color: activeTheme.textPrimary }}>
                        {f.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums text-xs shrink-0">
                      <span className="w-14 text-right" style={{ color: hColor }}>
                        {f.sleepHoursDelta !== null ? `${formatSigned(f.sleepHoursDelta)} ч` : '—'}
                      </span>
                      <span className="w-12 text-right font-semibold" style={{ color: qColor }}>
                        {formatSigned(f.sleepQualityDelta)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* БЛОК 4.7: Ритм цикла (если включён в профиле) */}
      {profile?.trackCycle && analytics.cycleStats && (
        <div
          className="p-4 rounded-2xl border space-y-2.5"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Ритм цикла
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                Первая половина (1–14 дн.)
              </div>
              <div className="text-lg font-semibold tabular-nums mt-0.5" style={{ color: activeTheme.textPrimary }}>
                {analytics.cycleStats.firstAvg ?? '—'}
              </div>
            </div>
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                Вторая половина (15+ дн.)
              </div>
              <div className="text-lg font-semibold tabular-nums mt-0.5" style={{ color: activeTheme.textPrimary }}>
                {analytics.cycleStats.secondAvg ?? '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* БЛОК 5: Что наполняет, а что забирает силы */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
              Что наполняет, а что забирает силы
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textSecondary }}>
              Разница состояния в дни с событием и без него
            </p>
          </div>
          <div className="flex gap-3 text-[10px] shrink-0" style={{ color: activeTheme.textMuted }}>
            <span>В тот день</span>
            <span>На завтра</span>
          </div>
        </div>

        <div className="space-y-2">
          {analytics.factorImpacts.map((f) => {
            const IconComp = RITUAL_ICONS[f.iconKey] || RITUAL_ICONS.presence;
            const d0Color =
              f.sameDayDelta === null
                ? activeTheme.textMuted
                : f.sameDayDelta > 0
                ? activeTheme.accent
                : f.sameDayDelta < 0
                ? activeTheme.danger
                : activeTheme.textSecondary;
            const d1Color =
              f.nextDayDelta === null
                ? activeTheme.textMuted
                : f.nextDayDelta > 0
                ? activeTheme.accent
                : f.nextDayDelta < 0
                ? activeTheme.danger
                : activeTheme.textSecondary;

            const subtitle =
              f.count === 0
                ? 'пока не отмечалось'
                : f.isReliable
                ? `${f.count} раз`
                : `${f.count} раз · пока мало записей`;

            return (
              <div
                key={f.id}
                className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconComp className="w-4 h-4 shrink-0" style={{ color: activeTheme.textSecondary }} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: activeTheme.textPrimary }}>
                      {f.title}
                    </div>
                    <div className="text-[11px] tabular-nums" style={{ color: activeTheme.textMuted }}>
                      {subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 tabular-nums text-xs shrink-0">
                  <span className="w-12 text-right" style={{ color: d0Color }}>
                    {formatSigned(f.sameDayDelta)}
                  </span>
                  <span className="w-12 text-right font-semibold" style={{ color: d1Color }}>
                    {formatSigned(f.nextDayDelta)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* БЛОК 6: Календарь месяца */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
            Календарь · {getMonthTitleRu(calYear, calMonth)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftCalendarMonth(-1)}
              className="w-6 h-6 rounded border text-[11px]"
              style={{ borderColor: activeTheme.borderColor, color: activeTheme.textSecondary }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => shiftCalendarMonth(1)}
              className="w-6 h-6 rounded border text-[11px]"
              style={{ borderColor: activeTheme.borderColor, color: activeTheme.textSecondary }}
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px]" style={{ color: activeTheme.textMuted }}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((cell) => {
            if (cell.empty) return <div key={cell.key} className="h-9" />;
            const hasRec = Boolean(cell.record);
            const bg = hasRec ? heatColorForIndex(cell.record.index) : 'transparent';
            const isSick = cell.record?.wellbeing === 'sick';

            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={cell.isFuture}
                onClick={() => setSelectedCalDay(cell)}
                className="h-9 rounded-lg border flex flex-col items-center justify-center relative transition-opacity"
                style={{
                  backgroundColor: hasRec ? bg : activeTheme.surfaceContainer,
                  borderColor: cell.isToday ? activeTheme.textPrimary : activeTheme.borderColor,
                  opacity: cell.isFuture ? 0.25 : hasRec ? 0.92 : 0.65,
                }}
              >
                <span
                  className="text-[10px] tabular-nums font-medium leading-none"
                  style={{
                    color: hasRec ? '#FFFFFF' : activeTheme.textSecondary,
                  }}
                >
                  {cell.day}
                </span>
                {hasRec && (
                  <span className="text-[8px] tabular-nums text-white/85 leading-none mt-0.5">
                    {cell.record.index}
                  </span>
                )}
                {isSick && (
                  <span
                    className="w-1.5 h-1.5 rounded-full absolute top-1 right-1"
                    style={{ backgroundColor: '#FFFFFF' }}
                    title="День восстановления"
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedCalDay && (
          <div
            className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs animate-fade-in"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
            }}
          >
            <div>
              <span className="font-medium" style={{ color: activeTheme.textPrimary }}>
                {formatShortRuDate(selectedCalDay.dateKey)}:
              </span>{' '}
              <span style={{ color: activeTheme.textSecondary }}>
                {selectedCalDay.record
                  ? `состояние ${selectedCalDay.record.index} · сон ${selectedCalDay.record.sleepHours} ч${
                      selectedCalDay.record.wellbeing === 'sick' ? ' · восстановление' : ''
                    }`
                  : 'нет записи'}
              </span>
            </div>
            {!isDemoMode && !selectedCalDay.isFuture && (
              <button
                type="button"
                onClick={() => onSelectDateToEdit(selectedCalDay.dateKey)}
                className="text-[11px] px-2 py-1 rounded border shrink-0"
                style={{ borderColor: activeTheme.borderColor, color: activeTheme.primary }}
              >
                {selectedCalDay.record ? 'Изменить' : 'Заполнить'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
