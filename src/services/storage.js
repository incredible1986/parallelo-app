/**
 * Parallelo v2 Storage Service
 * - Хранение записей по локальной календарной дате (YYYY-MM-DD) без обрезки истории.
 * - Безопасная миграция из v1 без localStorage.clear().
 * - Полный JSON экспорт и импорт для защиты данных пользователя.
 */

const KEYS = {
  RECORDS: 'parallelo_v2_records',
  PROFILE: 'parallelo_v2_profile',
  PAUSES: 'parallelo_v2_shopping_pauses',
  UI: 'parallelo_v2_ui',
  MIGRATED: 'parallelo_v2_migrated_v1',
};

export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTHS_GEN = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function formatShortRuDate(dateKey) {
  const d = parseDateKey(dateKey);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatFullRuDate(dateKey) {
  const d = parseDateKey(dateKey);
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function getMonthTitleRu(year, monthIndex) {
  return `${MONTHS_FULL[monthIndex]} ${year}`;
}

export function createEmptyDayRecord(dateKey = getLocalDateKey()) {
  return {
    date: dateKey,
    energy: 6,
    calm: 6,
    bodyComfort: 6,
    sleepHours: 7.5,
    sleepQuality: 3,
    restingHr: null,
    wellbeing: 'in_flow', // 'in_flow' | 'tired' | 'sick'
    symptoms: [],
    rituals: [],
    workouts: [],
    colorId: 'sage',
    questionTag: null,
    feltAlive: false,
    note: '',
    isSaved: false,
    updatedAt: null,
  };
}

export const DEFAULT_PROFILE = {
  name: '',
  season: 'apples',
  height: '',
  weight: '',
  excludeSickFromBaseline: true,
  themeId: 'obsidian',
};

export const StorageService = {
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Storage read failed:', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage write failed:', e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage remove failed:', e);
    }
  },

  /**
   * Безопасная разовая миграция из v1 (не удаляет чужие ключи и не вызывает clear()).
   */
  migrateFromV1IfNeeded() {
    if (this.get(KEYS.MIGRATED, false)) return;

    const existingRecords = this.get(KEYS.RECORDS, {});
    const v1History = this.get('parallelo_history', []);
    const v1Rituals = this.get('parallelo_logged_rituals', []);
    const v1Workouts = this.get('parallelo_workouts', []);
    const v1Profile = this.get('parallelo_user_profile', null);
    const v1Pauses = this.get('parallelo_shopping_pauses', []);

    if (Array.isArray(v1History) && v1History.length > 0) {
      v1History.forEach((h) => {
        if (!h || !h.date) return;
        const dateKey = String(h.date).slice(0, 10);
        if (!existingRecords[dateKey]) {
          const base = createEmptyDayRecord(dateKey);
          const colorMap = {
            '#F59E0B': 'amber',
            '#1E3A5F': 'azure',
            '#4D7C6F': 'sage',
            '#8B5CF6': 'indigo',
            '#78716C': 'stone',
          };
          const wellbeing = h.wellbeing || 'in_flow';
          const defaultScore = wellbeing === 'sick' ? 4 : wellbeing === 'tired' ? 5 : 7;
          existingRecords[dateKey] = {
            ...base,
            energy: defaultScore,
            calm: defaultScore,
            bodyComfort: wellbeing === 'sick' ? 3 : defaultScore,
            wellbeing,
            symptoms: Array.isArray(h.symptoms) ? h.symptoms : [],
            colorId: colorMap[h.color] || 'sage',
            questionTag: h.tag || null,
            feltAlive: Boolean(h.feltAlive),
            note: h.note || '',
            isSaved: true,
            updatedAt: new Date().toISOString(),
          };
        }
      });
    }

    // Привязываем v1 ритуалы к сегодняшней дате, если они были отмечены
    if (Array.isArray(v1Rituals) && v1Rituals.length > 0) {
      const todayKey = getLocalDateKey();
      const target = existingRecords[todayKey] || createEmptyDayRecord(todayKey);
      const validIds = v1Rituals.map((id) => {
        if (id === 'silent_walk') return 'walk';
        if (id === 'tea_reading') return 'tea';
        return id;
      });
      target.rituals = Array.from(new Set([...(target.rituals || []), ...validIds]));
      existingRecords[todayKey] = target;
    }

    if (Array.isArray(v1Workouts) && v1Workouts.length > 0) {
      v1Workouts.forEach((w) => {
        const dateKey = w.date ? getLocalDateKey(new Date(w.date)) : getLocalDateKey();
        const target = existingRecords[dateKey] || createEmptyDayRecord(dateKey);
        target.workouts = [...(target.workouts || []), w];
        if (!target.rituals.includes('movement')) {
          target.rituals = [...target.rituals, 'movement'];
        }
        existingRecords[dateKey] = target;
      });
    }

    this.set(KEYS.RECORDS, existingRecords);

    if (v1Profile && !this.get(KEYS.PROFILE, null)) {
      this.set(KEYS.PROFILE, {
        ...DEFAULT_PROFILE,
        name: v1Profile.name || '',
        season: v1Profile.season || 'apples',
        height: v1Profile.height || '',
        weight: v1Profile.weight || '',
      });
    }

    if (Array.isArray(v1Pauses) && v1Pauses.length > 0 && this.get(KEYS.PAUSES, []).length === 0) {
      const migratedPauses = v1Pauses.map((p, idx) => ({
        id: `migrated_${idx}_${Date.now()}`,
        item: p.item || 'Покупка',
        feeling: p.feeling || null,
        createdAt: p.timestamp || new Date().toISOString(),
        status: 'waiting',
      }));
      this.set(KEYS.PAUSES, migratedPauses);
    }

    this.set(KEYS.MIGRATED, true);
  },

  getAllRecords() {
    return this.get(KEYS.RECORDS, {});
  },

  getDayRecord(dateKey = getLocalDateKey()) {
    const all = this.getAllRecords();
    return all[dateKey] ? { ...createEmptyDayRecord(dateKey), ...all[dateKey] } : createEmptyDayRecord(dateKey);
  },

  saveDayRecord(dateKey, partialOrFull) {
    const all = this.getAllRecords();
    const current = all[dateKey] ? { ...createEmptyDayRecord(dateKey), ...all[dateKey] } : createEmptyDayRecord(dateKey);
    const next = {
      ...current,
      ...partialOrFull,
      date: dateKey,
      updatedAt: new Date().toISOString(),
    };
    all[dateKey] = next;
    this.set(KEYS.RECORDS, all);
    return next;
  },

  getProfile() {
    return { ...DEFAULT_PROFILE, ...this.get(KEYS.PROFILE, {}) };
  },

  saveProfile(profile) {
    const next = { ...this.getProfile(), ...profile };
    this.set(KEYS.PROFILE, next);
    return next;
  },

  getShoppingPauses() {
    return this.get(KEYS.PAUSES, []);
  },

  saveShoppingPauses(pauses) {
    this.set(KEYS.PAUSES, pauses);
    return pauses;
  },

  getUiPrefs() {
    return this.get(KEYS.UI, { welcomeDismissed: false });
  },

  saveUiPrefs(prefs) {
    const next = { ...this.getUiPrefs(), ...prefs };
    this.set(KEYS.UI, next);
    return next;
  },

  exportBackup() {
    return JSON.stringify(
      {
        app: 'Parallelo',
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        profile: this.getProfile(),
        records: this.getAllRecords(),
        shoppingPauses: this.getShoppingPauses(),
      },
      null,
      2
    );
  },

  importBackup(rawJson) {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || !parsed.records) {
      throw new Error('Неверный формат файла резервной копии Parallelo.');
    }
    const mergedRecords = { ...this.getAllRecords(), ...parsed.records };
    this.set(KEYS.RECORDS, mergedRecords);
    if (parsed.profile) {
      this.set(KEYS.PROFILE, { ...this.getProfile(), ...parsed.profile });
    }
    if (Array.isArray(parsed.shoppingPauses)) {
      this.set(KEYS.PAUSES, parsed.shoppingPauses);
    }
    return Object.keys(mergedRecords).length;
  },

  resetAllParalleloData() {
    Object.values(KEYS).forEach((k) => {
      if (k !== KEYS.MIGRATED) this.remove(k);
    });
  },
};
