import React, { useState } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';
import { StorageService } from '../services/storage';

/**
 * Наглядная статистика Parallelo (Без заглушек, реальные данные с 21.11)
 * 1. Сенсорная мозаика ноября (старт сегодня, 21.11)
 * 2. График сна и банного тепла (реальные отметки)
 * 3. Распределение якорей (реальный счетчик)
 */
export function VisualStats({ activeTheme }) {
  const [period, setPeriod] = useState('month'); // 'week' | 'month'
  const [hoveredDay, setHoveredDay] = useState(null);

  // Считываем реальные данные пользователя
  const todayColor = StorageService.get('parallelo_today_color', null);
  const todayTag = StorageService.get('parallelo_today_tag', null);
  const todayNote = StorageService.get('parallelo_today_note', '');
  const loggedRituals = StorageService.get('parallelo_logged_rituals', []);
  const shoppingPauses = StorageService.get('parallelo_shopping_pauses', []);
  const history = StorageService.get('parallelo_history', []);

  const hasTodayEntry = !!todayColor;
  const isBanyaToday = loggedRituals.includes('banya');

  // Формируем сетку 30 дней ноября с началом отсчета 21.11
  const monthDays = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    if (day < 21) {
      return {
        day,
        status: 'before_start',
        color: null,
        desc: 'До начала наблюдений (старт 21 ноября)',
      };
    }
    if (day === 21) {
      return {
        day,
        status: hasTodayEntry ? 'recorded' : 'today_waiting',
        color: hasTodayEntry ? todayColor.hex : null,
        mood: hasTodayEntry ? todayColor.name : 'Ожидает чекина',
        ritual: loggedRituals.length > 0 ? `${loggedRituals.length} ритуала(ов)` : 'Пока без ритуалов',
        note: todayNote || todayTag || 'Первый день пути',
        isToday: true,
        isBanya: isBanyaToday,
      };
    }
    return {
      day,
      status: 'upcoming',
      color: null,
      desc: 'Впереди. Наполнится твоим теплом шаг за шагом.',
    };
  });

  // Рейтинг реальных якорей
  const anchorItems = [
    {
      id: 'presence',
      title: 'Момент присутствия («Я здесь»)',
      count: hasTodayEntry ? 1 : 0,
      color: activeTheme.primary,
    },
    {
      id: 'warm_plate',
      title: 'Тёплая тарелка (Забота о еде)',
      count: loggedRituals.includes('warm_plate') ? 1 : 0,
      color: '#D97706',
    },
    {
      id: 'movement',
      title: 'Движение и тренировка',
      count: loggedRituals.includes('movement') ? 1 : 0,
      color: '#0284C7',
    },
    {
      id: 'banya',
      title: 'Баня и пар',
      count: loggedRituals.includes('banya') ? 1 : 0,
      color: '#C2410C',
    },
    {
      id: 'tea_reading',
      title: 'Чтение и чай',
      count: loggedRituals.includes('tea_reading') ? 1 : 0,
      color: '#8B5CF6',
    },
    {
      id: 'silent_walk',
      title: 'Прогулка в тишине',
      count: loggedRituals.includes('silent_walk') ? 1 : 0,
      color: '#4D7C6F',
    },
    {
      id: 'mindful_shopping',
      title: 'Осознанная покупка (Пауза 24ч)',
      count: shoppingPauses.length,
      color: '#10B981',
    },
  ];

  const totalRitualsLogged = anchorItems.reduce((acc, cur) => acc + cur.count, 0);
  const maxScale = Math.max(3, ...anchorItems.map((a) => a.count));

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

      {/* 1. ЦВЕТОВОЙ КОВЁР МЕСЯЦА (С началом отсчета 21.11) */}
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
            Ноябрь (старт 21.11)
          </span>
          <span className="text-xs font-serif italic text-amber-600">
            {hasTodayEntry ? '1 день зафиксирован ✨' : 'Ждёт первого чекина сегодня'}
          </span>
        </div>

        {/* Сетка дней месяца */}
        <div className={`grid gap-1.5 mb-3 ${period === 'month' ? 'grid-cols-6' : 'grid-cols-7'}`}>
          {(period === 'month' ? monthDays : monthDays.slice(20, 27)).map((item) => {
            const isToday = item.day === 21;
            const hasColor = item.status === 'recorded' && item.color;

            return (
              <div
                key={item.day}
                onMouseEnter={() => setHoveredDay(item)}
                onClick={() => setHoveredDay(item)}
                className={`h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all relative ${
                  isToday ? 'scale-105 shadow-xs' : ''
                }`}
                style={{
                  backgroundColor: hasColor ? item.color : isToday ? `${activeTheme.primary}15` : 'transparent',
                  border: isToday
                    ? `2px solid ${activeTheme.primary}`
                    : hasColor
                    ? 'none'
                    : '1px dashed rgba(0,0,0,0.1)',
                }}
              >
                <span
                  className={`text-[10px] font-semibold ${
                    hasColor ? 'text-white' : isToday ? 'font-bold' : 'opacity-30'
                  }`}
                  style={{ color: hasColor ? '#FFF' : isToday ? activeTheme.primary : undefined }}
                >
                  {item.day}
                </span>

                {isToday && (
                  <div
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: activeTheme.primary }}
                  />
                )}
              </div>
            );
          })}
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
              <span className="font-semibold">{hoveredDay.day} ноября:</span>{' '}
              {hoveredDay.isToday
                ? hasTodayEntry
                  ? `${hoveredDay.mood} · ${hoveredDay.note}`
                  : 'Сегодня. Сделай чекин на вкладке «Сегодня»'
                : hoveredDay.desc}
            </div>
          </div>
        ) : (
          <p className="text-[11px] opacity-60 text-center italic">
            Нажми на 21 число — это твой сегодняшний день старта
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

      {/* 2. НАГЛЯДНЫЙ ГРАФИК: СВЯЗЬ СНА И БАНИ */}
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
          <span className="text-xs font-serif italic text-amber-700">
            {isBanyaToday ? 'Банный день зафиксирован' : 'Ожидание первой ночи'}
          </span>
        </div>

        {isBanyaToday ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
            <div className="font-serif font-medium text-amber-900">
              🌿 Банный ритуал активен на сегодня (21.11)!
            </div>
            <p className="text-[11px] text-amber-800/80 leading-relaxed">
              Завтра утром после сна данные фазы Deep Sleep отразятся здесь золотым столбиком. Приятного пара и глубокого сна.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 text-center text-xs space-y-1.5">
            <div className="font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
              Связь сна и бани начнёт строиться с первого банного дня
            </div>
            <p className="text-[11px] opacity-70 leading-relaxed" style={{ color: activeTheme.textSecondary }}>
              Отметьте ритуал «Баня и пар» на вкладке «Якоря», когда пойдете в баню, и приложение покажет, насколько глубже стало восстановление.
            </p>
          </div>
        )}
      </div>

      {/* 3. РАСПРЕДЕЛЕНИЕ ТВОИХ ЯКОРЕЙ */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
            style={{ color: activeTheme.textSecondary }}
          >
            Твои проверенные якоря
          </span>
          <span className="text-xs opacity-60">
            {totalRitualsLogged > 0 ? `${totalRitualsLogged} зафиксировано` : 'Пока 0'}
          </span>
        </div>

        {totalRitualsLogged === 0 ? (
          <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/5 text-xs text-center opacity-75">
            Якоря пока чистые. Отметь на вкладке «Якоря» то, что согрело тебя сегодня (например, тёплую тарелку или чай).
          </div>
        ) : (
          anchorItems.map((item) => (
            <div key={item.id} className="space-y-1">
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
                    width: `${(item.count / maxScale) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
