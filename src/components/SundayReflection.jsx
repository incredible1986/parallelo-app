import React, { useState } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';
import { StorageService } from '../services/storage';
import { UserProfileCard } from './UserProfileCard';
import { VisualStats } from './VisualStats';

export function SundayReflection({ activeTheme }) {
  const [selectedSeason, setSelectedSeason] = useState('apples');

  const todayColor = StorageService.get('parallelo_today_color', null);
  const todayTag = StorageService.get('parallelo_today_tag', null);

  const SEASONS = [
    { id: 'spring', title: 'Весенний ветер', age: '18–27', desc: 'Поиск своего пути, пробы и первые шторма' },
    { id: 'summer', title: 'Полуденное солнце', age: '28–40', desc: 'Созидание, плотность дел, поиск опоры' },
    { id: 'apples', title: 'Спелые яблоки', age: '41–55', desc: 'Переосмысление, бережность к телу, любовь к тишине' },
    { id: 'forest', title: 'Глубокий лес', age: '56+', desc: 'Мудрость, замедление, радость каждому рассвету' },
  ];

  const GARDEN_PLANTS = [
    {
      name: 'Тело и Пар',
      icon: '🌿',
      status: 'Посажено 21.11',
      note: 'Первые семена бережности к телу заложены сегодня',
      color: '#10B981',
    },
    {
      name: 'Душа и Тишина',
      icon: '🌸',
      status: 'Ждёт первого полива',
      note: 'Вечерние минуты тишины и страницы книг',
      color: '#8B5CF6',
    },
    {
      name: 'Тепло и Близкие',
      icon: '🌾',
      status: 'Прорастает',
      note: 'Просто быть рядом без спешки и ожиданий',
      color: '#F59E0B',
    },
    {
      name: 'Дело и Ремесло',
      icon: '🪵',
      status: 'В естественном ритме',
      note: 'Движение вперёд без выгорания и суеты',
      color: '#64748B',
    },
  ];

  // Неделя: старт с субботы 21.11
  const weekDays = [
    { day: 'Пн', color: null, tag: 'До старта' },
    { day: 'Вт', color: null, tag: 'До старта' },
    { day: 'Ср', color: null, tag: 'До старта' },
    { day: 'Чт', color: null, tag: 'До старта' },
    { day: 'Пт', color: null, tag: 'До старта' },
    { day: 'Сб', color: todayColor ? todayColor.hex : null, isToday: true, tag: todayTag || 'Сегодня (21.11)' },
    { day: 'Вс', color: null, tag: 'Впереди' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Главный посыл Parallelo: «Здесь ничего не сгорело» */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm"
        style={{
          backgroundColor: activeTheme.surfaceContainer,
          borderColor: activeTheme.borderColor,
        }}
      >
        <span
          className="text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-2 block"
          style={{ color: activeTheme.textSecondary }}
        >
          Воскресное зеркало
        </span>
        <h3
          className="text-xl font-serif font-normal leading-snug mb-2"
          style={{ color: activeTheme.textPrimary }}
        >
          «С возвращением. Здесь ничего не сгорело.»
        </h3>
        <p
          className="text-xs leading-relaxed opacity-80"
          style={{ color: activeTheme.textSecondary }}
        >
          В Parallelo нет стриков, штрафов и чувства вины. Жизнь не измеряется галочками.
          Ты здесь, и этого достаточно.
        </p>
      </div>

      {/* 2. ПЛАСТ: СЕЗОНЫ ЖИЗНИ (Возраст как карта, а не клетка) */}
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
            Твой сезон жизни
          </span>
          <span className="text-xs font-serif italic" style={{ color: activeTheme.accent }}>
            {SEASONS.find((s) => s.id === selectedSeason)?.title}
          </span>
        </div>

        <p className="text-xs opacity-75 mb-3" style={{ color: activeTheme.textSecondary }}>
          Приложение говорит с тобой на языке твоего жизненного этапа:
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {SEASONS.map((s) => {
            const isPicked = selectedSeason === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSeason(s.id)}
                className={`p-2.5 rounded-2xl text-left border transition-all ${
                  isPicked ? 'shadow-xs font-medium' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isPicked ? activeTheme.surfaceContainer : 'transparent',
                  borderColor: isPicked ? activeTheme.primary : activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              >
                <div className="text-xs font-serif">{s.title}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ПЛАСТ: САД ДУШИ (Вместо бездушного колеса жизни) */}
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
            Сад твоей жизни
          </span>
          <span className="text-xs font-serif italic" style={{ color: activeTheme.secondary }}>
            «Копай землю, возделывай душу»
          </span>
        </div>

        <p className="text-xs opacity-75 mb-4" style={{ color: activeTheme.textSecondary }}>
          Сферы жизни — это не сухие баллы в отчёте, а растения. Одно цветёт, другое отдыхает под снегом.
        </p>

        <div className="space-y-3">
          {GARDEN_PLANTS.map((plant) => (
            <div
              key={plant.name}
              className="p-3 rounded-2xl border flex items-center justify-between"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{plant.icon}</span>
                <div>
                  <div className="text-xs font-medium font-serif" style={{ color: activeTheme.textPrimary }}>
                    {plant.name}
                  </div>
                  <div className="text-[11px] opacity-70" style={{ color: activeTheme.textSecondary }}>
                    {plant.note}
                  </div>
                </div>
              </div>

              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${plant.color}15`,
                  color: plant.color,
                }}
              >
                {plant.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Сенсорная мозаика недели (Цвета дней Лео Ауфмана) */}
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
            Цветовой спектр недели
          </span>
          <span
            className="text-xs font-serif italic"
            style={{ color: activeTheme.accent }}
          >
            7 дней заземления
          </span>
        </div>

        {/* 7 плашек дней недели */}
        <div className="grid grid-cols-7 gap-2 my-4">
          {weekDays.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-14 rounded-2xl flex items-center justify-center transition-all ${
                  item.isToday ? 'scale-105 shadow-xs' : ''
                }`}
                style={{
                  backgroundColor: item.color ? item.color : item.isToday ? `${activeTheme.primary}15` : 'transparent',
                  border: item.isToday
                    ? `2px solid ${activeTheme.primary}`
                    : item.color
                    ? 'none'
                    : '1px dashed rgba(0,0,0,0.1)',
                }}
                title={`${item.day}: ${item.tag}`}
              >
                {item.color ? (
                  <div className="w-2 h-2 rounded-full bg-white/80 animate-presence-breathe" />
                ) : item.isToday ? (
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${item.isToday ? 'font-bold' : 'opacity-50'}`}
                style={{ color: item.isToday ? activeTheme.primary : activeTheme.textSecondary }}
              >
                {item.day}
              </span>
            </div>
          ))}
        </div>

        <div
          className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/5 text-xs leading-relaxed"
          style={{ color: activeTheme.textPrimary }}
        >
          {todayColor ? (
            <>
              Ты начала свой путь в субботу, 21 ноября. Твой цвет сегодня —{' '}
              <strong className="font-semibold font-serif italic" style={{ color: todayColor.hex }}>
                {todayColor.name}
              </strong>
              {todayTag && <> · рядом было <em>{todayTag}</em></>}. Ты здесь, и этого достаточно.
            </>
          ) : (
            <>
              Сегодня <strong className="font-semibold">суббота, 21 ноября</strong> — твой первый день старта.
              Сделай вечерний чекин на вкладке «Сегодня», чтобы зажечь первый камешек недели.
            </>
          )}
        </div>
      </div>

      {/* 5. НАГЛЯДНАЯ СТАТИСТИКА И ЦВЕТОВОЙ КОВЁР */}
      <VisualStats activeTheme={activeTheme} />

      {/* 6. ПЛАСТ: БЕРЕЖНЫЙ ПРОФИЛЬ И ОРИЕНТИРЫ ТЕЛА */}
      <UserProfileCard activeTheme={activeTheme} />
    </div>
  );
}
