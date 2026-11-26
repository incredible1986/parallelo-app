import React, { useState, useRef } from 'react';
import { PALETTES, SEASONS } from '../data/brandingTokens';
import { StorageService } from '../services/storage';
import { computeHydrationTarget } from '../services/analytics';
import { IconDownload, IconDrop, IconShield, IconUpload } from './RitualIcons';

/**
 * Профиль, темы, ориентиры тела, PIN-защита, резервное копирование и дисклеймер.
 */
export function UserProfileCard({
  activeTheme,
  onSelectTheme,
  profile,
  catalog = [],
  onUpdateProfile,
  onDataImportedOrReset,
}) {
  const [name, setName] = useState(profile.name || '');
  const [season, setSeason] = useState(profile.season || 'apples');
  const [height, setHeight] = useState(profile.height || '');
  const [weight, setWeight] = useState(profile.weight || '');
  const [excludeSick, setExcludeSick] = useState(profile.excludeSickFromBaseline ?? true);
  const [trackDigestion, setTrackDigestion] = useState(profile.trackDigestion ?? true);
  const [trackCycle, setTrackCycle] = useState(Boolean(profile.trackCycle));
  const [cycleLength, setCycleLength] = useState(Number(profile.cycleLength || 28));
  const [hasPin, setHasPin] = useState(() => StorageService.hasPin());
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [notice, setNotice] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef(null);

  const hydrationPreview = computeHydrationTarget(weight, { rituals: [] });

  const flashNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCycleLengthChange = (delta) => {
    const nextLen = Math.max(21, Math.min(40, Number(cycleLength || 28) + delta));
    setCycleLength(nextLen);
    onUpdateProfile({ cycleLength: nextLen });
  };

  const handleSave = () => {
    onUpdateProfile({
      name: name.trim(),
      season,
      height: height ? String(height) : '',
      weight: weight ? String(weight) : '',
      excludeSickFromBaseline: excludeSick,
      trackDigestion,
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
    flashNotice('Резервная копия JSON скачана.');
  };

  const handleExportCsv = () => {
    const csv = StorageService.exportCsv(catalog);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parallelo-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flashNotice('Таблица CSV скачана.');
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    try {
      await StorageService.setPin(pinInput);
      setHasPin(true);
      setIsSettingPin(false);
      setPinInput('');
      flashNotice('PIN-код установлен. При следующем открытии приложение запросит его.');
    } catch (err) {
      flashNotice(err.message);
    }
  };

  const handleDisablePin = () => {
    StorageService.clearPin();
    setHasPin(false);
    setIsSettingPin(false);
    setPinInput('');
    flashNotice('PIN-код отключён.');
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
            onBlur={() => onUpdateProfile({ name: name.trim() })}
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
                  onClick={() => {
                    setSeason(s.id);
                    onUpdateProfile({ season: s.id });
                  }}
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
                onBlur={() => onUpdateProfile({ height: height ? String(height) : '' })}
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
                onBlur={() => onUpdateProfile({ weight: weight ? String(weight) : '' })}
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
          onClick={() => {
            const nextVal = !excludeSick;
            setExcludeSick(nextVal);
            onUpdateProfile({ excludeSickFromBaseline: nextVal });
          }}
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

        {/* Опциональный учёт пищеварения */}
        <button
          type="button"
          onClick={() => {
            const nextVal = !trackDigestion;
            setTrackDigestion(nextVal);
            onUpdateProfile({ trackDigestion: nextVal });
            flashNotice(nextVal ? 'Учёт пищеварения включён.' : 'Учёт пищеварения выключен.');
          }}
          className="w-full p-3 rounded-xl border flex items-center justify-between text-left"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
          }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
              Отслеживать пищеварение и стул
            </div>
            <div className="text-[11px]" style={{ color: activeTheme.textSecondary }}>
              Связь ЖКТ со стрессом, водой, питанием и циклом
            </div>
          </div>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: trackDigestion ? activeTheme.accent : activeTheme.surfaceCard,
              color: trackDigestion ? activeTheme.primaryText : activeTheme.textSecondary,
            }}
          >
            {trackDigestion ? 'Вкл' : 'Выкл'}
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
            onClick={() => {
              const nextVal = !trackCycle;
              setTrackCycle(nextVal);
              onUpdateProfile({ trackCycle: nextVal });
              flashNotice(nextVal ? 'Учёт цикла включён.' : 'Учёт цикла выключен.');
            }}
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
                  onClick={() => handleCycleLengthChange(-1)}
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
                  onClick={() => handleCycleLengthChange(1)}
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

      {/* 3. Защита PIN-кодом и резервное копирование */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconShield className="w-4 h-4" style={{ color: activeTheme.primary }} />
            <span className="text-xs font-medium" style={{ color: activeTheme.textSecondary }}>
              Блокировка по PIN-коду
            </span>
          </div>
          {hasPin ? (
            <button
              type="button"
              onClick={handleDisablePin}
              className="text-[11px] px-2.5 py-1 rounded-lg border"
              style={{ borderColor: activeTheme.borderColor, color: activeTheme.danger }}
            >
              Отключить PIN
            </button>
          ) : (
            !isSettingPin && (
              <button
                type="button"
                onClick={() => setIsSettingPin(true)}
                className="text-[11px] px-2.5 py-1 rounded-lg border"
                style={{ borderColor: activeTheme.borderColor, color: activeTheme.primary }}
              >
                Установить PIN
              </button>
            )
          )}
        </div>

        {isSettingPin && (
          <form onSubmit={handleSavePin} className="flex items-center gap-2 pt-1 animate-fade-in">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 цифры"
              autoFocus
              className="w-28 text-center tracking-widest text-xs p-2 rounded-xl border focus:outline-none"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
                color: activeTheme.textPrimary,
              }}
            />
            <button
              type="submit"
              disabled={pinInput.length !== 4}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                pinInput.length !== 4 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              style={{ backgroundColor: activeTheme.primary, color: activeTheme.primaryText }}
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSettingPin(false);
                setPinInput('');
              }}
              className="px-2 py-2 text-xs"
              style={{ color: activeTheme.textSecondary }}
            >
              Отмена
            </button>
          </form>
        )}

        <div className="pt-2 border-t" style={{ borderColor: activeTheme.borderColor }}>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Сохранение и экспорт данных
          </span>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: activeTheme.textMuted }}>
            Внимание: файлы экспорта содержат ваши личные записи (самочувствие, вещества, цикл) в открытом виде — храните их в надёжном месте.
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
            Копия JSON
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textPrimary,
            }}
          >
            <IconDownload className="w-3.5 h-3.5" />
            Таблица CSV
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            borderColor: activeTheme.borderColor,
            color: activeTheme.textPrimary,
          }}
        >
          <IconUpload className="w-3.5 h-3.5" />
          Загрузить копию JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />

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

      {/* 4. Статус возможностей и дисклеймер */}
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
        <p className="pt-2 border-t text-[10px] leading-relaxed" style={{ borderColor: activeTheme.borderColor, color: activeTheme.textMuted }}>
          Parallelo — инструмент личных наблюдений и саморефлексии, не является медицинским изделием и не заменяет консультацию врача.
        </p>
      </div>
    </div>
  );
}
