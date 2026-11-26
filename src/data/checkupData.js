export const BASIC_LAB_MARKERS = [
  {
    id: 'hemoglobin',
    title: 'Гемоглобин',
    unit: 'г/л',
    placeholder: '132',
    group: 'Общий анализ крови',
    hint: 'Кислород и общий тонус',
  },
  {
    id: 'rbc',
    title: 'Эритроциты',
    unit: '×10¹²/л',
    placeholder: '4.5',
    group: 'Общий анализ крови',
    hint: 'Красные клетки крови',
  },
  {
    id: 'wbc',
    title: 'Лейкоциты',
    unit: '×10⁹/л',
    placeholder: '6.2',
    group: 'Общий анализ крови',
    hint: 'Иммунный отклик',
  },
  {
    id: 'platelets',
    title: 'Тромбоциты',
    unit: '×10⁹/л',
    placeholder: '250',
    group: 'Общий анализ крови',
    hint: 'Свёртываемость крови',
  },
  {
    id: 'hematocrit',
    title: 'Гематокрит',
    unit: '%',
    placeholder: '39',
    group: 'Общий анализ крови',
    hint: 'Густота крови и водный баланс',
  },
  {
    id: 'esr',
    title: 'СОЭ',
    unit: 'мм/ч',
    placeholder: '8',
    group: 'Общий анализ крови',
    hint: 'Спокойствие общего фона',
  },
  {
    id: 'glucose',
    title: 'Глюкоза',
    unit: 'ммоль/л',
    placeholder: '4.9',
    group: 'Базовая биохимия',
    hint: 'Углеводный обмен',
  },
  {
    id: 'cholesterol',
    title: 'Холестерин общий',
    unit: 'ммоль/л',
    placeholder: '4.8',
    group: 'Базовая биохимия',
    hint: 'Липидный обмен',
  },
  {
    id: 'ferritin',
    title: 'Ферритин',
    unit: 'мкг/л',
    placeholder: '45',
    group: 'По желанию',
    hint: 'Запас железа (если сдавали)',
  },
];

export const EXAMS_CATALOG = [
  {
    id: 'ecg',
    title: 'ЭКГ',
    desc: 'Ритм и проводящая система сердца',
    defaultMonths: 12,
  },
  {
    id: 'fluorography',
    title: 'Флюорография',
    desc: 'Плановый контроль лёгких',
    defaultMonths: 12,
  },
  {
    id: 'specialist',
    title: 'Гинеколог',
    altTitle: 'Уролог',
    desc: 'Плановый профильный осмотр',
    defaultMonths: 6,
  },
];

export const DEFAULT_CHECKUPS_DATA = {
  specialistRole: 'gynecologist', // 'gynecologist' | 'urologist'
  exams: {
    ecg: { lastDate: '', intervalMonths: 12, note: '', history: [] },
    fluorography: { lastDate: '', intervalMonths: 12, note: '', history: [] },
    specialist: { lastDate: '', intervalMonths: 6, note: '', history: [] },
  },
  labEntries: [],
  customMarkers: [],
};

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function parseLocalDate(dateKey) {
  const [y, m, d] = String(dateKey || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Преобразует пользовательский ввод числа с точкой или запятой в корректное число >= 0.
 */
export function parseDecimalInput(raw) {
  const normalized = String(raw ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Человекочитаемый срок с момента последнего обследования или анализа.
 */
export function formatCheckupAge(dateKey, todayKey) {
  if (!dateKey || !todayKey) return '';
  const entryDt = parseLocalDate(dateKey);
  const todayDt = parseLocalDate(todayKey);
  if (!entryDt || !todayDt) return '';

  const diffDays = Math.round((todayDt.getTime() - entryDt.getTime()) / 86400000);
  if (diffDays <= 0) return 'сегодня';
  if (diffDays < 30) return `${diffDays} дн. назад`;
  if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `${months} мес. назад`;
  }

  const totalMonths = Math.floor(diffDays / 30.4375);
  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;
  return remMonths > 0 ? `${years} г. ${remMonths} мес. назад` : `${years} г. назад`;
}

/**
 * Спокойный расчёт планового ориентира следующего визита без оценочных формулировок.
 */
export function computeDueStatus(lastDate, intervalMonths, todayKey) {
  if (!lastDate) {
    return { state: 'unset', label: 'Не указано' };
  }
  const baseDt = parseLocalDate(lastDate);
  const todayDt = parseLocalDate(todayKey);
  if (!baseDt || !todayDt) {
    return { state: 'unset', label: 'Не указано' };
  }

  const months = Math.max(1, Number(intervalMonths || 12));
  const origDay = baseDt.getDate();
  const dueDt = new Date(baseDt.getFullYear(), baseDt.getMonth() + months, 1);
  const maxDayInMonth = new Date(dueDt.getFullYear(), dueDt.getMonth() + 1, 0).getDate();
  dueDt.setDate(Math.min(origDay, maxDayInMonth));

  const daysLeft = Math.round((dueDt.getTime() - todayDt.getTime()) / 86400000);
  if (daysLeft < 0) {
    return { state: 'due', label: 'Пора запланировать' };
  }
  if (daysLeft <= 30) {
    return { state: 'soon', label: 'Скоро по плану' };
  }

  return {
    state: 'ok',
    label: `Планово: ${MONTHS_SHORT[dueDt.getMonth()]} ${dueDt.getFullYear()}`,
  };
}
