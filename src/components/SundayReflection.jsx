import React, { useState } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';
import { UserProfileCard } from './UserProfileCard';
import { VisualStats } from './VisualStats';

export function SundayReflection({ activeTheme }) {
  const [selectedSeason, setSelectedSeason] = useState('apples');

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
      status: 'Цветёт и согревается',
      note: 'Баня и глубокий сон держат корни крепкими',
      color: '#10B981',
    },
    {
      name: 'Душа и Тишина',
      icon: '🌸',
      status: 'Зеленеет',
      note: 'Вечерние книги и прогулки питают покой',
      color: '#8B5CF6',
    },
    {
      name: 'Тепло и Близкие',
      icon: '🌾',
      status: 'Просит немного влаги',
      note: 'Позвони или просто посиди рядом в тишине',
      color: '#F59E0B',
    },
    {
      name: 'Дело и Ремесло',
      icon: '🪵',
      status: 'Отдыхает под снегом',
      note: 'Зима — время покоя, ростки взойдут весной',
      color: '#64748B',
    },
  ];

  const weekDays = [
    { day: 'Пн', color: MOOD_COLORS[0].hex, tag: 'В ладонях' },
    { day: 'Вт', color: MOOD_COLORS[1].hex, tag: 'Тёплый душ' },
    { day: 'Ср', color: MOOD_COLORS[2].hex, tag: 'Шелест книг' },
    { day: 'Чт', color: MOOD_COLORS[0].hex, tag: 'Тёплая кружка' },
    { day: 'Пт', color: MOOD_COLORS[3].hex, tag: 'Уютный плед' },
    { day: 'Сб', color: MOOD_COLORS[0].hex, tag: 'Баня и пар' },
    { day: 'Вс', color: MOOD_COLORS[2].hex, tag: 'Тишина' },
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
                className="w-full h-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                style={{ backgroundColor: item.color }}
                title={`${item.day}: ${item.tag}`}
              >
                <div className="w-2 h-2 rounded-full bg-white/70" />
              </div>
              <span
                className="text-[11px] font-medium opacity-70"
                style={{ color: activeTheme.textSecondary }}
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
          За неделю чаще всего рядом были <strong className="font-semibold">вода</strong>,{' '}
          <strong className="font-semibold">тепло кружки</strong> и{' '}
          <strong className="font-semibold">банный пар</strong>. Преобладающий цвет твоего покоя —{' '}
          <span className="font-serif italic text-amber-700">янтарное солнце</span>.
        </div>
      </div>

      {/* 5. НАГЛЯДНАЯ СТАТИСТИКА И ЦВЕТОВОЙ КОВЁР */}
      <VisualStats activeTheme={activeTheme} />

      {/* 6. ПЛАСТ: БЕРЕЖНЫЙ ПРОФИЛЬ И ОРИЕНТИРЫ ТЕЛА */}
      <UserProfileCard activeTheme={activeTheme} />
    </div>
  );
}
