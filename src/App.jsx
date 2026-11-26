import React, { useState, useEffect, useMemo } from 'react';
import { PALETTES } from './data/brandingTokens';
import { RITUALS_CATALOG } from './data/questionsData';
import {
  StorageService,
  getLocalDateKey,
  createEmptyDayRecord,
} from './services/storage';
import { computeFullAnalytics } from './services/analytics';
import { Header } from './components/Header';
import { DailyCheckin } from './components/DailyCheckin';
import { RitualLogger } from './components/RitualLogger';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { UserProfileCard } from './components/UserProfileCard';
import { CheckupsView } from './components/CheckupsView';
import { PinLockScreen } from './components/PinLockScreen';
import { SplashScreen } from './components/SplashScreen';
import {
  IconChart,
  IconClipboard,
  IconPulse,
  IconSliders,
  IconUser,
} from './components/RitualIcons';

// Разовая безопасная миграция v1 -> v2 (без очистки хранилища)
StorageService.migrateFromV1IfNeeded();

export default function App() {
  const [profile, setProfile] = useState(() => StorageService.getProfile());
  const [allRecords, setAllRecords] = useState(() => StorageService.getAllRecords());
  const [shoppingPauses, setShoppingPauses] = useState(() => StorageService.getShoppingPauses());
  const [customFactors, setCustomFactors] = useState(() => StorageService.getCustomFactors());
  const [checkups, setCheckups] = useState(() => StorageService.getCheckups());
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey());
  const [activeTab, setActiveTab] = useState('today');
  const [showSplash, setShowSplash] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(() => !StorageService.hasPin());

  const activeTheme = PALETTES[profile.themeId] || PALETTES.obsidian;
  const fullCatalog = useMemo(() => [...RITUALS_CATALOG, ...customFactors], [customFactors]);

  // Синхронизируем цвет статус-бара PWA и фон body с выбранной темой
  useEffect(() => {
    document.body.style.backgroundColor = activeTheme.surface;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', activeTheme.surface);
    }
  }, [activeTheme]);

  const currentDayRecord = useMemo(() => {
    const existing = allRecords[selectedDate];
    return existing
      ? { ...createEmptyDayRecord(selectedDate), ...existing }
      : createEmptyDayRecord(selectedDate);
  }, [allRecords, selectedDate]);

  const analyticsSummary = useMemo(
    () =>
      computeFullAnalytics(allRecords, fullCatalog, {
        excludeSick: profile.excludeSickFromBaseline ?? true,
        trackDigestion: profile.trackDigestion ?? true,
        trackCycle: Boolean(profile.trackCycle),
        cycleLength: Number(profile.cycleLength || 28),
        shoppingPauses,
      }),
    [
      allRecords,
      fullCatalog,
      profile.excludeSickFromBaseline,
      profile.trackDigestion,
      profile.trackCycle,
      profile.cycleLength,
      shoppingPauses,
    ]
  );

  const handleUpdateDay = (dateKey, patch) => {
    StorageService.saveDayRecord(dateKey, patch);
    setAllRecords(StorageService.getAllRecords());
  };

  const handleUpdateProfile = (patch) => {
    const next = StorageService.saveProfile(patch);
    setProfile(next);
  };

  const handleSelectTheme = (themeObj) => {
    handleUpdateProfile({ themeId: themeObj.id });
  };

  const handleQuickToggleTheme = () => {
    const nextId = activeTheme.isDark ? 'limestone' : 'obsidian';
    handleUpdateProfile({ themeId: nextId });
  };

  const handleUpdatePauses = (nextPauses) => {
    StorageService.saveShoppingPauses(nextPauses);
    setShoppingPauses(nextPauses);
  };

  const handleUpdateCustomFactors = (nextFactors) => {
    StorageService.saveCustomFactors(nextFactors);
    setCustomFactors(nextFactors);
  };

  const handleUpdateCheckups = (patch) => {
    setCheckups((prev) => StorageService.saveCheckups({ ...prev, ...patch }));
  };

  const handleRefreshFromStorage = () => {
    setProfile(StorageService.getProfile());
    setAllRecords(StorageService.getAllRecords());
    setShoppingPauses(StorageService.getShoppingPauses());
    setCustomFactors(StorageService.getCustomFactors());
    setCheckups(StorageService.getCheckups());
  };

  const handleJumpToDate = (dateKey) => {
    setSelectedDate(dateKey);
    setActiveTab('today');
  };

  const navItems = [
    { id: 'today', label: 'Сегодня', Icon: IconPulse },
    { id: 'factors', label: 'Факторы', Icon: IconSliders },
    { id: 'analytics', label: 'Аналитика', Icon: IconChart },
    { id: 'checkup', label: 'Чекап', Icon: IconClipboard },
    { id: 'profile', label: 'Профиль', Icon: IconUser },
  ];

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isUnlocked) {
    return <PinLockScreen activeTheme={activeTheme} onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300 flex flex-col items-center font-sans"
      style={{
        backgroundColor: activeTheme.surface,
        color: activeTheme.textPrimary,
      }}
    >
      <div
        className="w-full max-w-md min-h-screen flex flex-col relative"
        style={{ backgroundColor: activeTheme.surface }}
      >
        <Header
          activeTheme={activeTheme}
          onQuickToggleTheme={handleQuickToggleTheme}
          onReplaySplash={() => setShowSplash(true)}
          totalDays={analyticsSummary.totalDays}
        />

        <main className="flex-1 px-4 py-4 pb-24">
          {activeTab === 'today' && (
            <DailyCheckin
              activeTheme={activeTheme}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              dayRecord={currentDayRecord}
              allRecords={allRecords}
              catalog={fullCatalog}
              onUpdateDay={handleUpdateDay}
              profile={profile}
              baselineMean={analyticsSummary.mean}
            />
          )}

          {activeTab === 'factors' && (
            <RitualLogger
              activeTheme={activeTheme}
              selectedDate={selectedDate}
              dayRecord={currentDayRecord}
              allRecords={allRecords}
              catalog={fullCatalog}
              onUpdateDay={handleUpdateDay}
              shoppingPauses={shoppingPauses}
              onUpdatePauses={handleUpdatePauses}
              customFactors={customFactors}
              onUpdateCustomFactors={handleUpdateCustomFactors}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              activeTheme={activeTheme}
              allRecords={allRecords}
              profile={profile}
              customFactors={customFactors}
              shoppingPauses={shoppingPauses}
              onToggleExcludeSick={() =>
                handleUpdateProfile({
                  excludeSickFromBaseline: !(profile.excludeSickFromBaseline ?? true),
                })
              }
              onSelectDateToEdit={handleJumpToDate}
            />
          )}

          {activeTab === 'checkup' && (
            <CheckupsView
              activeTheme={activeTheme}
              checkups={checkups}
              onUpdateCheckups={handleUpdateCheckups}
              allRecords={allRecords}
            />
          )}

          {activeTab === 'profile' && (
            <UserProfileCard
              activeTheme={activeTheme}
              onSelectTheme={handleSelectTheme}
              profile={profile}
              catalog={fullCatalog}
              onUpdateProfile={handleUpdateProfile}
              onDataImportedOrReset={handleRefreshFromStorage}
            />
          )}
        </main>

        {/* Фиксированная нижняя навигация с учётом safe-area на смартфонах */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
          style={{
            backgroundColor: `${activeTheme.surfaceCard}F2`,
            borderColor: activeTheme.borderColor,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-2">
            {navItems.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="flex flex-col items-center justify-center gap-1 transition-colors"
                  style={{
                    color: isActive ? activeTheme.primary : activeTheme.textSecondary,
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold' : 'font-normal'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
