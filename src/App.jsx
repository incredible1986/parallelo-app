import React, { useState, useEffect } from 'react';
import { PALETTES } from './data/brandingTokens';
import { StorageService } from './services/storage';
import { Header } from './components/Header';
import { ThemeSelector } from './components/ThemeSelector';
import { DailyCheckin } from './components/DailyCheckin';
import { RitualLogger } from './components/RitualLogger';
import { SundayReflection } from './components/SundayReflection';

export default function App() {
  const [activeTheme, setActiveTheme] = useState(() => {
    const savedId = StorageService.get('parallelo_theme_id', 'azure_spring');
    return PALETTES[savedId] || PALETTES.azure_spring;
  });
  const [activeTab, setActiveTab] = useState('today');

  const handleSelectTheme = (theme) => {
    setActiveTheme(theme);
    StorageService.set('parallelo_theme_id', theme.id);
  };

  return (
    <div
      className="min-h-screen transition-colors duration-500 flex flex-col items-center justify-start py-0 md:py-8 font-sans selection:bg-amber-200"
      style={{ backgroundColor: activeTheme.surface }}
    >
      {/* Мобильный контейнер-смартфон (390-440px) */}
      <div
        className="w-full max-w-md min-h-screen md:min-h-[844px] flex flex-col justify-between rounded-none md:rounded-[44px] shadow-none md:shadow-2xl border-0 md:border md:border-black/5 overflow-hidden transition-all duration-500 relative"
        style={{
          backgroundColor: activeTheme.surface,
          borderColor: activeTheme.borderColor,
        }}
      >
        {/* Верхняя часть: Шапка и Переключатель 3 палитр */}
        <div>
          <Header activeTheme={activeTheme} />
          
          <div className="px-5 pt-3 pb-2 flex justify-center">
            <ThemeSelector
              activeTheme={activeTheme}
              onSelectTheme={handleSelectTheme}
            />
          </div>
        </div>

        {/* Основной скроллящийся контент экрана */}
        <main className="flex-1 px-5 py-4 overflow-y-auto pb-24">
          {activeTab === 'today' && (
            <DailyCheckin activeTheme={activeTheme} />
          )}

          {activeTab === 'rituals' && (
            <RitualLogger activeTheme={activeTheme} />
          )}

          {activeTab === 'reflection' && (
            <SundayReflection activeTheme={activeTheme} />
          )}
        </main>

        {/* Нижний плавающий таб-бар (3 вкладки по спецификации Stitch) */}
        <nav
          className="absolute bottom-4 left-5 right-5 h-16 rounded-3xl backdrop-blur-xl border flex items-center justify-around px-2 shadow-lg transition-all duration-300 z-50"
          style={{
            backgroundColor: `${activeTheme.surfaceCard}EE`,
            borderColor: activeTheme.borderColor,
          }}
        >
          {/* Вкладка 1: Сегодня */}
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-20 py-1.5 rounded-2xl ${
              activeTab === 'today' ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'today' ? activeTheme.primary : activeTheme.textSecondary }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: activeTab === 'today' ? activeTheme.surfaceContainer : 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <span className="text-[10px] font-medium tracking-tight">Сегодня</span>
          </button>

          {/* Вкладка 2: Якоря */}
          <button
            onClick={() => setActiveTab('rituals')}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-20 py-1.5 rounded-2xl ${
              activeTab === 'rituals' ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'rituals' ? activeTheme.primary : activeTheme.textSecondary }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: activeTab === 'rituals' ? activeTheme.surfaceContainer : 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c6.4 3.6 6.4 10.9 0 16C5.6 13.9 5.6 6.6 12 3Z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium tracking-tight">Якоря</span>
          </button>

          {/* Вкладка 3: Зеркало */}
          <button
            onClick={() => setActiveTab('reflection')}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-20 py-1.5 rounded-2xl ${
              activeTab === 'reflection' ? 'scale-105' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'reflection' ? activeTheme.primary : activeTheme.textSecondary }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: activeTab === 'reflection' ? activeTheme.surfaceContainer : 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium tracking-tight">Зеркало</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
