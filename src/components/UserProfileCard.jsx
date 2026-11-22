import React, { useState, useRef } from 'react';
import { PALETTES, SEASONS } from '../data/brandingTokens';
import { StorageService } from '../services/storage';
import { computeHydrationTarget } from '../services/analytics';
import { IconDownload, IconDrop, IconUpload } from './RitualIcons';

/**
 * Профиль, палитры, формула тела, резервное копирование (JSON) и честный статус системы.
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
    });
    flashNotice('Параметры профиля сохранены.');
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
    flashNotice('Резервная копия JSON скачана.');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const count = StorageService.importBackup(String(ev.target?.result || ''));
        onDataImportedOrReset();
        flashNotice(`Импортировано записей: ${count}.`);
      } catch (err) {
        flashNotice(err.message || 'Ошибка чтения JSON.');
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
    flashNotice('Локальное хранилище очищено.');
  };

  return (
    <div className="space-y-4">
      <div>
        <span
          className="text-[10px] font-mono uppercase tracking-widest block"
          style={{ color: activeTheme.textSecondary }}
        >
          Настройки и данные
        </span>
        <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
          Профиль и калибровка
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

      {/* 1. Визуальная тема */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-widest block"
          style={{ color: activeTheme.textSecondary }}
        >
          Цветовая схема интерфейса
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

      {/* 2. Основные данные и сезон жизни (единый источник истины) */}
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
            className="block text-[10px] font-mono uppercase tracking-widest mb-1.5"
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
          <span
            className="block text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: activeTheme.textSecondary }}
          >
            Сезон жизни (возрастной ориентир)
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
                      className="text-[10px] font-mono tabular-nums"
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

        {/* Ориентиры тела + прозрачная формула воды */}
        <div
          className="pt-3 border-t space-y-2.5"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: activeTheme.textSecondary }}
            >
              Параметры тела (для формулы воды)
            </span>
            <span className="text-[10px]" style={{ color: activeTheme.textMuted }}>
              без диет и целей по весу
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="heightInput" className="text-[10px] block mb-1" style={{ color: activeTheme.textSecondary }}>
                Рост (см)
              </label>
              <input
                id="heightInput"
                type="number"
                placeholder="168"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full text-xs font-mono tabular-nums p-2 rounded-xl border focus:outline-none"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              />
            </div>
            <div>
              <label htmlFor="weightInput" className="text-[10px] block mb-1" style={{ color: activeTheme.textSecondary }}>
                Вес (кг)
              </label>
              <input
                id="weightInput"
                type="number"
                placeholder="64"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full text-xs font-mono tabular-nums p-2 rounded-xl border focus:outline-none"
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
                Базовая норма воды:
              </span>
              <span className="font-mono tabular-nums font-medium" style={{ color: activeTheme.textPrimary }}>
                {hydrationPreview.baseMl} мл ({weight} × 30)
              </span>
            </div>
          )}
        </div>

        {/* Исключение дней болезни */}
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
            <div className="text-[10px]" style={{ color: activeTheme.textSecondary }}>
              Рекомендуется, чтобы простуда не смещала σ и тренд
            </div>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: excludeSick ? activeTheme.accent : activeTheme.surfaceCard,
              color: excludeSick ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            {excludeSick ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </button>

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

      {/* 3. Резервное копирование данных (защита от очистки браузера) */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: activeTheme.textSecondary }}
          >
            Безопасность данных · Local-First
          </span>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: activeTheme.textSecondary }}>
            Все наблюдения хранятся локально на вашем устройстве. Делайте экспорт JSON перед очисткой браузера или переносом на другой смартфон.
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
            Экспорт JSON
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
            Импорт JSON
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
            {confirmReset ? 'Подтвердить полное удаление локальных данных?' : 'Сбросить локальные данные'}
          </button>
        </div>
      </div>

      {/* 4. Честный статус системных модулей */}
      <div
        className="p-4 rounded-2xl border space-y-2 text-[11px]"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
          color: activeTheme.textSecondary,
        }}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest block">
          Статус модулей v2.0
        </span>
        <div className="flex justify-between">
          <span>Хранилище и офлайн-кэш (SW)</span>
          <span className="font-mono" style={{ color: activeTheme.accent }}>Активно</span>
        </div>
        <div className="flex justify-between">
          <span>Математическое ядро (МНК, σ, лаги)</span>
          <span className="font-mono" style={{ color: activeTheme.accent }}>Активно</span>
        </div>
        <div className="flex justify-between">
          <span>Облачная синхронизация (.NET API)</span>
          <span className="font-mono" style={{ color: activeTheme.textMuted }}>В очереди</span>
        </div>
        <div className="flex justify-between">
          <span>Push-уведомления и Health Connect</span>
          <span className="font-mono" style={{ color: activeTheme.textMuted }}>Android Wrapper</span>
        </div>
      </div>
    </div>
  );
}
