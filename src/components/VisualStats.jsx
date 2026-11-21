import React, { useState } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';

/**
 * Наглядная статистика Parallelo (Без вины, с фокусом на визуальную красоту)
 * 1. 30-дневный цветовой ковёр месяца
 * 2. График глубокого сна и связи с баней
 * 3. Распределение якорей и ритуалов
 * 4. Индекс истинного присутствия
 */
export function VisualStats({ activeTheme }) {
  const [period, setPeriod] = useState('month'); // 'week' | 'month'
  const [hoveredDay, setHoveredDay] = useState(null);

  // 30 дней месяца с цветами и ритуалами
  const monthData = [
    { day: 1, color: '#F59E0B', mood: 'Янтарь', ritual: 'Тёплая тарелка', sleep: 7.2, deep: 1.2 },
    { day: 2, color: '#1E3A5F', mood: 'Лазурь', ritual: 'Прогулка', sleep: 7.0, deep: 1.1 },
    { day: 3, color: '#4D7C6F', mood: 'Шалфей', ritual: 'Чтение', sleep: 6.8, deep: 1.0 },
    { day: 4, color: '#8B5CF6', mood: 'Лаванда', ritual: 'Чай', sleep: 7.5, deep: 1.3 },
    { day: 5, color: '#78716C', mood: 'Камень', ritual: 'Одуванчик', sleep: 6.0, deep: 0.8 },
    { day: 6, color: '#F59E0B', mood: 'Янтарь', ritual: 'Баня и пар', sleep: 8.2, deep: 2.1, isBanya: true },
    { day: 7, color: '#F59E0B', mood: 'Янтарь', ritual: 'Прогулка', sleep: 8.0, deep: 1.9 },
    { day: 8, color: '#1E3A5F', mood: 'Лазурь', ritual: 'Тёплая тарелка', sleep: 7.1, deep: 1.2 },
    { day: 9, color: '#4D7C6F', mood: 'Шалфей', ritual: 'Чтение', sleep: 7.3, deep: 1.3 },
    { day: 10, color: '#F59E0B', mood: 'Янтарь', ritual: 'Прогулка', sleep: 7.4, deep: 1.4 },
    { day: 11, color: '#8B5CF6', mood: 'Лаванда', ritual: 'Чай', sleep: 7.0, deep: 1.1 },
    { day: 12, color: '#78716C', mood: 'Камень', ritual: 'Сброс кокона', sleep: 6.5, deep: 0.9 },
    { day: 13, color: '#F59E0B', mood: 'Янтарь', ritual: 'Баня и пар', sleep: 8.4, deep: 2.0, isBanya: true },
    { day: 14, color: '#F59E0B', mood: 'Янтарь', ritual: 'Тёплая тарелка', sleep: 8.1, deep: 1.8 },
    { day: 15, color: '#1E3A5F', mood: 'Лазурь', ritual: 'Прогулка', sleep: 7.2, deep: 1.2 },
    { day: 16, color: '#4D7C6F', mood: 'Шалфей', ritual: 'Чтение', sleep: 7.5, deep: 1.3 },
    { day: 17, color: '#F59E0B', mood: 'Янтарь', ritual: 'Тёплая тарелка', sleep: 7.6, deep: 1.4 },
    { day: 18, color: '#8B5CF6', mood: 'Лаванда', ritual: 'Чай', sleep: 7.2, deep: 1.2 },
    { day: 19, color: '#78716C', mood: 'Камень', ritual: 'Одуванчик', sleep: 6.2, deep: 0.8 },
    { day: 20, color: '#F59E0B', mood: 'Янтарь', ritual: 'Баня и пар', sleep: 8.5, deep: 2.2, isBanya: true },
    { day: 21, color: '#F59E0B', mood: 'Янтарь', ritual: 'Баня и пар', sleep: 8.2, deep: 1.9, isBanya: true },
    { day: 22, color: '#1E3A5F', mood: 'Лазурь', ritual: 'Прогулка', sleep: 7.5, deep: 1.3 },
    { day: 23, color: '#4D7C6F', mood: 'Шалфей', ritual: 'Чтение', sleep: 7.1, deep: 1.2 },
    { day: 24, color: '#F59E0B', mood: 'Янтарь', ritual: 'Тёплая тарелка', sleep: 7.8, deep: 1.5 },
    { day: 25, color: '#8B5CF6', mood: 'Лаванда', ritual: 'Чай', sleep: 7.3, deep: 1.3 },
    { day: 26, color: '#F59E0B', mood: 'Янтарь', ritual: 'Прогулка', sleep: 7.4, deep: 1.4 },
    { day: 27, color: '#78716C', mood: 'Камень', ritual: 'Сброс кокона', sleep: 6.7, deep: 0.9 },
    { day: 28, color: '#F59E0B', mood: 'Янтарь', ritual: 'Баня и пар', sleep: 8.6, deep: 2.1, isBanya: true },
    { day: 29, color: '#4D7C6F', mood: 'Шалфей', ritual: 'Чтение', sleep: 7.7, deep: 1.4 },
    { day: 30, color: '#F59E0B', mood: 'Янтарь', ritual: 'Тёплая тарелка', sleep: 7.9, deep: 1.6 },
  ];

  const weekSleepData = [
    { day: 'Пн', deep: 1.2, total: 7.1, banya: false },
    { day: 'Вт', deep: 1.1, total: 6.9, banya: false },
    { day: 'Ср', deep: 1.3, total: 7.3, banya: false },
    { day: 'Чт', deep: 1.0, total: 6.8, banya: false },
    { day: 'Пт', deep: 1.2, total: 7.0, banya: false },
    { day: 'Сб', deep: 2.1, total: 8.5, banya: true },
    { day: 'Вс', deep: 1.9, total: 8.2, banya: true },
  ];

  return (
    <div className="space-y-5">
      {/* Шапка статистики и переключатель */}
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
            style={{ color: activeTheme.textSecondary }}
          >
            Наглядная статистика
          </span>
          <h3
            className="text-lg font-serif font-medium"
            style={{ color: activeTheme.textPrimary }}
          >
            Сенсорная карта и ритмы
          </h3>
        </div>

        <div className="flex p-0.5 rounded-xl bg-black/5 text-[11px]">
          <button
            onClick={() => setPeriod('week')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              period === 'week' ? 'bg-white shadow-xs font-medium' : 'opacity-60'
            }`}
            style={{ color: activeTheme.textPrimary }}
          >
            7 дней
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              period === 'month' ? 'bg-white shadow-xs font-medium' : 'opacity-60'
            }`}
            style={{ color: activeTheme.textPrimary }}
          >
            30 дней
          </button>
        </div>
      </div>

      {/* 1. ЦВЕТОВОЙ КОВЁР (Мозаика дней месяца по Лео Ауфману) */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70"
            style={{ color: activeTheme.textSecondary }}
          >
            {period === 'month' ? 'Цветовой ковёр месяца (30 дней)' : 'Цвета недели'}
          </span>
          <span className="text-xs font-serif italic text-amber-600">
            52% — спектр тепла и янтаря
          </span>
        </div>

        {/* Сетка дней (мозаика) */}
        <div className={`grid gap-1.5 mb-3 ${period === 'month' ? 'grid-cols-6' : 'grid-cols-7'}`}>
          {(period === 'month' ? monthData : monthData.slice(0, 7)).map((item) => (
            <div
              key={item.day}
              onMouseEnter={() => setHoveredDay(item)}
              onClick={() => setHoveredDay(item)}
              className="h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative shadow-2xs"
              style={{ backgroundColor: item.color }}
            >
              <span className="text-[10px] font-semibold text-white/80">{item.day}</span>
              {item.isBanya && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Инфо по выбранному дню */}
        {hoveredDay ? (
          <div
            className="p-3 rounded-2xl border text-xs flex items-center justify-between animate-fade-in"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <div>
              <span className="font-semibold">{hoveredDay.day} число:</span> {hoveredDay.mood} · {hoveredDay.ritual}
            </div>
            <div className="text-[11px] opacity-75">Сон: {hoveredDay.sleep}ч (глуб. {hoveredDay.deep}ч)</div>
          </div>
        ) : (
          <p className="text-[11px] opacity-60 text-center italic">
            Нажми на любой камешек дня, чтобы увидеть его детали
          </p>
        )}

        {/* Легенда спектра */}
        <div className="flex flex-wrap items-center justify-around gap-2 pt-3 mt-3 border-t border-black/5 text-[10px]">
          {MOOD_COLORS.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
              <span className="opacity-75">{c.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. НАГЛЯДНЫЙ ГРАФИК: СВЯЗЬ СНА И БАНИ (Доказанный эффект) */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70"
            style={{ color: activeTheme.textSecondary }}
          >
            Фаза глубокого сна (Deep Sleep)
          </span>
          <span className="text-xs font-serif font-semibold text-emerald-700">
            +38% после бани
          </span>
        </div>

        <p className="text-xs opacity-75 mb-4" style={{ color: activeTheme.textSecondary }}>
          Золотые столбики — дни банных ритуалов. Наглядно видно, как тело проваливается в глубокий сон.
        </p>

        {/* Столбчатая диаграмма */}
        <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-2 px-1 border-b border-black/10">
          {weekSleepData.map((item) => {
            const heightPercent = (item.deep / 2.5) * 100;
            return (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-medium opacity-60">{item.deep}ч</span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 shadow-xs ${
                    item.banya ? 'ring-2 ring-amber-400' : ''
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: item.banya ? '#F59E0B' : activeTheme.primary,
                  }}
                  title={`${item.day}: ${item.deep}ч глубокого сна из ${item.total}ч общего`}
                />
                <span className="text-[10px] font-semibold opacity-75">{item.day}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2.5 text-[11px] opacity-70">
          <span>Средний глубокий сон: 1.4 ч</span>
          <span className="text-amber-700 font-semibold">В банные дни: 2.0 ч</span>
        </div>
      </div>

      {/* 3. РАСПРЕДЕЛЕНИЕ ТВОИХ ЯКОРЕЙ (Рейтинг заботы) */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <span
          className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
          style={{ color: activeTheme.textSecondary }}
        >
          Твои проверенные якоря за 30 дней
        </span>

        {[
          { title: 'Момент присутствия («Я здесь»)', count: 24, max: 30, color: activeTheme.primary },
          { title: 'Тёплая тарелка (Забота о еде)', count: 19, max: 30, color: '#D97706' },
          { title: 'Чтение и чай', count: 14, max: 30, color: '#8B5CF6' },
          { title: 'Прогулка в тишине', count: 12, max: 30, color: '#4D7C6F' },
          { title: 'Баня и пар', count: 6, max: 8, color: '#C2410C' },
          { title: 'Осознанная покупка (Пауза)', count: 5, max: 10, color: '#10B981' },
        ].map((item) => (
          <div key={item.title} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: activeTheme.textPrimary }}>{item.title}</span>
              <span className="font-semibold opacity-80" style={{ color: activeTheme.textSecondary }}>
                {item.count} раз
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / item.max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
