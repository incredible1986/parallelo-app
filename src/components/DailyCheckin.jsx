import React, { useState } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';
import { WEEKLY_QUESTIONS } from '../data/questionsData';
import { IconPresence } from './RitualIcons';
import { WelcomeBanner } from './WelcomeBanner';
import { CocoonModal } from './CocoonModal';

export function DailyCheckin({ activeTheme, onSaveState }) {
  const dayIndex = new Date().getDay();
  const todayQuestions = WEEKLY_QUESTIONS.filter((q) => q.dayIndex === dayIndex);
  const [questionIdx, setQuestionIdx] = useState(0);
  const activeQuestion = todayQuestions[questionIdx] || WEEKLY_QUESTIONS[0];

  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedColor, setSelectedColor] = useState(MOOD_COLORS[0]);
  const [sensoryNote, setSensoryNote] = useState('');
  const [feltAlive, setFeltAlive] = useState(true);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  // Состояния для новых практик
  const [isCocoonOpen, setIsCocoonOpen] = useState(false);
  const [allowNoExpectations, setAllowNoExpectations] = useState(false);

  const isDandelionDay = selectedColor.id === 'stone'; // «Тёплый камень» — день спада/отдыха

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
    showMessage('Тихо. Этого достаточно.');
  };

  const handleSkip = (reason) => {
    setSelectedTag(reason);
    showMessage('Тихо. Этого достаточно.');
  };

  const showMessage = (msg) => {
    setSubmittedMessage(msg);
    setTimeout(() => {
      setSubmittedMessage(null);
    }, 4000);
  };

  const handleSave = () => {
    if (onSaveState) {
      onSaveState({
        color: selectedColor,
        tag: selectedTag,
        note: sensoryNote,
        feltAlive,
        isDandelionDay,
        date: new Date().toISOString(),
      });
    }
    showMessage('Зафиксировано в твоём саду. Дыши спокойно.');
  };

  return (
    <div className="space-y-5">
      {/* 0. Карточка ясности («Тест для папы»: Что это? Зачем? Что делать?) */}
      <WelcomeBanner activeTheme={activeTheme} />

      {/* 1. Блок вопроса вечера (Arena AI 14 вопросов) */}
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
            Вопрос вечера · {activeQuestion.day}
          </span>
          {todayQuestions.length > 1 && (
            <button
              onClick={() => setQuestionIdx((prev) => (prev + 1) % todayQuestions.length)}
              className="text-xs opacity-60 hover:opacity-100 underline decoration-dotted transition-opacity"
              style={{ color: activeTheme.textSecondary }}
            >
              Другой вопрос
            </button>
          )}
        </div>

        <h3
          className="text-lg font-serif font-normal leading-snug mb-4"
          style={{ color: activeTheme.textPrimary }}
        >
          {activeQuestion.question}
        </h3>

        {/* Теги для ответа в один тап */}
        <div className="flex flex-wrap gap-2 mb-4">
          {activeQuestion.tags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 border ${
                  isSelected
                    ? 'font-medium shadow-xs scale-105'
                    : 'bg-black/[0.02] hover:bg-black/[0.05]'
                }`}
                style={{
                  backgroundColor: isSelected ? activeTheme.primary : 'transparent',
                  color: isSelected ? '#FFFFFF' : activeTheme.textPrimary,
                  borderColor: isSelected ? activeTheme.primary : activeTheme.borderColor,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Равноправные кнопки «Пропустить» и «Не помню» */}
        <div className="flex items-center justify-between pt-3 border-t border-black/5 text-xs">
          <div className="flex gap-3">
            <button
              onClick={() => handleSkip('Не помню')}
              className="opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: activeTheme.textSecondary }}
            >
              Не помню
            </button>
            <span className="opacity-30">·</span>
            <button
              onClick={() => handleSkip('Пропустить')}
              className="opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: activeTheme.textSecondary }}
            >
              Пропустить
            </button>
          </div>

          {submittedMessage && (
            <span
              className="text-xs font-serif italic animate-pulse"
              style={{ color: activeTheme.accent }}
            >
              {submittedMessage}
            </span>
          )}
        </div>
      </div>

      {/* 2. Цветовой спектр дня (Лео Ауфман) */}
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
            Цвет твоего состояния
          </span>
          <span
            className="text-xs font-serif italic"
            style={{ color: selectedColor.hex }}
          >
            {selectedColor.name}
          </span>
        </div>

        <p
          className="text-xs mb-3.5 opacity-70"
          style={{ color: activeTheme.textSecondary }}
        >
          {selectedColor.desc}
        </p>

        {/* Палитра из 5 оттенков */}
        <div className="grid grid-cols-5 gap-2.5">
          {MOOD_COLORS.map((c) => {
            const isChosen = selectedColor.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c)}
                className={`group relative h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  isChosen
                    ? 'ring-2 ring-offset-2 scale-105 shadow-md'
                    : 'hover:scale-102 opacity-85 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: c.hex,
                  borderColor: 'rgba(0,0,0,0.1)',
                  ringColor: c.hex,
                }}
                title={c.name}
              >
                {isChosen && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs animate-presence-breathe" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.1 ПРАКТИКА: «ГОРЬКИЙ ОДУВАНЧИК» (Появляется при выборе камня/усталости) */}
      {isDandelionDay && (
        <div
          className="p-5 rounded-3xl border animate-fade-in transition-all shadow-xs"
          style={{
            backgroundColor: `${activeTheme.secondary}15`,
            borderColor: activeTheme.secondary,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🌼</span>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: activeTheme.secondary }}
            >
              День горького одуванчика
            </span>
          </div>

          <p
            className="text-xs leading-relaxed opacity-90 mb-3"
            style={{ color: activeTheme.textPrimary }}
          >
            «Зелень одуванчика полезно время от времени принимать в пищу. Горькое — тоже часть жизни».
            Сегодня спад, и это нормально. Тебе не нужно быть продуктивной, бодрой или удобной.
            Зима души — это не поломка, а время для покоя корней.
          </p>

          <button
            onClick={() => setAllowNoExpectations(!allowNoExpectations)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 border ${
              allowNoExpectations
                ? 'shadow-xs font-semibold'
                : 'bg-white/60 hover:bg-white'
            }`}
            style={{
              backgroundColor: allowNoExpectations ? activeTheme.secondary : 'transparent',
              color: allowNoExpectations ? '#FFFFFF' : activeTheme.textPrimary,
              borderColor: activeTheme.secondary,
            }}
          >
            <span>{allowNoExpectations ? '✓ Разрешение дано' : 'Разрешаю себе вечер без ожиданий'}</span>
          </button>
        </div>
      )}

      {/* 3. Кнопка истинного присутствия (Нина Николаевна) */}
      <div
        onClick={() => setFeltAlive(!feltAlive)}
        className={`p-4 rounded-3xl border cursor-pointer transition-all duration-300 flex items-center justify-between shadow-xs ${
          feltAlive ? 'scale-[1.01]' : 'opacity-70'
        }`}
        style={{
          backgroundColor: feltAlive ? activeTheme.surfaceContainer : activeTheme.surfaceCard,
          borderColor: feltAlive ? activeTheme.primary : activeTheme.borderColor,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform"
            style={{
              backgroundColor: feltAlive ? activeTheme.primary : 'rgba(0,0,0,0.04)',
              color: feltAlive ? '#FFFFFF' : activeTheme.textSecondary,
            }}
          >
            <IconPresence className="w-5 h-5" isPulsing={feltAlive} />
          </div>
          <div>
            <div
              className="text-xs font-medium font-serif leading-tight"
              style={{ color: activeTheme.textPrimary }}
            >
              «Только в этот момент чувствую жизнь»
            </div>
            <div
              className="text-[11px] opacity-70 mt-0.5"
              style={{ color: activeTheme.textSecondary }}
            >
              {feltAlive ? 'Точка заземления активна' : 'Нажми, чтобы зафиксировать присутствие'}
            </div>
          </div>
        </div>

        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            feltAlive ? 'border-transparent' : 'border-black/20'
          }`}
          style={{ backgroundColor: feltAlive ? activeTheme.accent : 'transparent' }}
        >
          {feltAlive && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      {/* 4. Блок: ПРАКТИКА «СБРОСИТЬ КОКОН» (Миссис Бентли) */}
      <div
        onClick={() => setIsCocoonOpen(true)}
        className="p-4 rounded-3xl border border-dashed cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between"
        style={{
          borderColor: activeTheme.borderColor,
          backgroundColor: 'rgba(0,0,0,0.015)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{
              backgroundColor: `${activeTheme.accent}15`,
              color: activeTheme.accent,
            }}
          >
            🍂
          </div>
          <div>
            <div
              className="text-xs font-serif font-medium"
              style={{ color: activeTheme.textPrimary }}
            >
              Сбросить кокон (Практика отпускания)
            </div>
            <div
              className="text-[11px] opacity-70"
              style={{ color: activeTheme.textSecondary }}
            >
              «Схорони то, чем ты не являешься сегодня вечером»
            </div>
          </div>
        </div>

        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            backgroundColor: activeTheme.surfaceContainer,
            color: activeTheme.textPrimary,
          }}
        >
          Открыть →
        </span>
      </div>

      {/* 5. Сенсорная заметка (необязательно) */}
      <div
        className="p-4 rounded-3xl border transition-all duration-300 shadow-sm"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <label
          htmlFor="sensoryNote"
          className="block text-[11px] font-semibold tracking-wider uppercase opacity-70 mb-2"
          style={{ color: activeTheme.textSecondary }}
        >
          Сенсорный отклик (по желанию)
        </label>
        <textarea
          id="sensoryNote"
          rows={2}
          value={sensoryNote}
          onChange={(e) => setSensoryNote(e.target.value)}
          placeholder="Запах веников, тепло горячей кружки, прохлада воздуха..."
          className="w-full text-xs p-2.5 rounded-xl bg-black/[0.02] border border-black/5 focus:outline-none focus:ring-1 transition-all resize-none"
          style={{ color: activeTheme.textPrimary, ringColor: activeTheme.primary }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-full text-xs font-medium transition-all shadow-xs hover:shadow-md hover:scale-102"
            style={{
              backgroundColor: activeTheme.primary,
              color: '#FFFFFF',
            }}
          >
            Сохранить в саду
          </button>
        </div>
      </div>

      {/* Модальное окно ритуала отпускания */}
      <CocoonModal
        activeTheme={activeTheme}
        isOpen={isCocoonOpen}
        onClose={() => setIsCocoonOpen(false)}
      />
    </div>
  );
}
