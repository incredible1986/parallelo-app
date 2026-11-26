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

import { MEAT_TYPES } from '../data/brandingTokens.js';
import { getLocalDateKey, parseDateKey } from './storage.js';

const NON_ANCHOR_IDS = new Set([
  'alcohol',
  'substances',
  'nicotine',
  'energy_drink',
  'coffee',
  'overtime',
  'work',
]);

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
  if (rituals.includes('coffee')) {
    bonuses.push({ label: 'кофе', ml: record?.coffeeDetail === 'many' ? 300 : 150 });
  }
  if (rituals.includes('energy_drink')) bonuses.push({ label: 'энергетика', ml: 250 });
  if (rituals.includes('nicotine')) bonuses.push({ label: 'никотина', ml: 150 });
  if (record?.wellbeing === 'sick') bonuses.push({ label: 'восстановления', ml: 250 });
  if (record?.digestion === 'none' || record?.digestion === 'heavy') {
    bonuses.push({ label: 'пищеварения', ml: 250 });
  } else if (record?.digestion === 'loose') {
    bonuses.push({ label: 'восполнения воды', ml: 300 });
  }

  const totalBonus = bonuses.reduce((sum, b) => sum + b.ml, 0);
  const totalMl = base + totalBonus;
  const noteText =
    bonuses.length === 0
      ? 'базовый ориентир на день'
      : bonuses.length <= 2
      ? `с учётом ${bonuses.map((b) => b.label).join(' и ')}`
      : `с учётом ${bonuses.map((b) => b.label).join(', ')}`;

  return {
    baseMl: base,
    bonusMl: totalBonus,
    totalMl,
    totalLiters: round(totalMl / 1000, 1),
    bonuses,
    noteText,
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

const VALID_DIGESTION = ['comfortable', 'none', 'heavy', 'loose'];

/**
 * Анализ ритма пищеварения, связи с факторами накануне и фазами цикла
 */
export function computeDigestionStats(
  allSorted,
  recordsMap,
  catalog = [],
  { trackCycle = false, cycleLength = 28 } = {}
) {
  if (!Array.isArray(allSorted) || allSorted.length === 0) return null;

  const logged = allSorted.filter(
    (r) => r.digestion && VALID_DIGESTION.includes(r.digestion)
  );
  if (logged.length === 0) return null;

  const comfortableCount = logged.filter((r) => r.digestion === 'comfortable').length;
  const noneCount = logged.filter((r) => r.digestion === 'none').length;
  const heavyCount = logged.filter((r) => r.digestion === 'heavy').length;
  const looseCount = logged.filter((r) => r.digestion === 'loose').length;

  // Сколько дней подряд на самом конце истории отмечено «Не было» (шаг строго 1 календарный день)
  let consecutiveNone = 0;
  const latestRecordDate = allSorted[allSorted.length - 1]?.date;
  const lastLogged = logged[logged.length - 1];
  if (latestRecordDate && lastLogged?.digestion === 'none') {
    const gapToLatest = Math.round(
      (parseDateKey(latestRecordDate).getTime() - parseDateKey(lastLogged.date).getTime()) / 86400000
    );
    if (gapToLatest <= 1) {
      consecutiveNone = 1;
      for (let i = logged.length - 2; i >= 0; i--) {
        const curr = logged[i];
        const next = logged[i + 1];
        const dayDiff = Math.round(
          (parseDateKey(next.date).getTime() - parseDateKey(curr.date).getTime()) / 86400000
        );
        if (curr.digestion === 'none' && dayDiff === 1) {
          consecutiveNone += 1;
        } else {
          break;
        }
      }
    }
  }

  const comfDays = logged.filter((r) => r.digestion === 'comfortable');
  const issueDays = logged.filter((r) => r.digestion !== 'comfortable');

  const comfortableAvgIndex = comfDays.length
    ? round(computeMean(comfDays.map((r) => r.index)), 1)
    : null;
  const issueAvgIndex = issueDays.length
    ? round(computeMean(issueDays.map((r) => r.index)), 1)
    : null;
  const indexDiff =
    comfortableAvgIndex !== null && issueAvgIndex !== null
      ? round(comfortableAvgIndex - issueAvgIndex, 1)
      : null;

  const comfortableAvgBody = comfDays.length
    ? round(computeMean(comfDays.map((r) => Number(r.bodyComfort ?? 6))), 1)
    : null;
  const issueAvgBody = issueDays.length
    ? round(computeMean(issueDays.map((r) => Number(r.bodyComfort ?? 6))), 1)
    : null;
  const comfortDiff =
    comfortableAvgBody !== null && issueAvgBody !== null
      ? round(comfortableAvgBody - issueAvgBody, 1)
      : null;

  // Влияние вчерашних факторов на сегодняшний стул (вчера -> сегодня)
  const byDate = new Map(allSorted.map((r) => [r.date, r]));
  let topTrigger = null;
  let bestTriggerScore = 0;
  let topHelper = null;
  let bestHelperScore = 0;

  catalog.forEach((ritual) => {
    let withTotal = 0;
    let withIssue = 0;
    let withComf = 0;
    let withoutTotal = 0;
    let withoutIssue = 0;
    let withoutComf = 0;

    allSorted.forEach((day) => {
      const dt = parseDateKey(day.date);
      dt.setDate(dt.getDate() + 1);
      const tomorrow = byDate.get(getLocalDateKey(dt));
      if (!tomorrow || !tomorrow.digestion || !VALID_DIGESTION.includes(tomorrow.digestion)) {
        return;
      }

      const hasFactor = (day.rituals || []).includes(ritual.id);
      const isComf = tomorrow.digestion === 'comfortable';
      if (hasFactor) {
        withTotal += 1;
        if (isComf) withComf += 1;
        else withIssue += 1;
      } else {
        withoutTotal += 1;
        if (isComf) withoutComf += 1;
        else withoutIssue += 1;
      }
    });

    if (withTotal >= 2 && withoutTotal >= 1) {
      const issueRateWith = withIssue / withTotal;
      const issueRateWithout = withoutIssue / withoutTotal;
      const triggerLift = issueRateWith - issueRateWithout;
      if (withIssue >= 2 && triggerLift >= 0.3 && triggerLift > bestTriggerScore) {
        bestTriggerScore = triggerLift;
        topTrigger = {
          id: ritual.id,
          title: ritual.title,
          issueCount: withIssue,
          totalWith: withTotal,
        };
      }

      if (!NON_ANCHOR_IDS.has(ritual.id)) {
        const comfRateWith = withComf / withTotal;
        const comfRateWithout = withoutComf / withoutTotal;
        const helperLift = comfRateWith - comfRateWithout;
        if (withComf >= 2 && helperLift >= 0.25 && helperLift > bestHelperScore) {
          bestHelperScore = helperLift;
          topHelper = {
            id: ritual.id,
            title: ritual.title,
            comfCount: withComf,
            totalWith: withTotal,
          };
        }
      }
    }
  });

  // Опциональная связь с фазами цикла
  let cycleNote = null;
  if (trackCycle) {
    const slowDays = logged.filter((r) => r.digestion === 'none' || r.digestion === 'heavy');
    const slowWithCycle = slowDays
      .map((r) => computeCycleInfo(r.date, recordsMap, cycleLength))
      .filter(Boolean);
    const slowLutealCount = slowWithCycle.filter((info) => info.phaseId === 'luteal').length;

    const looseDays = logged.filter((r) => r.digestion === 'loose');
    const looseMenstrualCount = looseDays
      .map((r) => computeCycleInfo(r.date, recordsMap, cycleLength))
      .filter((info) => info && info.phaseId === 'menstrual').length;

    if (slowWithCycle.length >= 2 && slowLutealCount >= 2 && slowLutealCount / slowWithCycle.length >= 0.6) {
      cycleNote =
        'Задержки и тяжесть чаще приходятся на вторую половину цикла — это естественное влияние гормонального фона.';
    } else if (looseMenstrualCount >= 2) {
      cycleNote =
        'Слабость ЖКТ чаще совпадает с первыми днями цикла — естественная реакция организма.';
    }
  }

  return {
    loggedDays: logged.length,
    comfortableCount,
    noneCount,
    heavyCount,
    looseCount,
    consecutiveNone,
    comfortableAvgIndex,
    issueAvgIndex,
    indexDiff,
    comfortableAvgBody,
    issueAvgBody,
    comfortDiff,
    topTrigger,
    topHelper,
    cycleNote,
  };
}

/**
 * Анализ белкового рациона (мясо/рыба/без мяса) и стимуляторов (поздний кофе, энергетики, никотин)
 */
export function computeNutritionAndStimulants(allSorted) {
  if (!Array.isArray(allSorted) || allSorted.length === 0) return null;

  const byDate = new Map(allSorted.map((r) => [r.date, r]));
  const getNextKey = (dateKey) => {
    const dt = parseDateKey(dateKey);
    dt.setDate(dt.getDate() + 1);
    return getLocalDateKey(dt);
  };

  const proteinGroups = MEAT_TYPES.map((m) => {
    const matched = allSorted.filter((r) => (r.meatTypes || []).includes(m.id));
    if (matched.length === 0) return null;
    return {
      id: m.id,
      label: m.label,
      count: matched.length,
      avgIndex: round(computeMean(matched.map((r) => r.index)), 1),
      avgBodyComfort: round(computeMean(matched.map((r) => Number(r.bodyComfort ?? 6))), 1),
    };
  }).filter(Boolean);

  const meatDays = allSorted.filter((r) => (r.meatTypes || []).length > 0);
  const meatFreeDays = allSorted.filter((r) => (r.meatTypes || []).length === 0);
  const totalMeatDays = meatDays.length;
  const meatFreeCount = meatFreeDays.length;
  const meatFreeAvgIndex = meatFreeCount
    ? round(computeMean(meatFreeDays.map((r) => r.index)), 1)
    : null;
  const meatFreeAvgBody = meatFreeCount
    ? round(computeMean(meatFreeDays.map((r) => Number(r.bodyComfort ?? 6))), 1)
    : null;

  // Красное мясо и завтрашнее пищеварение
  let redMeatDigestionNote = null;
  let totalAfterRed = 0;
  let heavyAfterRed = 0;
  allSorted.forEach((day) => {
    if (!(day.meatTypes || []).includes('red_meat')) return;
    const tomorrow = byDate.get(getNextKey(day.date));
    if (!tomorrow || !tomorrow.digestion || !VALID_DIGESTION.includes(tomorrow.digestion)) return;
    totalAfterRed += 1;
    if (tomorrow.digestion === 'heavy' || tomorrow.digestion === 'none') {
      heavyAfterRed += 1;
    }
  });
  if (totalAfterRed >= 2 && heavyAfterRed >= 2 && heavyAfterRed / totalAfterRed >= 0.5) {
    redMeatDigestionNote = `После красного мяса плотное пищеварение или пауза на следующий день отмечались в ${heavyAfterRed} из ${totalAfterRed} случаев.`;
  }

  // Наблюдения по кофе, энергетикам и никотину
  const stimulantNotes = [];

  const lateCoffeeSleep = [];
  const otherSleep = [];
  allSorted.forEach((day) => {
    const tomorrow = byDate.get(getNextKey(day.date));
    if (!tomorrow || !Number.isFinite(Number(tomorrow.sleepHours))) return;
    const isLateOrMany =
      (day.rituals || []).includes('coffee') &&
      (day.coffeeDetail === 'late' || day.coffeeDetail === 'many');
    if (isLateOrMany) lateCoffeeSleep.push(Number(tomorrow.sleepHours));
    else otherSleep.push(Number(tomorrow.sleepHours));
  });

  if (lateCoffeeSleep.length >= 2 && otherSleep.length >= 2) {
    const diff = round(computeMean(lateCoffeeSleep) - computeMean(otherSleep), 1);
    if (diff <= -0.4) {
      stimulantNotes.push(
        `Кофе после 15:00 или 3+ чашки сопровождаются более коротким сном следующей ночью (в среднем ${diff} ч).`
      );
    }
  }

  const moreNicotineDays = allSorted.filter(
    (r) => (r.rituals || []).includes('nicotine') && r.nicotineDetail === 'more'
  );
  if (moreNicotineDays.length >= 2) {
    const tenseCount = moreNicotineDays.filter(
      (r) => (r.rituals || []).includes('overtime') || Number(r.calm ?? 6) <= 4
    ).length;
    if (tenseCount / moreNicotineDays.length >= 0.6) {
      stimulantNotes.push(
        'Сигарет больше обычного чаще в дни переработок и высокого напряжения — это сигнал усталости нервной системы.'
      );
    }
  }

  if (totalMeatDays === 0 && stimulantNotes.length === 0 && !redMeatDigestionNote) {
    return null;
  }

  return {
    proteinGroups,
    meatFreeCount,
    meatFreeAvgIndex,
    meatFreeAvgBody,
    totalMeatDays,
    redMeatDigestionNote,
    stimulantNotes,
  };
}

/**
 * Статистика пульса покоя и связь с днями нагрузки / недосыпа
 */
export function computePulseStats(allSorted) {
  if (!Array.isArray(allSorted) || allSorted.length === 0) return null;

  const withHr = allSorted.filter(
    (r) => Number.isFinite(Number(r.restingHr)) && Number(r.restingHr) >= 35 && Number(r.restingHr) <= 180
  );
  if (withHr.length === 0) return null;

  const hrs = withHr.map((r) => Number(r.restingHr));
  const avgHr = Math.round(computeMean(hrs));
  const minHr = Math.min(...hrs);
  const maxHr = Math.max(...hrs);
  const latestHr = hrs[hrs.length - 1];

  const strainedHrs = [];
  const restedHrs = [];
  withHr.forEach((r) => {
    const rituals = r.rituals || [];
    const isStrained =
      r.wellbeing === 'sick' ||
      rituals.includes('overtime') ||
      rituals.includes('alcohol') ||
      rituals.includes('energy_drink') ||
      (Number.isFinite(Number(r.sleepHours)) && Number(r.sleepHours) < 6.5);
    if (isStrained) strainedHrs.push(Number(r.restingHr));
    else restedHrs.push(Number(r.restingHr));
  });

  let strainNote = null;
  if (strainedHrs.length >= 2 && restedHrs.length >= 2) {
    const diff = round(computeMean(strainedHrs) - computeMean(restedHrs), 1);
    if (diff >= 4) {
      strainNote = `В дни недосыпа, переработок или стимуляторов пульс покоя выше в среднем на +${Math.round(
        diff
      )} уд/мин.`;
    }
  }

  return {
    count: withHr.length,
    avgHr,
    minHr,
    maxHr,
    latestHr,
    strainNote,
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
  {
    factorImpacts,
    sleepRegression,
    trendLabel,
    analyzedDays,
    cycleStats,
    digestionStats,
    nutritionStats,
    allSeries,
    series,
    mean,
  },
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

  if (digestionStats?.consecutiveNone >= 2) {
    list.push({
      id: 'digestion_pause',
      tone: 'caution',
      title: 'Пауза в ритме пищеварения',
      text: `Стула не было уже ${digestionStats.consecutiveNone} дн. подряд — сегодня телу особенно помогут тёплая вода, спокойная еда и мягкое движение.`,
    });
  }

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

  if (list.length < 4 && digestionStats && digestionStats.loggedDays >= 4) {
    if (digestionStats.topTrigger) {
      list.push({
        id: `dig_trig_${digestionStats.topTrigger.id}`,
        tone: 'caution',
        title: `ЖКТ после «${digestionStats.topTrigger.title}»`,
        text: `На следующий день после «${digestionStats.topTrigger.title}» дискомфорт или отсутствие стула отмечались в ${digestionStats.topTrigger.issueCount} из ${digestionStats.topTrigger.totalWith} случаев.`,
      });
    } else if (
      digestionStats.indexDiff !== null &&
      digestionStats.indexDiff >= 5 &&
      digestionStats.comfortableCount >= 2 &&
      digestionStats.loggedDays - digestionStats.comfortableCount >= 2
    ) {
      list.push({
        id: 'digestion_comfort',
        tone: 'positive',
        title: 'Пищеварение и лёгкость в теле',
        text: `В дни с комфортным пищеварением общее состояние в среднем выше на +${digestionStats.indexDiff} пунктов.`,
      });
    }
  }

  if (list.length < 4 && nutritionStats) {
    if (nutritionStats.stimulantNotes && nutritionStats.stimulantNotes.length > 0) {
      list.push({
        id: 'stimulant_sleep_or_stress',
        tone: 'caution',
        title: 'Стимуляторы и нагрузка',
        text: nutritionStats.stimulantNotes[0],
      });
    } else if (nutritionStats.redMeatDigestionNote) {
      list.push({
        id: 'red_meat_digestion',
        tone: 'neutral',
        title: 'Рацион и пищеварение',
        text: nutritionStats.redMeatDigestionNote,
      });
    }
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
  {
    excludeSick = true,
    trackDigestion = true,
    trackCycle = false,
    cycleLength = 28,
    shoppingPauses = [],
  } = {}
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
  const digestionStats = trackDigestion
    ? computeDigestionStats(allSorted, recordsMap, catalog, { trackCycle, cycleLength })
    : null;
  const nutritionStats = computeNutritionAndStimulants(allSorted);
  const pulseStats = computePulseStats(allSorted);

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
    digestionStats,
    nutritionStats,
    pulseStats,
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
      if (!NON_ANCHOR_IDS.has(id)) {
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
        !NON_ANCHOR_IDS.has(f.id) &&
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
    { e: 6, c: 6, b: 6, s: 7.0, sq: 3, hr: 68, w: 'in_flow', dig: 'comfortable', cDet: 'late', nDet: 'usual', meat: ['poultry'], r: ['warm_plate', 'tea', 'work', 'coffee', 'nicotine', 'alcohol'], col: 'sage' },
    { e: 5, c: 5, b: 6, s: 6.0, sq: 2, hr: 72, w: 'tired', dig: 'loose', cDet: 'morning', nDet: 'more', meat: ['red_meat'], r: ['warm_plate', 'work', 'overtime', 'coffee', 'nicotine'], col: 'stone' },
    { e: 6, c: 7, b: 7, s: 7.5, sq: 4, hr: 64, w: 'in_flow', dig: 'heavy', cDet: 'morning', meat: ['fish'], r: ['walk', 'tea', 'presence', 'work', 'coffee'], col: 'azure' },
    { e: 7, c: 7, b: 7, s: 8.0, sq: 4, hr: 61, w: 'in_flow', dig: 'comfortable', meat: ['poultry'], r: ['movement', 'warm_plate', 'friends'], col: 'amber' },
    { e: 7, c: 8, b: 8, s: 8.0, sq: 5, hr: 59, w: 'in_flow', dig: 'comfortable', meat: ['fish'], r: ['banya', 'warm_plate', 'tea', 'intimacy'], col: 'amber' },
    { e: 9, c: 9, b: 9, s: 8.5, sq: 5, hr: 58, w: 'in_flow', dig: 'comfortable', meat: ['poultry'], r: ['walk', 'presence', 'friends'], col: 'amber', note: 'После бани спала как младенец, утром лёгкость в спине и ясная голова.' },
    { e: 8, c: 8, b: 8, s: 7.5, sq: 4, hr: 62, w: 'in_flow', dig: 'comfortable', cDet: 'morning', meat: [], r: ['garden', 'warm_plate', 'work', 'coffee'], col: 'sage' },
    { e: 6, c: 5, b: 6, s: 6.0, sq: 2, hr: 73, w: 'tired', dig: 'comfortable', cDet: 'many', nDet: 'more', meat: ['poultry'], r: ['mindful_shopping', 'work', 'overtime', 'coffee', 'nicotine', 'alcohol'], col: 'indigo', snapshots: [
      { id: 'd_s1', time: '13:30', index: 76, wellbeing: 'in_flow' },
      { id: 'd_s2', time: '22:15', index: 46, wellbeing: 'tired' },
    ] },
    { e: 5, c: 5, b: 5, s: 5.5, sq: 2, hr: 75, w: 'tired', dig: 'loose', nDet: 'more', meat: [], r: ['tea', 'work', 'overtime', 'energy_drink', 'nicotine'], col: 'stone' },
    { e: 3, c: 5, b: 3, s: 6.5, sq: 2, hr: 76, w: 'sick', dig: 'none', meat: [], r: ['warm_plate'], col: 'stone', sym: ['Першит горло', 'Слабость / ломота'] },
    { e: 4, c: 6, b: 4, s: 8.5, sq: 3, hr: 72, w: 'sick', dig: 'none', meat: ['red_meat', 'offal'], r: ['warm_plate', 'tea'], col: 'sage', sym: ['Слабость / ломота'] },
    { e: 6, c: 7, b: 6, s: 8.0, sq: 4, hr: 64, w: 'in_flow', dig: 'heavy', meat: ['fish'], r: ['walk', 'warm_plate', 'work'], col: 'sage' },
    { e: 7, c: 7, b: 7, s: 7.5, sq: 4, hr: 60, w: 'in_flow', dig: 'comfortable', cDet: 'morning', meat: ['fish'], r: ['banya', 'tea', 'intimacy', 'friends', 'coffee'], col: 'azure' },
    { e: 9, c: 8, b: 9, s: 8.5, sq: 5, hr: 59, w: 'in_flow', dig: 'comfortable', meat: ['poultry'], r: ['movement', 'walk', 'warm_plate'], col: 'amber' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, hr: 61, w: 'in_flow', dig: 'comfortable', cDet: 'morning', meat: ['fish'], r: ['presence', 'tea', 'work', 'coffee'], col: 'azure' },
    { e: 7, c: 6, b: 7, s: 6.5, sq: 3, hr: 69, w: 'in_flow', dig: 'comfortable', cDet: 'late', nDet: 'usual', meat: ['poultry'], r: ['warm_plate', 'mindful_shopping', 'work', 'coffee', 'nicotine', 'alcohol'], col: 'indigo' },
    { e: 6, c: 6, b: 6, s: 6.5, sq: 3, hr: 71, w: 'tired', dig: 'loose', meat: ['red_meat'], r: ['walk', 'work', 'overtime', 'energy_drink'], col: 'stone' },
    { e: 7, c: 8, b: 7, s: 7.5, sq: 4, hr: 65, w: 'in_flow', dig: 'heavy', cDet: 'morning', meat: ['poultry'], r: ['movement', 'warm_plate', 'presence', 'work', 'coffee'], col: 'sage' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, hr: 60, w: 'in_flow', dig: 'comfortable', meat: ['fish'], r: ['banya', 'warm_plate', 'intimacy'], col: 'amber', snapshots: [
      { id: 'd_s3', time: '12:00', index: 62, wellbeing: 'tired' },
      { id: 'd_s4', time: '21:30', index: 86, wellbeing: 'in_flow' },
    ] },
    { e: 9, c: 9, b: 9, s: 9.0, sq: 5, hr: 58, w: 'in_flow', dig: 'comfortable', meat: [], r: ['walk', 'garden', 'tea', 'friends'], col: 'amber', note: 'Вечер без телефона, травяной чай и долгая прогулка в тишине.' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, hr: 61, w: 'in_flow', dig: 'comfortable', meat: ['fish'], r: ['movement', 'presence', 'warm_plate'], col: 'azure' },
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
      restingHr: t.hr ?? null,
      digestion: t.dig || 'comfortable',
      coffeeDetail: t.cDet || null,
      nicotineDetail: t.nDet || null,
      meatTypes: t.meat || [],
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
