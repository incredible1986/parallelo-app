import React, { useState, useRef } from 'react';
import { PALETTES, SEASONS } from '../data/brandingTokens';
import { StorageService } from '../services/storage';
import { computeHydrationTarget } from '../services/analytics';
import { IconDownload, IconDrop, IconUpload } from './RitualIcons';

/**
 * Профиль, темы, ориентиры тела, резервное копирование и статус возможностей.
 */
export function UserProfileCard({
  activeTheme,
  onSelectTheme,
  profile,
  onUpdateProfile,
  onDataImportedOrReset,
}) {
  const [name, setName] = useState(profile.name || '');
  const [season, setSeason] = useState(profile.season || 'apples');
  const [height, setHeight] = useState(profile.height || '');
  const [weight, setWeight] = useState(profile.weight || '');
  const [excludeSick, setExcludeSick] = useState(profile.excludeSickFromBaseline ?? true);
  const [trackCycle, setTrackCycle] = useState(Boolean(profile.trackCycle));
  const [cycleLength, setCycleLength] = useState(Number(profile.cycleLength || 28));
  const [notice, setNotice] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef(null);

  const hydrationPreview = computeHydrationTarget(weight, { rituals: [] });

  const flashNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSave = () => {
    onUpdateProfile({
      name: name.trim(),
      season,
      height: height ? String(height) : '',
      weight: weight ? String(weight) : '',
      excludeSickFromBaseline: excludeSick,
      trackCycle,
      cycleLength: Math.max(21, Math.min(40, Number(cycleLength || 28))),
    });
    flashNotice('Настройки профиля сохранены.');
  };

  const handleExport = () => {
    const json = StorageService.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parallelo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashNotice('Резервная копия скачана.');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const count = StorageService.importBackup(String(ev.target?.result || ''));
        onDataImportedOrReset();
        flashNotice(`Загружено записей: ${count}.`);
      } catch (err) {
        flashNotice(err.message || 'Не удалось прочитать файл.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    StorageService.resetAllParalleloData();
    setConfirmReset(false);
    onDataImportedOrReset();
    flashNotice('Локальные данные удалены.');
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs block" style={{ color: activeTheme.textSecondary }}>
          Настройки и данные
        </span>
        <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
          Профиль
        </h2>
      </div>

      {notice && (
        <div
          className="px-3.5 py-2.5 rounded-xl border text-xs animate-fade-in"
          style={{
            backgroundColor: activeTheme.surfaceElevated,
            borderColor: activeTheme.accent,
            color: activeTheme.textPrimary,
          }}
        >
          {notice}
        </div>
      )}

      {/* 1. Оформление */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
          Тема оформления
        </span>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(PALETTES).map((p) => {
            const isSel = activeTheme.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectTheme(p)}
                className="p-2.5 rounded-xl border text-left transition-colors space-y-1.5"
                style={{
                  backgroundColor: isSel ? activeTheme.surfaceElevated : 'transparent',
                  borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-md border"
                    style={{ backgroundColor: p.surface, borderColor: p.borderColor }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-md"
                    style={{ backgroundColor: p.primary }}
                  />
                </div>
                <div className="text-xs font-medium leading-tight" style={{ color: activeTheme.textPrimary }}>
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Личные ориентиры */}
      <div
        className="p-4 rounded-2xl border space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <label
            htmlFor="profileNameInput"
            className="block text-xs font-medium mb-1.5"
            style={{ color: activeTheme.textSecondary }}
          >
            Имя (по желанию)
          </label>
          <input
            id="profileNameInput"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            className="w-full text-xs p-2.5 rounded-xl border focus:outline-none"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          />
        </div>

        <div>
          <span className="block text-xs font-medium mb-2" style={{ color: activeTheme.textSecondary }}>
            Возрастной сезон
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SEASONS.map((s) => {
              const isPicked = season === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeason(s.id)}
                  className="p-2.5 rounded-xl border text-left transition-colors"
                  style={{
                    backgroundColor: isPicked ? activeTheme.surfaceElevated : 'transparent',
                    borderColor: isPicked ? activeTheme.primary : activeTheme.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                      {s.title}
                    </span>
                    <span
                      className="text-[10px] tabular-nums"
                      style={{ color: isPicked ? activeTheme.primary : activeTheme.textMuted }}
                    >
                      {s.age}
                    </span>
                  </div>
                  <div className="text-[10px] leading-snug" style={{ color: activeTheme.textSecondary }}>
                    {s.focus}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="pt-3 border-t space-y-2.5"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Параметры тела
            </span>
            <span className="text-[10px]" style={{ color: activeTheme.textMuted }}>
              только для расчёта воды
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="heightInput" className="text-[11px] block mb-1" style={{ color: activeTheme.textSecondary }}>
                Рост (см)
              </label>
              <input
                id="heightInput"
                type="number"
                placeholder="168"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full text-xs tabular-nums p-2 rounded-xl border focus:outline-none"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              />
            </div>
            <div>
              <label htmlFor="weightInput" className="text-[11px] block mb-1" style={{ color: activeTheme.textSecondary }}>
                Вес (кг)
              </label>
              <input
                id="weightInput"
                type="number"
                placeholder="64"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full text-xs tabular-nums p-2 rounded-xl border focus:outline-none"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              />
            </div>
          </div>

          {hydrationPreview && (
            <div
              className="p-2.5 rounded-xl border flex items-center justify-between text-[11px]"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <span className="flex items-center gap-1.5" style={{ color: activeTheme.textSecondary }}>
                <IconDrop className="w-3.5 h-3.5" style={{ color: activeTheme.secondary }} />
                Ориентир воды:
              </span>
              <span className="tabular-nums font-medium" style={{ color: activeTheme.textPrimary }}>
                {hydrationPreview.totalLiters} л в день
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExcludeSick(!excludeSick)}
          className="w-full p-3 rounded-xl border flex items-center justify-between text-left"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
          }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
              Исключать дни болезни из нормы
            </div>
            <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
              Рекомендуется, чтобы простуда не смещала вашу обычную картину
            </div>
          </div>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: excludeSick ? activeTheme.accent : activeTheme.surfaceCard,
              color: excludeSick ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            {excludeSick ? 'Вкл' : 'Выкл'}
          </span>
        </button>

        {/* Опциональный учёт цикла */}
        <div
          className="p-3 rounded-xl border space-y-2.5"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
          }}
        >
          <button
            type="button"
            onClick={() => setTrackCycle(!trackCycle)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                Учитывать женский цикл
              </div>
              <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
                Помогает отличать естественный гормональный фон от усталости
              </div>
            </div>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: trackCycle ? activeTheme.accent : activeTheme.surfaceCard,
                color: trackCycle ? activeTheme.primaryText : activeTheme.textSecondary,
              }}
            >
              {trackCycle ? 'Вкл' : 'Выкл'}
            </span>
          </button>

          {trackCycle && (
            <div
              className="pt-2.5 border-t flex items-center justify-between text-xs"
              style={{ borderColor: activeTheme.borderColor }}
            >
              <span style={{ color: activeTheme.textSecondary }}>Обычная длина цикла</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCycleLength((v) => Math.max(21, v - 1))}
                  className="w-7 h-7 rounded-lg border text-xs"
                  style={{ borderColor: activeTheme.borderColor, color: activeTheme.textPrimary }}
                >
                  −
                </button>
                <span className="tabular-nums font-medium w-12 text-center" style={{ color: activeTheme.textPrimary }}>
                  {cycleLength} дн.
                </span>
                <button
                  type="button"
                  onClick={() => setCycleLength((v) => Math.min(40, v + 1))}
                  className="w-7 h-7 rounded-lg border text-xs"
                  style={{ borderColor: activeTheme.borderColor, color: activeTheme.textPrimary }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: activeTheme.primary,
            color: activeTheme.primaryText,
          }}
        >
          Сохранить настройки
        </button>
      </div>

      {/* 3. Резервное копирование */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Сохранение и перенос данных
          </span>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: activeTheme.textSecondary }}>
            Все записи хранятся прямо у вас на устройстве. Можно скачать резервную копию в файл, чтобы не потерять историю.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <IconDownload className="w-3.5 h-3.5" />
            Скачать копию
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <IconUpload className="w-3.5 h-3.5" />
            Загрузить копию
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        <div className="pt-2 border-t" style={{ borderColor: activeTheme.borderColor }}>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 rounded-xl border text-[11px] font-medium transition-colors"
            style={{
              borderColor: confirmReset ? activeTheme.danger : activeTheme.borderColor,
              color: confirmReset ? activeTheme.danger : activeTheme.textMuted,
            }}
          >
            {confirmReset ? 'Подтвердить удаление всех записей?' : 'Очистить все записи'}
          </button>
        </div>
      </div>

      {/* 4. Статус возможностей */}
      <div
        className="p-4 rounded-2xl border space-y-2 text-[11px]"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
          color: activeTheme.textSecondary,
        }}
      >
        <span className="text-xs font-medium block">Что сейчас работает</span>
        <div className="flex justify-between">
          <span>Офлайн-работа на телефоне</span>
          <span className="font-medium" style={{ color: activeTheme.accent }}>Готово</span>
        </div>
        <div className="flex justify-between">
          <span>Анализ ритмов и связей</span>
          <span className="font-medium" style={{ color: activeTheme.accent }}>Готово</span>
        </div>
        <div className="flex justify-between">
          <span>Облачная синхронизация</span>
          <span style={{ color: activeTheme.textMuted }}>В следующем обновлении</span>
        </div>
        <div className="flex justify-between">
          <span>Синхронизация с часами и уведомления</span>
          <span style={{ color: activeTheme.textMuted }}>В версии для Android</span>
        </div>
      </div>
    </div>
  );
}
