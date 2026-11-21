import React, { useState } from 'react';
import { StorageService } from '../services/storage';

/**
 * Карточка «Мой ритм и ориентиры тела» (Бережный онбординг / профиль)
 * Позволяет настроить свой сезон жизни и контекст тела БЕЗ диетического стыда.
 */
export function UserProfileCard({ activeTheme }) {
  const savedProfile = StorageService.get('parallelo_user_profile', {});

  const [name, setName] = useState(savedProfile.name || 'Юлия');
  const [season, setSeason] = useState(savedProfile.season || 'apples');
  const [height, setHeight] = useState(savedProfile.height || '168');
  const [weight, setWeight] = useState(savedProfile.weight || '64');
  const [healthSync, setHealthSync] = useState(savedProfile.healthSync ?? true);
  const [notificationMode, setNotificationMode] = useState(savedProfile.notificationMode || 'gentle'); // 'gentle' | 'silent'
  const [twilightTime, setTwilightTime] = useState(savedProfile.twilightTime || '21:00');
  const [banyaReminder, setBanyaReminder] = useState(savedProfile.banyaReminder ?? true);
  const [savedNote, setSavedNote] = useState(null);

  const SEASONS = [
    { id: 'spring', title: 'Весенний ветер', age: '18–27 лет', focus: 'Поиск баланса, режим сна' },
    { id: 'summer', title: 'Полуденное солнце', age: '28–40 лет', focus: 'Созидание, защита от выгорания' },
    { id: 'apples', title: 'Спелые яблоки', age: '41–55 лет', focus: 'Бережность к телу, тёплая пища, сон' },
    { id: 'forest', title: 'Глубокий лес', age: '56+ лет', focus: 'Мудрость, суставы, радость рассветам' },
  ];

  const handleSave = () => {
    StorageService.set('parallelo_user_profile', {
      name,
      season,
      height,
      weight,
      healthSync,
      notificationMode,
      twilightTime,
      banyaReminder,
    });
    setSavedNote('Твои ритмы бережно сохранены в памяти телефона. Приложение говорит с тобой на твоём языке.');
    setTimeout(() => setSavedNote(null), 4000);
  };

  return (
    <div
      className="p-5 rounded-3xl border transition-all duration-300 shadow-sm space-y-4"
      style={{
        backgroundColor: activeTheme.surfaceCard,
        borderColor: activeTheme.borderColor,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
            style={{ color: activeTheme.textSecondary }}
          >
            Бережный профиль
          </span>
          <h3
            className="text-base font-serif font-medium"
            style={{ color: activeTheme.textPrimary }}
          >
            Мой ритм и ориентиры
          </h3>
        </div>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif font-bold shadow-xs"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            color: activeTheme.primary,
          }}
        >
          {name.charAt(0) || 'Ю'}
        </div>
      </div>

      {/* 1. Имя пользователя */}
      <div>
        <label
          htmlFor="userNameInput"
          className="block text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-1"
          style={{ color: activeTheme.textSecondary }}
        >
          Как тебя называть
        </label>
        <input
          id="userNameInput"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl bg-black/[0.02] border border-black/5 focus:outline-none focus:ring-1"
          style={{ color: activeTheme.textPrimary, ringColor: activeTheme.primary }}
        />
      </div>

      {/* 2. Сезон жизни с напоминанием о возрасте */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
            style={{ color: activeTheme.textSecondary }}
          >
            Твой сезон жизни
          </span>
          <span className="text-xs font-serif font-medium" style={{ color: activeTheme.accent }}>
            {SEASONS.find((s) => s.id === season)?.title} ({SEASONS.find((s) => s.id === season)?.age})
          </span>
        </div>
        <p className="text-[10px] opacity-70 mb-2 italic" style={{ color: activeTheme.textSecondary }}>
          Возрастной диапазон помогает подобрать бережный темп и комфортные ритуалы:
        </p>

        <div className="grid grid-cols-2 gap-2">
          {SEASONS.map((s) => {
            const isPicked = season === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSeason(s.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  isPicked ? 'shadow-xs font-medium' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isPicked ? activeTheme.surfaceContainer : 'transparent',
                  borderColor: isPicked ? activeTheme.primary : activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-serif font-medium">{s.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isPicked ? 'bg-amber-500/15 text-amber-900' : 'bg-black/5 text-gray-500'
                    }`}
                  >
                    {s.age}
                  </span>
                </div>
                <div className="text-[10px] opacity-70 leading-tight">{s.focus}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Ориентиры тела (без диетического стыда) */}
      <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/5 space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase opacity-70"
            style={{ color: activeTheme.textSecondary }}
          >
            Ориентиры тела (по желанию)
          </span>
          <span className="text-[10px] opacity-60">не для взвешивания</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] opacity-60 block">Рост (см)</span>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-white border border-black/5"
              style={{ color: activeTheme.textPrimary }}
            />
          </div>
          <div>
            <span className="text-[10px] opacity-60 block">Вес (кг)</span>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-white border border-black/5"
              style={{ color: activeTheme.textPrimary }}
            />
          </div>
        </div>

        <p className="text-[10px] leading-tight opacity-70 italic" style={{ color: activeTheme.textSecondary }}>
          Используется только для мягкого расчёта нормы тёплой воды и баланса активности. Никаких целей «похудеть к лету».
        </p>
      </div>

      {/* 4. Тумблер Health Connect / realme Здоровье */}
      <div
        onClick={() => setHealthSync(!healthSync)}
        className="flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all"
        style={{
          borderColor: activeTheme.borderColor,
          backgroundColor: healthSync ? activeTheme.surfaceContainer : 'transparent',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-xs font-bold">🌿</span>
          <div>
            <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
              Синхронизация здоровья (Health Connect / realme)
            </div>
            <div className="text-[10px] opacity-70" style={{ color: activeTheme.textSecondary }}>
              Чтение фаз глубокого сна и шагов со смартфона или часов
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          healthSync ? 'bg-emerald-500/10 text-emerald-700' : 'bg-black/5 text-gray-500'
        }`}>
          {healthSync ? 'Включено' : 'Выключено'}
        </span>
      </div>

      {/* 5. Бережные уведомления: Шёпот сумерек */}
      <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span
              className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
              style={{ color: activeTheme.textSecondary }}
            >
              Уведомления без тревоги
            </span>
            <div className="text-xs font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
              Шёпот сумерек
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium">
            Без спама и стриков
          </span>
        </div>

        {/* Переключатель режима: Шёпот или Тишина */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setNotificationMode('gentle')}
            className={`p-2 rounded-xl text-left border transition-all text-xs ${
              notificationMode === 'gentle' ? 'shadow-xs font-medium' : 'opacity-60'
            }`}
            style={{
              backgroundColor: notificationMode === 'gentle' ? activeTheme.surfaceContainer : 'transparent',
              borderColor: notificationMode === 'gentle' ? activeTheme.primary : activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <div className="font-serif">🌿 Шёпот сумерек</div>
            <div className="text-[10px] opacity-70 mt-0.5">1 мягкое приглашение вечером</div>
          </button>

          <button
            type="button"
            onClick={() => setNotificationMode('silent')}
            className={`p-2 rounded-xl text-left border transition-all text-xs ${
              notificationMode === 'silent' ? 'shadow-xs font-medium' : 'opacity-60'
            }`}
            style={{
              backgroundColor: notificationMode === 'silent' ? activeTheme.surfaceContainer : 'transparent',
              borderColor: notificationMode === 'silent' ? activeTheme.primary : activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <div className="font-serif">🕯 Полная тишина</div>
            <div className="text-[10px] opacity-70 mt-0.5">Приходи, когда сама захочешь</div>
          </button>
        </div>

        {notificationMode === 'gentle' && (
          <div className="space-y-2.5 pt-1 border-t border-black/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] opacity-80" style={{ color: activeTheme.textSecondary }}>
                Время вечернего вопроса:
              </span>
              <input
                type="time"
                value={twilightTime}
                onChange={(e) => setTwilightTime(e.target.value)}
                className="text-xs p-1.5 rounded-lg bg-white border border-black/10 font-mono"
                style={{ color: activeTheme.textPrimary }}
              />
            </div>

            <div
              onClick={() => setBanyaReminder(!banyaReminder)}
              className="flex items-center justify-between cursor-pointer text-[11px]"
            >
              <span className="opacity-80" style={{ color: activeTheme.textPrimary }}>
                Банный колокол перед выходными
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                banyaReminder ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
              }`}>
                {banyaReminder ? 'Включено' : 'Выключено'}
              </span>
            </div>

            <p className="text-[10px] leading-tight opacity-70 italic" style={{ color: activeTheme.textSecondary }}>
              Пример пуша: «За окном вечер. Где в теле сегодня ощущалось больше всего тепла? Или просто налей чаю.»
            </p>
          </div>
        )}
      </div>

      {savedNote && (
        <div
          className="p-3 rounded-2xl text-center text-xs font-serif italic animate-fade-in border"
          style={{
            backgroundColor: `${activeTheme.secondary}15`,
            color: activeTheme.secondary,
            borderColor: activeTheme.secondary,
          }}
        >
          {savedNote}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-full text-xs font-medium text-white transition-all shadow-xs hover:shadow-md hover:scale-101"
        style={{ backgroundColor: activeTheme.primary }}
      >
        Сохранить мой ритм
      </button>
    </div>
  );
}
