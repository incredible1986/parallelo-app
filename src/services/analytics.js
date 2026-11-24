/**
 * Математическое ядро Parallelo (Analytics & Correlation Engine)
 *
 * Реализованные модели:
 * 1. Композитный индекс состояния W ∈ [0, 100]
 * 2. Среднеквадратическое отклонение (σ) и коэффициент вариации (CV)
 * 3. Одномерная линейная регрессия МНК: y = a + k·x, коэффициент детерминации R², Пирсон r
 * 4. Средние положительных и отрицательных отклонений от личной нормы (Δ₊, Δ₋)
 * 5. Локальные экстремумы: локальные минимумы/максимумы, max(localMin), min(localMax)
 * 6. Соседние дни с max и min разницей (максимальный скачок восстановления / резкий спад)
 * 7. Индекс разнообразия уникальных факторов (Distinct Elements)
 * 8. Матрица влияния факторов: эффект в тот же день (Δ₀) и отложенный лаг-эффект (Δ₊₁)
 * 9. Формула индивидуальной гидратации (вес × 30 мл + термо/нагрузочные поправки)
 */

import { getLocalDateKey, parseDateKey } from './storage.js';

const round = (n, digits = 1) => {
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

export function computeRawScore(record) {
  if (!record) return null;
  const e = Number(record.energy ?? 6);
  const c = Number(record.calm ?? 6);
  const b = Number(record.bodyComfort ?? 6);
  const q = Number(record.sleepQuality ?? 3);
  const raw = 10 * (0.32 * e + 0.28 * c + 0.25 * b + 0.15 * (q * 2));
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 1. Композитный индекс состояния W ∈ [0, 100]
 * Если за день зафиксировано 2+ среза, итогом дня считается их среднее.
 */
export function computeDayIndex(record) {
  if (!record) return null;
  if (Array.isArray(record.snapshots) && record.snapshots.length >= 2) {
    const vals = record.snapshots.map((s) => Number(s.index)).filter((v) => Number.isFinite(v));
    if (vals.length >= 2) {
      return Math.round(computeMean(vals));
    }
  }
  return computeRawScore(record);
}

/**
 * Расчёт перепада состояния внутри одного дня по срезам (snapshots)
 */
export function computeIntradaySwing(record) {
  if (!record || !Array.isArray(record.snapshots) || record.snapshots.length < 2) return null;
  const vals = record.snapshots.map((s) => Number(s.index)).filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const first = record.snapshots[0];
  const last = record.snapshots[record.snapshots.length - 1];
  return {
    count: record.snapshots.length,
    min,
    max,
    amplitude: max - min,
    direction: Number(last.index) - Number(first.index),
    first,
    last,
  };
}

/**
 * Среднее арифметическое
 */
export function computeMean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 2. Среднеквадратическое отклонение (Standard Deviation, σ)
 * σ = sqrt( (1/N) * Σ(xᵢ - μ)² )
 */
export function computeStdDev(values) {
  if (!values || values.length < 2) return 0;
  const mean = computeMean(values);
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Коэффициент корреляции Пирсона r ∈ [-1, 1]
 */
export function computePearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const meanX = computeMean(xs.slice(0, n));
  const meanY = computeMean(ys.slice(0, n));

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

/**
 * 3. Линейная регрессия методом наименьших квадратов (МНК): y = a + k·x
 * Возвращает коэффициенты a, k, корреляцию r и R².
 */
export function computeLinearRegression(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;

  const meanX = computeMean(xs.slice(0, n));
  const meanY = computeMean(ys.slice(0, n));

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  if (sxx === 0) return null;

  const k = sxy / sxx;
  const a = meanY - k * meanX;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  const r2 = r * r;

  return {
    a: round(a, 2),
    k: round(k, 2),
    r: round(r, 2),
    r2: round(r2, 2),
    n,
    predict: (x) => a + k * x,
  };
}

/**
 * 4. Средние положительных и отрицательных отклонений от нормы (μ)
 */
export function computeSignedDeviations(values, baseline) {
  if (!values || values.length === 0) {
    return { meanPositive: 0, meanNegative: 0, posCount: 0, negCount: 0 };
  }
  const ref = baseline ?? computeMean(values);
  const positives = [];
  const negatives = [];

  values.forEach((v) => {
    const delta = v - ref;
    if (delta > 0) positives.push(delta);
    else if (delta < 0) negatives.push(delta);
  });

  return {
    meanPositive: positives.length ? round(computeMean(positives), 1) : 0,
    meanNegative: negatives.length ? round(computeMean(negatives), 1) : 0,
    posCount: positives.length,
    negCount: negatives.length,
  };
}

/**
 * 5. Локальные экстремумы ряда (точки разворота)
 * - локальный минимум: y[i-1] > y[i] < y[i+1]
 * - локальный максимум: y[i-1] < y[i] > y[i+1]
 * Также находит:
 * - maxOfLocalMinima (максимальный из локальных минимумов — верхняя «подушка» спадов)
 * - minOfLocalMaxima (минимальный из локальных максимумов — базовый потолок восстановления)
 */
export function findLocalExtrema(series) {
  const localMinima = [];
  const localMaxima = [];

  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1].index;
    const curr = series[i].index;
    const next = series[i + 1].index;

    if (curr < prev && curr < next) {
      localMinima.push({ ...series[i], position: i });
    } else if (curr > prev && curr > next) {
      localMaxima.push({ ...series[i], position: i });
    }
  }

  const maxOfLocalMinima = localMinima.length
    ? localMinima.reduce((best, item) => (item.index > best.index ? item : best), localMinima[0])
    : null;

  const minOfLocalMaxima = localMaxima.length
    ? localMaxima.reduce((best, item) => (item.index < best.index ? item : best), localMaxima[0])
    : null;

  return {
    localMinima,
    localMaxima,
    maxOfLocalMinima,
    minOfLocalMaxima,
  };
}

/**
 * 6. Соседние дни с максимальной и минимальной разницей Δ = W[t] - W[t-1]
 */
export function findAdjacentExtremes(series) {
  if (!series || series.length < 2) {
    return { maxJump: null, maxDrop: null };
  }

  let maxJump = null;
  let maxDrop = null;

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    const diff = curr.index - prev.index;

    const transition = {
      fromDate: prev.date,
      toDate: curr.date,
      fromIndex: prev.index,
      toIndex: curr.index,
      delta: diff,
      prevRituals: prev.rituals || [],
      currRituals: curr.rituals || [],
      currWellbeing: curr.wellbeing,
      currSymptoms: curr.symptoms || [],
    };

    if (!maxJump || diff > maxJump.delta) {
      maxJump = transition;
    }
    if (!maxDrop || diff < maxDrop.delta) {
      maxDrop = transition;
    }
  }

  return {
    maxJump: maxJump && maxJump.delta > 0 ? maxJump : null,
    maxDrop: maxDrop && maxDrop.delta < 0 ? maxDrop : null,
  };
}

/**
 * Скользящая средняя по окну window
 */
export function computeMovingAverage(values, windowSize = 7) {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = values.slice(start, idx + 1);
    return round(computeMean(slice), 1);
  });
}

/**
 * 7. Разнообразие уникальных факторов и состояний (Distinct Elements)
 */
export function computeDistinctDiversity(records, catalogLength = 8) {
  const uniqueRituals = new Set();
  const uniqueColors = new Set();

  records.forEach((r) => {
    (r.rituals || []).forEach((id) => uniqueRituals.add(id));
    if (r.colorId) uniqueColors.add(r.colorId);
  });

  return {
    distinctRituals: uniqueRituals.size,
    catalogLength,
    diversityPercent: catalogLength > 0 ? Math.round((uniqueRituals.size / catalogLength) * 100) : 0,
    distinctColors: uniqueColors.size,
  };
}

/**
 * 8. Матрица влияния факторов (Same-day Δ₀ и Next-day Lag Δ₊₁)
 */
export function computeFactorImpacts(series, catalog) {
  const byDate = new Map(series.map((s) => [s.date, s]));

  const nextDayKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    return getLocalDateKey(dt);
  };

  return catalog
    .map((ritual) => {
      const sameWith = [];
      const sameWithout = [];
      const nextWith = [];
      const nextWithout = [];
      const nextSleepHoursWith = [];
      const nextSleepHoursWithout = [];
      const nextSleepQualityWith = [];
      const nextSleepQualityWithout = [];
      const binFlags = [];
      const nextIndices = [];

      series.forEach((day) => {
        const has = (day.rituals || []).includes(ritual.id);
        if (has) sameWith.push(day.index);
        else sameWithout.push(day.index);

        const tomorrow = byDate.get(nextDayKey(day.date));
        if (tomorrow) {
          if (has) nextWith.push(tomorrow.index);
          else nextWithout.push(tomorrow.index);
          binFlags.push(has ? 1 : 0);
          nextIndices.push(tomorrow.index);

          if (Number.isFinite(Number(tomorrow.sleepHours))) {
            if (has) nextSleepHoursWith.push(Number(tomorrow.sleepHours));
            else nextSleepHoursWithout.push(Number(tomorrow.sleepHours));
          }
          if (Number.isFinite(Number(tomorrow.sleepQuality))) {
            if (has) nextSleepQualityWith.push(Number(tomorrow.sleepQuality));
            else nextSleepQualityWithout.push(Number(tomorrow.sleepQuality));
          }
        }
      });

      const count = sameWith.length;
      const sameDayDelta =
        sameWith.length > 0 && sameWithout.length > 0
          ? round(computeMean(sameWith) - computeMean(sameWithout), 1)
          : null;

      const nextDayDelta =
        nextWith.length > 0 && nextWithout.length > 0
          ? round(computeMean(nextWith) - computeMean(nextWithout), 1)
          : null;

      const sleepHoursDelta =
        nextSleepHoursWith.length > 0 && nextSleepHoursWithout.length > 0
          ? round(computeMean(nextSleepHoursWith) - computeMean(nextSleepHoursWithout), 1)
          : null;

      const sleepQualityDelta =
        nextSleepQualityWith.length > 0 && nextSleepQualityWithout.length > 0
          ? round(computeMean(nextSleepQualityWith) - computeMean(nextSleepQualityWithout), 1)
          : null;

      const lagCorrelation =
        nextWith.length >= 2 && nextWithout.length >= 2
          ? computePearsonCorrelation(binFlags, nextIndices)
          : null;

      return {
        id: ritual.id,
        title: ritual.title,
        iconKey: ritual.iconKey,
        category: ritual.category,
        count,
        sameDayDelta,
        nextDayDelta,
        sleepHoursDelta,
        sleepQualityDelta,
        lagCorrelation: lagCorrelation !== null ? round(lagCorrelation, 2) : null,
        isReliable: count >= 3 && sameWithout.length >= 2,
      };
    })
    .sort((a, b) => {
      const scoreA = Math.abs(a.nextDayDelta ?? a.sameDayDelta ?? -999);
      const scoreB = Math.abs(b.nextDayDelta ?? b.sameDayDelta ?? -999);
      if (b.count === 0 && a.count > 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      return scoreB - scoreA;
    });
}

/**
 * 9. Формула гидратации (мл)
 * Base = weight * 30 мл + бонусы за баню, движение, восстановление
 */
export function computeHydrationTarget(weightKg, record) {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w < 30 || w > 220) return null;

  const base = Math.round(w * 30);
  const rituals = record?.rituals || [];
  const bonuses = [];

  if (rituals.includes('banya')) bonuses.push({ label: 'бани', ml: 500 });
  if (rituals.includes('movement')) bonuses.push({ label: 'тренировки', ml: 350 });
  if (rituals.includes('alcohol')) bonuses.push({ label: 'алкоголя', ml: 300 });
  if (rituals.includes('substances')) bonuses.push({ label: 'веществ', ml: 250 });
  if (rituals.includes('walk')) bonuses.push({ label: 'прогулки', ml: 150 });
  if (record?.wellbeing === 'sick') bonuses.push({ label: 'восстановления', ml: 250 });

  const totalBonus = bonuses.reduce((sum, b) => sum + b.ml, 0);
  const totalMl = base + totalBonus;
  return {
    baseMl: base,
    bonusMl: totalBonus,
    totalMl,
    totalLiters: round(totalMl / 1000, 1),
    bonuses,
    noteText:
      bonuses.length > 0
        ? `с учётом ${bonuses.map((b) => b.label).join(' и ')}`
        : 'базовый ориентир на день',
  };
}

/**
 * Вычисление дня и фазы цикла для заданной даты (на основе последней отметки 1-го дня цикла <= dateKey).
 */
export function computeCycleInfo(dateKey, recordsMap, cycleLength = 28) {
  if (!recordsMap || !dateKey) return null;
  const starts = Object.values(recordsMap)
    .filter((r) => r && r.isCycleStart && r.date && r.date <= dateKey)
    .map((r) => r.date)
    .sort();

  if (starts.length === 0) return null;

  const lastStart = starts[starts.length - 1];
  const diffDays = Math.round(
    (parseDateKey(dateKey).getTime() - parseDateKey(lastStart).getTime()) / 86400000
  );
  const maxTrack = Math.max(35, Number(cycleLength || 28) + 10);
  if (diffDays < 0 || diffDays >= maxTrack) return null;

  const cycleDay = diffDays + 1;
  let phaseId = 'follicular';
  let phaseLabel = 'Первая половина (подъём сил)';
  let shortPhase = 'Первая половина';

  if (cycleDay <= 5) {
    phaseId = 'menstrual';
    phaseLabel = 'Начало цикла (спад сил естественен)';
    shortPhase = 'Начало цикла';
  } else if (cycleDay <= 13) {
    phaseId = 'follicular';
    phaseLabel = 'Первая половина (подъём сил)';
    shortPhase = 'Первая половина';
  } else if (cycleDay <= 16) {
    phaseId = 'ovulatory';
    phaseLabel = 'Середина цикла (пик ресурса)';
    shortPhase = 'Середина цикла';
  } else {
    phaseId = 'luteal';
    phaseLabel = 'Вторая половина (нужно больше бережности)';
    shortPhase = 'Вторая половина';
  }

  return { cycleDay, phaseId, phaseLabel, shortPhase, lastStart };
}

/**
 * Сравнение состояния в первую и вторую половину цикла
 */
export function computeCyclePhaseStats(series, recordsMap, cycleLength = 28) {
  const firstHalf = [];
  const secondHalf = [];

  series.forEach((day) => {
    const info = computeCycleInfo(day.date, recordsMap, cycleLength);
    if (!info) return;
    if (info.cycleDay <= 14) firstHalf.push(day.index);
    else secondHalf.push(day.index);
  });

  if (firstHalf.length === 0 && secondHalf.length === 0) return null;

  const firstAvg = firstHalf.length ? round(computeMean(firstHalf), 1) : null;
  const secondAvg = secondHalf.length ? round(computeMean(secondHalf), 1) : null;
  const diff =
    firstAvg !== null && secondAvg !== null ? round(firstAvg - secondAvg, 1) : null;

  return {
    firstAvg,
    secondAvg,
    firstCount: firstHalf.length,
    secondCount: secondHalf.length,
    diff,
  };
}

const WEEKDAY_NOM = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAY_LOC = ['воскресеньям', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам'];

/**
 * Анализ рабочей нагрузки и паттернов по дням недели:
 * 1) Серия рабочих дней подряд без отдыха («пора взять выходной»)
 * 2) Затяжной рабочий спад за 14 дней («пора в отпуск»)
 * 3) Самый тяжёлый день недели («пятницы лучше разгрузить»)
 */
export function computeWorkAndWeekdayInsights(allSorted, activeSeries, mean) {
  const alerts = [];
  if (!allSorted || allSorted.length < 3) return alerts;

  const isWorkDay = (r) => {
    const rituals = r.rituals || [];
    return rituals.includes('work') || rituals.includes('overtime');
  };

  // 1. Сколько рабочих дней подряд в самом конце истории
  let consecutiveWork = 0;
  for (let i = allSorted.length - 1; i >= 0; i--) {
    if (isWorkDay(allSorted[i])) consecutiveWork += 1;
    else break;
  }

  // 2. Анализ последних 14 дней на затяжной рабочий спад («пора в отпуск»)
  const last14 = allSorted.slice(-14);
  const workIn14 = last14.filter(isWorkDay).length;
  const overtimeIn14 = last14.filter((r) => (r.rituals || []).includes('overtime')).length;
  const recent7Active = activeSeries.slice(-7);
  const recent7Mean = recent7Active.length >= 3 ? computeMean(recent7Active.map((d) => d.index)) : null;

  if (
    last14.length >= 10 &&
    (workIn14 >= 10 || overtimeIn14 >= 3) &&
    mean !== null &&
    recent7Mean !== null &&
    recent7Mean <= mean - 5
  ) {
    alerts.push({
      id: 'vacation_needed',
      tone: 'caution',
      title: 'Похоже, пора в отпуск',
      text: `За последние две недели накопилась усталость от плотного графика (рабочих дней: ${workIn14}, переработок: ${overtimeIn14}), а состояние держится ниже вашей нормы. Телу нужна перезагрузка хотя бы на пару дней.`,
    });
  } else if (consecutiveWork >= 6) {
    const last3 = allSorted.slice(-3);
    const last3Mean = computeMean(last3.map((d) => d.index));
    const isDropping = mean !== null ? last3Mean <= mean : last3[last3.length - 1].index < last3[0].index;
    if (isDropping) {
      alerts.push({
        id: 'day_off_needed',
        tone: 'caution',
        title: 'Пора взять выходной',
        text: `Вы работаете уже ${consecutiveWork} дней подряд без паузы, и силы постепенно снижаются. Хороший момент устроить полноценный день отдыха.`,
      });
    }
  }

  // 3. Паттерн по дням недели (если накоплено >= 14 активных дней)
  if (activeSeries.length >= 14 && mean !== null) {
    const byDay = Array.from({ length: 7 }, () => []);
    activeSeries.forEach((d) => {
      const dow = parseDateKey(d.date).getDay();
      byDay[dow].push(d.index);
    });

    let worstDow = -1;
    let worstAvg = Infinity;
    byDay.forEach((vals, dow) => {
      if (vals.length >= 2) {
        const avg = computeMean(vals);
        if (avg < worstAvg) {
          worstAvg = avg;
          worstDow = dow;
        }
      }
    });

    if (worstDow !== -1 && mean - worstAvg >= 6) {
      const diff = round(mean - worstAvg, 1);
      const nom = WEEKDAY_NOM[worstDow];
      const titleNom = nom.charAt(0).toUpperCase() + nom.slice(1);
      alerts.push({
        id: `weekday_${worstDow}`,
        tone: 'neutral',
        title: `${titleNom} даётся тяжелее всего`,
        text: `По ${WEEKDAY_LOC[worstDow]} ваше состояние в среднем ниже на ${diff} пунктов. Возможно, этот день недели стоит разгрузить от сложных задач.`,
      });
    }
  }

  return alerts;
}

/**
 * Генерация 1–4 живых текстовых наблюдений человеческим языком («Наблюдение дня»)
 */
export function generateNarrativeInsights(
  { factorImpacts, sleepRegression, trendLabel, analyzedDays, cycleStats, allSeries, series, mean },
  shoppingPauses = [],
  recordsMap = {}
) {
  const list = [];

  if (analyzedDays < 3) {
    return [
      {
        id: 'calibrating',
        tone: 'neutral',
        title: 'Собираем первые наблюдения',
        text: 'Через 3–4 дня записей здесь появятся первые выводы о том, что даёт вам силы, а что их забирает.',
      },
    ];
  }

  // 0. Сигналы про выходной, отпуск или тяжёлый день недели
  const workAlerts = computeWorkAndWeekdayInsights(allSeries, series, mean);
  workAlerts.forEach((a) => list.push(a));

  // 1. Главный источник сил (положительный эффект на завтра или в тот же день)
  const positiveFactors = factorImpacts
    .filter((f) => f.count >= 2 && (f.nextDayDelta ?? f.sameDayDelta ?? 0) >= 4)
    .sort((a, b) => (b.nextDayDelta ?? b.sameDayDelta ?? 0) - (a.nextDayDelta ?? a.sameDayDelta ?? 0));

  if (positiveFactors.length > 0) {
    const top = positiveFactors[0];
    const hasLag = top.nextDayDelta !== null && top.nextDayDelta >= 4;
    const val = hasLag ? top.nextDayDelta : top.sameDayDelta;
    list.push({
      id: `pos_${top.id}`,
      tone: 'positive',
      title: `Источник восстановления: ${top.title}`,
      text: hasLag
        ? `На следующий день после «${top.title}» ваше состояние в среднем выше на +${val} пунктов.`
        : `В дни с «${top.title}» ваше состояние в среднем выше на +${val} пунктов.`,
    });
  }

  // 2. Что забирает силы (отрицательный эффект на завтра или на сон)
  const drainingFactors = factorImpacts
    .filter((f) => f.count >= 2 && (f.nextDayDelta ?? f.sameDayDelta ?? 0) <= -4)
    .sort((a, b) => (a.nextDayDelta ?? a.sameDayDelta ?? 0) - (b.nextDayDelta ?? b.sameDayDelta ?? 0));

  if (drainingFactors.length > 0) {
    const drain = drainingFactors[0];
    const hasLag = drain.nextDayDelta !== null && drain.nextDayDelta <= -4;
    const val = Math.abs(hasLag ? drain.nextDayDelta : drain.sameDayDelta);
    const sleepNote =
      drain.sleepQualityDelta !== null && drain.sleepQualityDelta <= -0.5
        ? ' и заметно хуже качество сна'
        : '';
    list.push({
      id: `neg_${drain.id}`,
      tone: 'caution',
      title: `Просадка после «${drain.title}»`,
      text: hasLag
        ? `После «${drain.title}» состояние на следующий день ниже в среднем на ${val} пунктов${sleepNote}.`
        : `В дни с «${drain.title}» ресурс ниже в среднем на ${val} пунктов${sleepNote}.`,
    });
  }

  // 3. Связь сна и импульсивных покупок
  if (Array.isArray(shoppingPauses) && shoppingPauses.length >= 2) {
    let lowSleepCount = 0;
    let matchedCount = 0;
    shoppingPauses.forEach((p) => {
      if (!p.createdAt) return;
      const dateKey = getLocalDateKey(new Date(p.createdAt));
      const rec = recordsMap[dateKey];
      if (rec && Number.isFinite(Number(rec.sleepHours))) {
        matchedCount += 1;
        if (Number(rec.sleepHours) < 7) lowSleepCount += 1;
      }
    });
    if (matchedCount >= 2 && lowSleepCount >= 2) {
      list.push({
        id: 'shopping_sleep',
        tone: 'neutral',
        title: 'Сон и импульсивные покупки',
        text: `В ${lowSleepCount} из ${matchedCount} случаев, когда вы ставили покупку на 24-часовую паузу, сон накануне был меньше 7 часов.`,
      });
    }
  }

  // 3.5. Влияние вечернего перепада внутри дня на сон следующей ночью
  if (Array.isArray(allSeries) && allSeries.length >= 4) {
    const byDateMap = new Map(allSeries.map((s) => [s.date, s]));
    const dropSleepHours = [];
    const normalSleepHours = [];
    allSeries.forEach((d) => {
      const [y, m, dayNum] = d.date.split('-').map(Number);
      const nextKey = getLocalDateKey(new Date(y, m - 1, dayNum + 1));
      const tomorrow = byDateMap.get(nextKey);
      if (!tomorrow || !Number.isFinite(Number(tomorrow.sleepHours))) return;
      const sw = computeIntradaySwing(d);
      if (sw && sw.amplitude >= 15 && sw.direction <= -10) {
        dropSleepHours.push(Number(tomorrow.sleepHours));
      } else {
        normalSleepHours.push(Number(tomorrow.sleepHours));
      }
    });
    if (dropSleepHours.length >= 2 && normalSleepHours.length >= 2) {
      const diff = round(computeMean(dropSleepHours) - computeMean(normalSleepHours), 1);
      if (diff <= -0.4) {
        list.push({
          id: 'intraday_drop_sleep',
          tone: 'caution',
          title: 'Вечерние перепады и сон',
          text: `В дни с резким вечерним спадом ваш сон следующей ночью в среднем короче на ${Math.abs(diff)} ч.`,
        });
      }
    }
  }

  // 4. Цикл или сон/тренд (добираем до 3 карточек)
  if (list.length < 3 && cycleStats && cycleStats.diff !== null && Math.abs(cycleStats.diff) >= 4) {
    list.push({
      id: 'cycle_rhythm',
      tone: 'neutral',
      title: 'Ритм цикла',
      text:
        cycleStats.diff > 0
          ? `Во второй половине цикла ваше среднее состояние на ${cycleStats.diff} пунктов ниже, чем в первой — это естественный фон, а не спад продуктивности.`
          : `Во второй половине цикла ваше состояние держится даже ровнее (выше на ${Math.abs(cycleStats.diff)} пунктов).`,
    });
  }

  if (list.length < 3 && sleepRegression && sleepRegression.k >= 2) {
    list.push({
      id: 'sleep_lift',
      tone: 'positive',
      title: 'Сон как опора',
      text: `Каждый дополнительный час сна в среднем добавляет +${sleepRegression.k} пунктов к вашему состоянию на следующий день.`,
    });
  }

  if (list.length === 0) {
    list.push({
      id: 'steady_trend',
      tone: 'neutral',
      title: trendLabel,
      text: `За ${analyzedDays} дн. наблюдений пока нет резких перекосов по отдельным факторам. Продолжайте отмечать события дня, чтобы увидеть скрытые связи.`,
    });
  }

  return list.slice(0, 4);
}

/**
 * Полный расчёт аналитики по словарю записей
 */
export function computeFullAnalytics(
  recordsMap,
  catalog,
  { excludeSick = true, trackCycle = false, cycleLength = 28, shoppingPauses = [] } = {}
) {
  const allSorted = Object.values(recordsMap || {})
    .filter((r) => r && r.date && (r.isSaved || (r.rituals && r.rituals.length > 0)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      index: computeDayIndex(r),
    }));

  const sickDaysCount = allSorted.filter((r) => r.wellbeing === 'sick').length;
  const activeSeries = excludeSick
    ? allSorted.filter((r) => r.wellbeing !== 'sick')
    : allSorted;

  const hasEnoughForTrends = activeSeries.length >= 5;
  const indices = activeSeries.map((s) => s.index);
  const mean = indices.length ? round(computeMean(indices), 1) : null;
  const stdDev = hasEnoughForTrends ? round(computeStdDev(indices), 1) : null;
  const cv = mean && stdDev !== null && mean > 0 ? round((stdDev / mean) * 100, 1) : null;

  // Линейная регрессия тренда во времени: только от 5+ наблюдений
  const timeXs = activeSeries.map((_, i) => i);
  const trendRegression = hasEnoughForTrends ? computeLinearRegression(timeXs, indices) : null;

  // Регрессия Сон(t) -> Ресурс(t+1)
  const byDate = new Map(activeSeries.map((s) => [s.date, s]));
  const sleepXs = [];
  const nextEnergyYs = [];
  const sleepPairs = [];
  activeSeries.forEach((day) => {
    const [y, m, d] = day.date.split('-').map(Number);
    const nextKey = getLocalDateKey(new Date(y, m - 1, d + 1));
    const tomorrow = byDate.get(nextKey);
    if (tomorrow && Number.isFinite(Number(day.sleepHours))) {
      const sh = Number(day.sleepHours);
      sleepXs.push(sh);
      nextEnergyYs.push(tomorrow.index);
      sleepPairs.push({ x: sh, y: tomorrow.index, date: day.date, nextDate: nextKey });
    }
  });
  const sleepRegression = sleepXs.length >= 3 ? computeLinearRegression(sleepXs, nextEnergyYs) : null;

  const signedDeviations = computeSignedDeviations(indices, mean);
  const extrema = findLocalExtrema(activeSeries);
  const adjacent = findAdjacentExtremes(activeSeries);
  const movingAvg = computeMovingAverage(indices, 7);
  const diversity = computeDistinctDiversity(allSorted, catalog.length);
  const factorImpacts = computeFactorImpacts(activeSeries, catalog);

  let stabilityLabel = 'Нужно от 5 дней наблюдений';
  if (hasEnoughForTrends && stdDev !== null) {
    if (stdDev < 8) stabilityLabel = 'Ровный ритм';
    else if (stdDev <= 14) stabilityLabel = 'Умеренные перепады';
    else stabilityLabel = 'Заметные качели';
  }

  let trendLabel = 'Тренд появится от 5 дней';
  if (trendRegression) {
    if (trendRegression.k >= 0.25) trendLabel = 'Состояние постепенно растёт';
    else if (trendRegression.k <= -0.25) trendLabel = 'Постепенно накапливается усталость';
    else trendLabel = 'Ритм держится ровно';
  }

  const cycleStats = trackCycle
    ? computeCyclePhaseStats(activeSeries, recordsMap, cycleLength)
    : null;

  const warmMemories = extractWarmMemories(recordsMap);
  const weeklyDigest = computeWeeklyDigest(activeSeries, catalog);
  const intradaySwings = activeSeries
    .map((r) => {
      const swing = computeIntradaySwing(r);
      return swing && swing.amplitude >= 12 ? { date: r.date, ...swing, rituals: r.rituals || [] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.amplitude - a.amplitude)
    .slice(0, 5);

  const baseResult = {
    totalDays: allSorted.length,
    analyzedDays: activeSeries.length,
    hasEnoughForTrends,
    sickDaysCount,
    series: activeSeries,
    allSeries: allSorted,
    mean,
    stdDev,
    cv,
    stabilityLabel,
    trendLabel,
    trendRegression,
    sleepRegression,
    sleepPairs,
    signedDeviations,
    extrema,
    adjacent,
    movingAvg,
    diversity,
    factorImpacts,
    cycleStats,
    warmMemories,
    weeklyDigest,
    intradaySwings,
  };

  return {
    ...baseResult,
    insights: generateNarrativeInsights(baseResult, shoppingPauses, recordsMap),
  };
}

/**
 * Недельный дайджест: итоги последних 7 записей (хорошие дни, средний сон, частый якорь)
 */
export function computeWeeklyDigest(activeSeries, catalog = []) {
  if (!activeSeries || activeSeries.length < 3) return null;
  const last7 = activeSeries.slice(-7);
  const titleMap = Object.fromEntries(catalog.map((c) => [c.id, c.title]));

  const goodDays = last7.filter((d) => d.index >= 75).length;
  const sleepValues = last7
    .map((d) => Number(d.sleepHours))
    .filter((v) => Number.isFinite(v) && v > 0);
  const avgSleep = sleepValues.length ? round(computeMean(sleepValues), 1) : null;

  const counts = {};
  last7.forEach((d) => {
    (d.rituals || []).forEach((id) => {
      if (id !== 'alcohol' && id !== 'substances' && id !== 'overtime' && id !== 'work') {
        counts[id] = (counts[id] || 0) + 1;
      }
    });
  });

  const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const topAnchor = topEntry ? { title: titleMap[topEntry[0]] || topEntry[0], count: topEntry[1] } : null;

  return {
    daysCount: last7.length,
    goodDays,
    avgSleep,
    topAnchor,
  };
}

/**
 * «Погреб лета»: отбирает прошлые дни с высоким состоянием (>= 78),
 * отдавая приоритет записям с личной заметкой.
 */
export function extractWarmMemories(recordsMap, excludeDate = null) {
  return Object.values(recordsMap || {})
    .filter((r) => {
      if (!r || !r.date || r.date === excludeDate) return false;
      if (r.wellbeing === 'sick') return false;
      if (!r.isSaved && !(r.rituals && r.rituals.length > 0) && !(r.note && r.note.trim())) {
        return false;
      }
      return computeDayIndex(r) >= 78;
    })
    .map((r) => ({
      date: r.date,
      index: computeDayIndex(r),
      note: (r.note || '').trim(),
      rituals: r.rituals || [],
      questionTag:
        r.questionTag && r.questionTag !== 'Пропустить' && r.questionTag !== 'Не помню'
          ? r.questionTag
          : null,
    }))
    .sort((a, b) => {
      const aHasNote = a.note.length > 0 ? 1 : 0;
      const bHasNote = b.note.length > 0 ? 1 : 0;
      if (bHasNote !== aHasNote) return bHasNote - aHasNote;
      return b.index - a.index;
    });
}

/**
 * «Свежий воздух» и опора при спаде:
 * определяет, есть ли сейчас спад (усталость/болезнь или 3+ дня подряд ниже нормы),
 * и возвращает 1–2 проверенных личных фактора восстановления + тёплые воспоминания.
 */
export function computeRecoverySupport(
  recordsMap,
  catalog,
  selectedDate,
  currentWellbeing,
  baselineMean
) {
  const sorted = Object.values(recordsMap || {})
    .filter((r) => r && r.date && r.date <= selectedDate && (r.isSaved || (r.rituals && r.rituals.length > 0)))
    .sort((a, b) => a.date.localeCompare(b.date));

  let consecutiveLow = 0;
  const threshold = baselineMean !== null ? baselineMean - 4 : 60;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const idx = computeDayIndex(sorted[i]);
    if (idx < threshold || sorted[i].wellbeing === 'tired') {
      consecutiveLow += 1;
    } else {
      break;
    }
  }

  const isDip =
    currentWellbeing === 'sick' ||
    currentWellbeing === 'tired' ||
    consecutiveLow >= 3;

  if (!isDip) {
    return { isDip: false, consecutiveLow, recoveryAnchors: [], warmMemories: [] };
  }

  const activeSeries = sorted
    .filter((r) => r.wellbeing !== 'sick')
    .map((r) => ({ ...r, index: computeDayIndex(r) }));

  const impacts = computeFactorImpacts(activeSeries, catalog);
  const recoveryAnchors = impacts
    .filter(
      (f) =>
        f.id !== 'alcohol' &&
        f.id !== 'substances' &&
        f.count >= 2 &&
        (f.nextDayDelta ?? f.sameDayDelta ?? 0) >= 3
    )
    .sort((a, b) => (b.nextDayDelta ?? b.sameDayDelta ?? 0) - (a.nextDayDelta ?? a.sameDayDelta ?? 0))
    .slice(0, 2);

  const warmMemories = extractWarmMemories(recordsMap, selectedDate);

  return {
    isDip,
    consecutiveLow,
    recoveryAnchors,
    warmMemories,
  };
}

/**
 * Генератор 21-дневной реалистичной выборки для предпросмотра графиков.
 * Никогда не записывается в localStorage пользователя.
 */
export function generateDemoDataset21Days() {
  const today = new Date();
  const demo = {};

  // Детерминированный 21-дневный сценарий: баня и близость дают подъём, алкоголь и недосып снижают ресурс, 2 дня простуды
  const template = [
    { e: 6, c: 6, b: 6, s: 7.0, sq: 3, w: 'in_flow', r: ['warm_plate', 'tea', 'work', 'alcohol'], col: 'sage' },
    { e: 5, c: 5, b: 6, s: 6.0, sq: 2, w: 'tired', r: ['warm_plate', 'work', 'overtime'], col: 'stone' },
    { e: 6, c: 7, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['walk', 'tea', 'presence', 'work'], col: 'azure' },
    { e: 7, c: 7, b: 7, s: 8.0, sq: 4, w: 'in_flow', r: ['movement', 'warm_plate', 'friends'], col: 'amber' },
    { e: 7, c: 8, b: 8, s: 8.0, sq: 5, w: 'in_flow', r: ['banya', 'warm_plate', 'tea', 'intimacy'], col: 'amber' },
    { e: 9, c: 9, b: 9, s: 8.5, sq: 5, w: 'in_flow', r: ['walk', 'presence', 'friends'], col: 'amber', note: 'После бани спала как младенец, утром лёгкость в спине и ясная голова.' },
    { e: 8, c: 8, b: 8, s: 7.5, sq: 4, w: 'in_flow', r: ['garden', 'warm_plate', 'work'], col: 'sage' },
    { e: 6, c: 5, b: 6, s: 6.0, sq: 2, w: 'tired', r: ['mindful_shopping', 'work', 'overtime', 'alcohol'], col: 'indigo', snapshots: [
      { id: 'd_s1', time: '13:30', index: 76, wellbeing: 'in_flow' },
      { id: 'd_s2', time: '22:15', index: 46, wellbeing: 'tired' },
    ] },
    { e: 5, c: 5, b: 5, s: 5.5, sq: 2, w: 'tired', r: ['tea', 'work', 'overtime'], col: 'stone' },
    { e: 3, c: 5, b: 3, s: 6.5, sq: 2, w: 'sick', r: ['warm_plate'], col: 'stone', sym: ['Першит горло', 'Слабость / ломота'] },
    { e: 4, c: 6, b: 4, s: 8.5, sq: 3, w: 'sick', r: ['warm_plate', 'tea'], col: 'sage', sym: ['Слабость / ломота'] },
    { e: 6, c: 7, b: 6, s: 8.0, sq: 4, w: 'in_flow', r: ['walk', 'warm_plate', 'work'], col: 'sage' },
    { e: 7, c: 7, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['banya', 'tea', 'intimacy', 'friends'], col: 'azure' },
    { e: 9, c: 8, b: 9, s: 8.5, sq: 5, w: 'in_flow', r: ['movement', 'walk', 'warm_plate'], col: 'amber' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, w: 'in_flow', r: ['presence', 'tea', 'work'], col: 'azure' },
    { e: 7, c: 6, b: 7, s: 6.5, sq: 3, w: 'in_flow', r: ['warm_plate', 'mindful_shopping', 'work', 'alcohol'], col: 'indigo' },
    { e: 6, c: 6, b: 6, s: 6.5, sq: 3, w: 'tired', r: ['walk', 'work', 'overtime'], col: 'stone' },
    { e: 7, c: 8, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['movement', 'warm_plate', 'presence', 'work'], col: 'sage' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, w: 'in_flow', r: ['banya', 'warm_plate', 'intimacy'], col: 'amber', snapshots: [
      { id: 'd_s3', time: '12:00', index: 62, wellbeing: 'tired' },
      { id: 'd_s4', time: '21:30', index: 86, wellbeing: 'in_flow' },
    ] },
    { e: 9, c: 9, b: 9, s: 9.0, sq: 5, w: 'in_flow', r: ['walk', 'garden', 'tea', 'friends'], col: 'amber', note: 'Вечер без телефона, травяной чай и долгая прогулка в тишине.' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, w: 'in_flow', r: ['movement', 'presence', 'warm_plate'], col: 'azure' },
  ];

  template.forEach((t, idx) => {
    const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (template.length - 1 - idx));
    const key = getLocalDateKey(dt);
    demo[key] = {
      date: key,
      energy: t.e,
      calm: t.c,
      bodyComfort: t.b,
      sleepHours: t.s,
      sleepQuality: t.sq,
      wellbeing: t.w,
      symptoms: t.sym || [],
      rituals: t.r,
      workouts: t.r.includes('movement')
        ? [{ type: 'Растяжка и йога', duration: 35, feeling: 'Приятное тепло', enjoyment: 8 }]
        : [],
      colorId: t.col,
      questionTag: null,
      feltAlive: t.e >= 7,
      isCycleStart: idx === 1,
      snapshots: t.snapshots || [],
      note: t.note || '',
      isSaved: true,
      updatedAt: dt.toISOString(),
    };
  });

  return demo;
}
