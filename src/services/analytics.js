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

/**
 * 1. Композитный индекс состояния W ∈ [0, 100]
 * W = 10 * (0.32*E + 0.28*C + 0.25*B + 0.15*(2*Q_sleep))
 */
export function computeDayIndex(record) {
  if (!record) return null;
  const e = Number(record.energy ?? 6);
  const c = Number(record.calm ?? 6);
  const b = Number(record.bodyComfort ?? 6);
  const q = Number(record.sleepQuality ?? 3);
  const raw = 10 * (0.32 * e + 0.28 * c + 0.25 * b + 0.15 * (q * 2));
  return Math.max(0, Math.min(100, Math.round(raw)));
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

/**
 * Генерация 1–3 живых текстовых наблюдений человеческим языком («Наблюдение дня»)
 */
export function generateNarrativeInsights(
  { factorImpacts, sleepRegression, trendLabel, analyzedDays, cycleStats },
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

  return list.slice(0, 3);
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

  const indices = activeSeries.map((s) => s.index);
  const mean = indices.length ? round(computeMean(indices), 1) : null;
  const stdDev = indices.length >= 2 ? round(computeStdDev(indices), 1) : null;
  const cv = mean && stdDev !== null && mean > 0 ? round((stdDev / mean) * 100, 1) : null;

  // Линейная регрессия тренда во времени: W(t) = a + k·t
  const timeXs = activeSeries.map((_, i) => i);
  const trendRegression = activeSeries.length >= 2 ? computeLinearRegression(timeXs, indices) : null;

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

  let stabilityLabel = 'Собираем наблюдения';
  if (stdDev !== null) {
    if (stdDev < 8) stabilityLabel = 'Ровный ритм';
    else if (stdDev <= 14) stabilityLabel = 'Умеренные перепады';
    else stabilityLabel = 'Заметные качели';
  }

  let trendLabel = 'Нужно больше дней для оценки';
  if (trendRegression) {
    if (trendRegression.k >= 0.25) trendLabel = 'Состояние постепенно растёт';
    else if (trendRegression.k <= -0.25) trendLabel = 'Постепенно накапливается усталость';
    else trendLabel = 'Ритм держится ровно';
  }

  const cycleStats = trackCycle
    ? computeCyclePhaseStats(activeSeries, recordsMap, cycleLength)
    : null;

  const baseResult = {
    totalDays: allSorted.length,
    analyzedDays: activeSeries.length,
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
  };

  return {
    ...baseResult,
    insights: generateNarrativeInsights(baseResult, shoppingPauses, recordsMap),
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
    { e: 6, c: 6, b: 6, s: 7.0, sq: 3, w: 'in_flow', r: ['warm_plate', 'tea', 'alcohol'], col: 'sage' },
    { e: 5, c: 5, b: 6, s: 6.0, sq: 2, w: 'tired', r: ['warm_plate'], col: 'stone' },
    { e: 6, c: 7, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['walk', 'tea', 'presence'], col: 'azure' },
    { e: 7, c: 7, b: 7, s: 8.0, sq: 4, w: 'in_flow', r: ['movement', 'warm_plate'], col: 'amber' },
    { e: 7, c: 8, b: 8, s: 8.0, sq: 5, w: 'in_flow', r: ['banya', 'warm_plate', 'tea', 'intimacy'], col: 'amber' },
    { e: 9, c: 9, b: 9, s: 8.5, sq: 5, w: 'in_flow', r: ['walk', 'presence'], col: 'amber' },
    { e: 8, c: 8, b: 8, s: 7.5, sq: 4, w: 'in_flow', r: ['garden', 'warm_plate'], col: 'sage' },
    { e: 6, c: 5, b: 6, s: 6.0, sq: 2, w: 'tired', r: ['mindful_shopping', 'alcohol'], col: 'indigo' },
    { e: 5, c: 5, b: 5, s: 5.5, sq: 2, w: 'tired', r: ['tea'], col: 'stone' },
    { e: 3, c: 5, b: 3, s: 6.5, sq: 2, w: 'sick', r: ['warm_plate'], col: 'stone', sym: ['Першит горло', 'Слабость / ломота'] },
    { e: 4, c: 6, b: 4, s: 8.5, sq: 3, w: 'sick', r: ['warm_plate', 'tea'], col: 'sage', sym: ['Слабость / ломота'] },
    { e: 6, c: 7, b: 6, s: 8.0, sq: 4, w: 'in_flow', r: ['walk', 'warm_plate'], col: 'sage' },
    { e: 7, c: 7, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['banya', 'tea', 'intimacy'], col: 'azure' },
    { e: 9, c: 8, b: 9, s: 8.5, sq: 5, w: 'in_flow', r: ['movement', 'walk', 'warm_plate'], col: 'amber' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, w: 'in_flow', r: ['presence', 'tea'], col: 'azure' },
    { e: 7, c: 6, b: 7, s: 6.5, sq: 3, w: 'in_flow', r: ['warm_plate', 'mindful_shopping', 'alcohol'], col: 'indigo' },
    { e: 6, c: 6, b: 6, s: 6.5, sq: 3, w: 'tired', r: ['walk'], col: 'stone' },
    { e: 7, c: 8, b: 7, s: 7.5, sq: 4, w: 'in_flow', r: ['movement', 'warm_plate', 'presence'], col: 'sage' },
    { e: 8, c: 8, b: 8, s: 8.0, sq: 4, w: 'in_flow', r: ['banya', 'warm_plate', 'intimacy'], col: 'amber' },
    { e: 9, c: 9, b: 9, s: 9.0, sq: 5, w: 'in_flow', r: ['walk', 'garden', 'tea'], col: 'amber' },
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
      note: '',
      isSaved: true,
      updatedAt: dt.toISOString(),
    };
  });

  return demo;
}
