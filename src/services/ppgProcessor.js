/**
 * Алгоритм фотоплетизмографии (PPG) по кадрам с камеры смартфона.
 * Чистые функции без зависимости от DOM — легко тестируются и безопасны для приватности.
 */

function computeStd(values) {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Нормализованная автокорреляция отфильтрованной волны вблизи ожидаемого периода сердечного ритма.
 * Помогает надёжно отличать реальную периодическую пульсовую волну от случайного шума.
 */
function computeBestPeriodCorrelation(filtered, meanIbi) {
  if (!filtered || filtered.length < 20 || !Number.isFinite(meanIbi)) return 0;
  const lags = [meanIbi * 0.94, meanIbi, meanIbi * 1.06];
  let best = -1;

  lags.forEach((lag) => {
    let num = 0;
    let normA = 0;
    let normB = 0;
    let pairs = 0;
    let j = 0;

    for (let i = 0; i < filtered.length; i++) {
      const targetT = filtered[i].t + lag;
      while (j < filtered.length && filtered[j].t < targetT) {
        j += 1;
      }
      if (j >= filtered.length) break;
      const cand =
        j > 0 && Math.abs(filtered[j - 1].t - targetT) < Math.abs(filtered[j].t - targetT)
          ? filtered[j - 1]
          : filtered[j];
      if (Math.abs(cand.t - targetT) <= 50) {
        const a = filtered[i].val;
        const b = cand.val;
        num += a * b;
        normA += a * a;
        normB += b * b;
        pairs += 1;
      }
    }

    if (pairs >= 15 && normA > 0 && normB > 0) {
      const corr = num / Math.sqrt(normA * normB);
      if (corr > best) best = corr;
    }
  });

  return best;
}

/**
 * Проверяет, приложен ли палец к объективу камеры по RGBA-буферу кадра.
 */
export function evaluateFrameFinger(rgbaData, width = 40, height = 40) {
  const pixelCount = Math.floor((rgbaData?.length || 0) / 4);
  if (!pixelCount || width <= 0 || height <= 0) {
    return { meanR: 0, meanG: 0, meanB: 0, spatialStdR: 0, isFinger: false, tooDark: true };
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumR2 = 0;

  for (let i = 0; i < rgbaData.length; i += 4) {
    const r = rgbaData[i];
    const g = rgbaData[i + 1];
    const b = rgbaData[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    sumR2 += r * r;
  }

  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const varianceR = Math.max(0, sumR2 / pixelCount - meanR * meanR);
  const spatialStdR = Math.sqrt(varianceR);

  const tooDark = meanR < 42;
  const tooBrightFlat = meanR > 252 && meanG > 248 && meanB > 240;
  const isFinger =
    !tooDark &&
    !tooBrightFlat &&
    spatialStdR < 32 &&
    meanR > meanB * 1.18 &&
    (meanR > meanG * 1.12 || meanR > 185);

  return {
    meanR,
    meanG,
    meanB,
    spatialStdR,
    isFinger,
    tooDark,
  };
}

/**
 * Оценивает пульс (уд/мин) и формирует нормализованную волну для графика
 * по временному ряду { t: ms, v: meanR }.
 */
export function analyzePpgSamples(samples) {
  if (!Array.isArray(samples) || samples.length < 40) {
    return { bpm: null, quality: 'calibrating', beatsCount: 0, wavePoints: [] };
  }

  const spanMs = samples[samples.length - 1].t - samples[0].t;
  if (spanMs < 2500) {
    return { bpm: null, quality: 'calibrating', beatsCount: 0, wavePoints: [] };
  }

  // Пропускаем первые 1.5 сек стабилизации автоэкспозиции камеры
  const settleEnd = samples[0].t + 1500;
  const usableIndices = [];
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].t >= settleEnd) usableIndices.push(i);
  }
  if (usableIndices.length < 20) {
    return { bpm: null, quality: 'calibrating', beatsCount: 0, wavePoints: [] };
  }

  // 1. Высокочастотная фильтрация (вычитание скользящего среднего за 1300 мс) + инверсия знака
  const detrended = usableIndices.map((idx) => {
    const tCenter = samples[idx].t;
    let sum = 0;
    let cnt = 0;
    for (let j = idx; j >= 0 && tCenter - samples[j].t <= 650; j--) {
      sum += samples[j].v;
      cnt += 1;
    }
    for (let j = idx + 1; j < samples.length && samples[j].t - tCenter <= 650; j++) {
      sum += samples[j].v;
      cnt += 1;
    }
    const localMean = cnt > 0 ? sum / cnt : samples[idx].v;
    return { t: tCenter, x: localMean - samples[idx].v };
  });

  // 2. Низкочастотное сглаживание (окно 170 мс, ±85 мс)
  const filtered = detrended.map((pt, i) => {
    let sum = pt.x;
    let cnt = 1;
    for (let j = i - 1; j >= 0 && pt.t - detrended[j].t <= 85; j--) {
      sum += detrended[j].x;
      cnt += 1;
    }
    for (let j = i + 1; j < detrended.length && detrended[j].t - pt.t <= 85; j++) {
      sum += detrended[j].x;
      cnt += 1;
    }
    return { t: pt.t, val: sum / cnt };
  });

  // Волна за последние 3.5 сек для SVG-осциллографа
  const latestT = filtered[filtered.length - 1].t;
  const recentWave = filtered.filter((p) => p.t >= latestT - 3500).slice(-90);
  const maxAbs = Math.max(0.15, ...recentWave.map((p) => Math.abs(p.val)));
  const wavePoints = recentWave.map((p) =>
    Math.max(-1, Math.min(1, Number((p.val / maxAbs).toFixed(3))))
  );

  // 3. Проверка выраженности амплитуды волны
  const values = filtered.map((p) => p.val);
  const ampStd = computeStd(values);
  if (ampStd < 0.06) {
    return { bpm: null, quality: 'weak_pulse', beatsCount: 0, wavePoints };
  }

  // 4. Поиск пиков пульсовой волны (выше 0.32 * ampStd и максимум в окрестности ±270 мс)
  const peaks = [];
  const minThreshold = 0.32 * ampStd;

  for (let i = 1; i < filtered.length - 1; i++) {
    const curr = filtered[i];
    if (curr.val <= minThreshold) continue;
    if (curr.val < filtered[i - 1].val || curr.val < filtered[i + 1].val) continue;

    let isLocalMax = true;
    for (let j = i - 1; j >= 0 && curr.t - filtered[j].t <= 270; j--) {
      if (filtered[j].val > curr.val) {
        isLocalMax = false;
        break;
      }
    }
    if (!isLocalMax) continue;

    for (let j = i + 1; j < filtered.length && filtered[j].t - curr.t <= 270; j++) {
      if (filtered[j].val > curr.val) {
        isLocalMax = false;
        break;
      }
    }
    if (!isLocalMax) continue;

    const prevPeak = peaks[peaks.length - 1];
    if (prevPeak && curr.t - prevPeak.t < 270) {
      if (curr.val > prevPeak.val) peaks[peaks.length - 1] = curr;
    } else {
      peaks.push(curr);
    }
  }

  // 5. Фильтрация межпульсовых интервалов (IBI: 40..176 уд/мин)
  const ibis = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = peaks[i].t - peaks[i - 1].t;
    if (dt >= 340 && dt <= 1500) {
      ibis.push(dt);
    }
  }

  if (ibis.length < 3) {
    return { bpm: null, quality: 'calibrating', beatsCount: ibis.length, wavePoints };
  }

  const sortedIbis = [...ibis].sort((a, b) => a - b);
  const medianIbi = sortedIbis[Math.floor(sortedIbis.length / 2)];
  const inliers = ibis.filter((d) => Math.abs(d - medianIbi) / medianIbi <= 0.24);

  if (inliers.length < 3) {
    return { bpm: null, quality: 'calibrating', beatsCount: inliers.length, wavePoints };
  }

  const meanIbi = inliers.reduce((s, v) => s + v, 0) / inliers.length;
  const stdIbi = computeStd(inliers);
  const cv = meanIbi > 0 ? stdIbi / meanIbi : 1;
  const inlierRatio = inliers.length / ibis.length;

  if (cv > 0.2 || inlierRatio < 0.55) {
    return { bpm: null, quality: 'unstable', beatsCount: inliers.length, wavePoints };
  }

  const periodCorr = computeBestPeriodCorrelation(filtered, meanIbi);
  if (periodCorr < 0.35) {
    return { bpm: null, quality: 'unstable', beatsCount: inliers.length, wavePoints };
  }

  const bpm = Math.max(40, Math.min(175, Math.round(60000 / meanIbi)));
  const quality =
    inliers.length >= 5 && cv <= 0.13 && inlierRatio >= 0.7 && periodCorr >= 0.5
      ? 'good'
      : 'fair';

  return {
    bpm,
    quality,
    beatsCount: inliers.length,
    wavePoints,
  };
}
