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

const RITUAL_TITLES = Object.fromEntries(RITUALS_CATALOG.map((r) => [r.id, r.title]));

function formatSigned(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (val > 0) return `+${val}`;
  return String(val);
}

export function AnalyticsDashboard({
  activeTheme,
  allRecords,
  profile,
  onToggleExcludeSick,
  onSelectDateToEdit,
}) {
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
    () => computeFullAnalytics(sourceRecords, RITUALS_CATALOG, { excludeSick }),
    [sourceRecords, excludeSick]
  );

  // Построение календарной сетки для выбранного месяца (Пн..Вс)
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // 0 = Пн, 6 = Вс
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

  // Геометрия основного SVG-графика (Динамика W(t) + МНК + Локальные экстремумы)
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

  // Геометрия Scatter-графика Сон(t) -> W(t+1)
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

  return (
    <div className="space-y-4">
      {/* Шапка и переключение реальные / демо-выборка */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: activeTheme.textSecondary }}
          >
            Математическая модель
          </span>
          <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
            Корреляции и динамика
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

      {/* Индикатор режима демо или калибровки */}
      {isDemoMode ? (
        <div
          className="px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2"
          style={{
            backgroundColor: activeTheme.surfaceElevated,
            borderColor: activeTheme.primary,
            color: activeTheme.textPrimary,
          }}
        >
          <span>
            Предпросмотр расчёта всех формул на тестовой выборке из 21 дня. Ваши личные записи не затронуты.
          </span>
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
                Калибровка базовой нормы
              </span>
              <span className="font-mono tabular-nums text-[11px]" style={{ color: activeTheme.primary }}>
                {realCount} / 7 дней
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
              Для расчёта линейной регрессии, σ и устойчивых корреляций нужно от 7 наблюдений.
              Нажмите <strong style={{ color: activeTheme.textPrimary }}>«Демо 21д»</strong> выше, чтобы увидеть работу всех формул прямо сейчас.
            </p>
          </div>
        )
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
            Исключить дни болезни из базовой нормы ({analytics.sickDaysCount} дн.)
          </span>
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded"
            style={{
              backgroundColor: excludeSick ? activeTheme.accent : activeTheme.surfaceContainer,
              color: excludeSick ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            {excludeSick ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </button>
      )}

      {/* БЛОК 1: График динамики W(t) + МНК регрессия + Локальные экстремумы */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest block"
              style={{ color: activeTheme.textSecondary }}
            >
              Динамика индекса W(t) · МНК тренд
            </span>
            {reg ? (
              <div className="text-xs font-mono tabular-nums mt-1" style={{ color: activeTheme.primary }}>
                y = {reg.a} {reg.k >= 0 ? '+' : '−'} {Math.abs(reg.k)}·t · R² = {reg.r2}
              </div>
            ) : (
              <div className="text-xs mt-1" style={{ color: activeTheme.textSecondary }}>
                Нужно минимум 2 дня для построения линии тренда
              </div>
            )}
          </div>
          {reg && (
            <span
              className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded border shrink-0"
              style={{
                borderColor: activeTheme.borderColor,
                backgroundColor: activeTheme.surfaceContainer,
                color: reg.k >= 0 ? activeTheme.accent : activeTheme.danger,
              }}
            >
              {reg.k >= 0 ? `+${reg.k}` : reg.k} / день
            </span>
          )}
        </div>

        {series.length >= 2 ? (
          <>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
              {/* Горизонтальная сетка */}
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
                      fontFamily="JetBrains Mono, monospace"
                      fill={activeTheme.textMuted}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* 7-дневная скользящая средняя */}
              <path
                d={maPath}
                fill="none"
                stroke={activeTheme.secondary}
                strokeWidth="1.25"
                strokeOpacity="0.65"
                strokeDasharray="3 3"
              />

              {/* Линия линейной регрессии МНК y = a + k·t */}
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

              {/* Основная кривая индекса W(t) */}
              <path
                d={linePath}
                fill="none"
                stroke={activeTheme.textPrimary}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Точки и маркеры локальных максимумов/минимумов */}
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

              {/* Подписи дат по краям и середине */}
              {[0, Math.floor((series.length - 1) / 2), series.length - 1]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((idx) => (
                  <text
                    key={idx}
                    x={xFor(idx)}
                    y={chartH - 4}
                    textAnchor={idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle'}
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fill={activeTheme.textMuted}
                  >
                    {formatShortRuDate(series[idx].date)}
                  </text>
                ))}
            </svg>

            {/* Легенда графика */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: activeTheme.textSecondary }}>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: activeTheme.textPrimary }} />
                W(t)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 inline-block border-t border-dashed" style={{ borderColor: activeTheme.primary }} />
                МНК тренд
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeTheme.accent }} />
                Лок. max
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: activeTheme.danger }} />
                Лок. min
              </span>
            </div>

            {/* Детали выбранной точки */}
            {activePoint && (
              <div
                className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="min-w-0">
                  <div className="font-mono tabular-nums text-[11px]" style={{ color: activeTheme.textPrimary }}>
                    {formatShortRuDate(activePoint.date)} · W={activePoint.index} · Сон {Number(activePoint.sleepHours).toFixed(1)}ч
                  </div>
                  <div className="text-[11px] truncate" style={{ color: activeTheme.textSecondary }}>
                    {(activePoint.rituals || []).length > 0
                      ? activePoint.rituals.map((id) => RITUAL_TITLES[id] || id).join(', ')
                      : 'Без отмеченных факторов'}
                  </div>
                </div>
                {!isDemoMode && (
                  <button
                    type="button"
                    onClick={() => onSelectDateToEdit(activePoint.date)}
                    className="text-[10px] font-mono px-2 py-1 rounded border shrink-0"
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
            Сохраните минимум 2 дня наблюдений для построения графика и МНК-тренда.
          </div>
        )}
      </div>

      {/* БЛОК 2: Математический профиль (СКО σ, Средние отклонения Δ+/Δ-, Экстремумы, Разнообразие) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Средняя норма и СКО (Standard Deviation) */}
        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: activeTheme.textSecondary }}>
            Норма μ / СКО σ
          </span>
          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.mean ?? '—'}
            </span>
            <span className="text-xs" style={{ color: activeTheme.primary }}>
              ± {analytics.stdDev ?? '—'}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: activeTheme.textSecondary }}>
            {analytics.stabilityLabel}
            {analytics.cv !== null ? ` · CV ${analytics.cv}%` : ''}
          </div>
        </div>

        {/* 2. Средние положительных и отрицательных отклонений от нормы */}
        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: activeTheme.textSecondary }}>
            Подъём / Просадка
          </span>
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-base font-semibold" style={{ color: activeTheme.accent }}>
              +{analytics.signedDeviations.meanPositive}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>/</span>
            <span className="text-base font-semibold" style={{ color: activeTheme.danger }}>
              {analytics.signedDeviations.meanNegative}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: activeTheme.textSecondary }}>
            Среднее Δ+ ({analytics.signedDeviations.posCount}д) и Δ− ({analytics.signedDeviations.negCount}д)
          </div>
        </div>

        {/* 3. Локальные экстремумы: max(localMin) и min(localMax) */}
        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: activeTheme.textSecondary }}>
            Коридор разворота
          </span>
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-base font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.extrema.maxOfLocalMinima ? analytics.extrema.maxOfLocalMinima.index : '—'}
            </span>
            <span className="text-[10px]" style={{ color: activeTheme.textMuted }}>↔</span>
            <span className="text-base font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.extrema.minOfLocalMaxima ? analytics.extrema.minOfLocalMaxima.index : '—'}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: activeTheme.textSecondary }}>
            max(лок.min) · min(лок.max)
          </div>
        </div>

        {/* 4. Разнообразие уникальных факторов (Distinct Elements) */}
        <div
          className="p-3.5 rounded-2xl border space-y-1"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: activeTheme.textSecondary }}>
            Разнообразие опор
          </span>
          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-semibold" style={{ color: activeTheme.textPrimary }}>
              {analytics.diversity.distinctRituals}
            </span>
            <span className="text-xs" style={{ color: activeTheme.textMuted }}>
              / {analytics.diversity.catalogLength}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: activeTheme.textSecondary }}>
            Уникальных факторов · {analytics.diversity.distinctColors} оттенка
          </div>
        </div>
      </div>

      {/* БЛОК 3: Максимальный скачок и резкий спад между соседними днями */}
      {(analytics.adjacent.maxJump || analytics.adjacent.maxDrop) && (
        <div
          className="p-4 rounded-2xl border space-y-2.5"
          style={{
            backgroundColor: activeTheme.surfaceCard,
            borderColor: activeTheme.borderColor,
          }}
        >
          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: activeTheme.textSecondary }}
          >
            Соседние переходы · max / min (Wₜ − Wₜ₋₁)
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
                  <span style={{ color: activeTheme.textPrimary }}>Максимальный скачок вверх</span>
                  <span className="font-mono tabular-nums font-semibold" style={{ color: activeTheme.accent }}>
                    +{analytics.adjacent.maxJump.delta} п.
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums" style={{ color: activeTheme.textSecondary }}>
                  {formatShortRuDate(analytics.adjacent.maxJump.fromDate)} ({analytics.adjacent.maxJump.fromIndex}) →{' '}
                  {formatShortRuDate(analytics.adjacent.maxJump.toDate)} ({analytics.adjacent.maxJump.toIndex})
                </div>
                {analytics.adjacent.maxJump.prevRituals.length > 0 && (
                  <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                    Накануне: {analytics.adjacent.maxJump.prevRituals.map((id) => RITUAL_TITLES[id] || id).join(', ')}
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
                  <span style={{ color: activeTheme.textPrimary }}>Наибольший спад за сутки</span>
                  <span className="font-mono tabular-nums font-semibold" style={{ color: activeTheme.danger }}>
                    {analytics.adjacent.maxDrop.delta} п.
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums" style={{ color: activeTheme.textSecondary }}>
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

      {/* БЛОК 4: Регрессия Сон(t) -> Индекс на следующий день W(t+1) */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest block"
              style={{ color: activeTheme.textSecondary }}
            >
              Регрессия: Сон(t) → Ресурс(t+1)
            </span>
            {sleepReg ? (
              <div className="text-xs font-mono tabular-nums mt-1" style={{ color: activeTheme.accent }}>
                r = {sleepReg.r} · R² = {sleepReg.r2} · {formatSigned(sleepReg.k)} п./час сна
              </div>
            ) : (
              <div className="text-xs mt-1" style={{ color: activeTheme.textSecondary }}>
                Нужно от 3 пар последовательных дней (n={sleepPairs.length})
              </div>
            )}
          </div>
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
                    fontFamily="JetBrains Mono, monospace"
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
                  fontFamily="JetBrains Mono, monospace"
                  fill={activeTheme.textMuted}
                >
                  {h}ч
                </text>
              ))}

              {/* Линия МНК y = a + k·sleep */}
              <line
                x1={sxFor(minSleep)}
                y1={syFor(sleepReg.predict(minSleep))}
                x2={sxFor(maxSleep)}
                y2={syFor(sleepReg.predict(maxSleep))}
                stroke={activeTheme.accent}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Точки (Сон_t, W_{t+1}) */}
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
            <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textSecondary }}>
              Линейная аппроксимация (n={sleepPairs.length} пар): каждый дополнительный час сна связан с изменением индекса следующего дня на{' '}
              <span className="font-mono font-semibold" style={{ color: activeTheme.textPrimary }}>
                {formatSigned(sleepReg.k)} п.
              </span>
            </p>
          </>
        )}
      </div>

      {/* БЛОК 5: Матрица влияния факторов (Δ₀ в день фактора и Δ₊₁ лаг на следующий день) */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest block"
              style={{ color: activeTheme.textSecondary }}
            >
              Матрица факторов · Лаг-анализ
            </span>
            <h3 className="text-sm font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
              Влияние якорей на состояние
            </h3>
          </div>
          <div className="flex gap-3 text-[10px] font-mono" style={{ color: activeTheme.textMuted }}>
            <span>Δ₀ (день)</span>
            <span>Δ₊₁ (завтра)</span>
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
                    <div className="text-[10px] font-mono tabular-nums" style={{ color: activeTheme.textMuted }}>
                      n={f.count}
                      {f.lagCorrelation !== null ? ` · r=${f.lagCorrelation}` : ''}
                      {!f.isReliable && f.count > 0 ? ' · мало данных' : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono tabular-nums text-xs shrink-0">
                  <span className="w-11 text-right" style={{ color: d0Color }}>
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

      {/* БЛОК 6: Динамическая тепловая карта месяца (без захардкоженных дат) */}
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
            Тепловая карта · {getMonthTitleRu(calYear, calMonth)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftCalendarMonth(-1)}
              className="w-6 h-6 rounded border text-[11px] font-mono"
              style={{ borderColor: activeTheme.borderColor, color: activeTheme.textSecondary }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => shiftCalendarMonth(1)}
              className="w-6 h-6 rounded border text-[11px] font-mono"
              style={{ borderColor: activeTheme.borderColor, color: activeTheme.textSecondary }}
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono" style={{ color: activeTheme.textMuted }}>
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
                  className="text-[10px] font-mono tabular-nums font-medium leading-none"
                  style={{
                    color: hasRec ? '#FFFFFF' : activeTheme.textSecondary,
                  }}
                >
                  {cell.day}
                </span>
                {hasRec && (
                  <span className="text-[8px] font-mono tabular-nums text-white/85 leading-none mt-0.5">
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
              <span className="font-mono font-medium" style={{ color: activeTheme.textPrimary }}>
                {formatShortRuDate(selectedCalDay.dateKey)}:
              </span>{' '}
              <span style={{ color: activeTheme.textSecondary }}>
                {selectedCalDay.record
                  ? `W=${selectedCalDay.record.index} · сон ${selectedCalDay.record.sleepHours}ч${
                      selectedCalDay.record.wellbeing === 'sick' ? ' · восстановление' : ''
                    }`
                  : 'Нет записи'}
              </span>
            </div>
            {!isDemoMode && !selectedCalDay.isFuture && (
              <button
                type="button"
                onClick={() => onSelectDateToEdit(selectedCalDay.dateKey)}
                className="text-[10px] font-mono px-2 py-1 rounded border shrink-0"
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
