import React, { useState, useEffect } from 'react';
import { MOOD_COLORS } from '../data/brandingTokens';
import { WEEKLY_QUESTIONS } from '../data/questionsData';
import { StorageService } from '../services/storage';
import { IconPresence } from './RitualIcons';
import { WelcomeBanner } from './WelcomeBanner';
import { CocoonModal } from './CocoonModal';

export function DailyCheckin({ activeTheme, onSaveState }) {
  const dayIndex = new Date().getDay();
  const todayQuestions = WEEKLY_QUESTIONS.filter((q) => q.dayIndex === dayIndex);
  const [questionIdx, setQuestionIdx] = useState(0);
  const activeQuestion = todayQuestions[questionIdx] || WEEKLY_QUESTIONS[0];

  const [selectedTag, setSelectedTag] = useState(() => StorageService.get('parallelo_today_tag', null));
  const [selectedColor, setSelectedColor] = useState(() => {
    const saved = StorageService.get('parallelo_today_color', null);
    if (!saved) return MOOD_COLORS[0];
    return MOOD_COLORS.find(c => c.id === saved.id) || MOOD_COLORS[0];
  });
  const [sensoryNote, setSensoryNote] = useState(() => StorageService.get('parallelo_today_note', ''));
  const [feltAlive, setFeltAlive] = useState(() => StorageService.get('parallelo_today_alive', true));
  const [submittedMessage, setSubmittedMessage] = useState(null);

  // Самочувствие тела и симптомы (Режим пледа и заботы)
  const [wellbeing, setWellbeing] = useState(() => 
    StorageService.get('parallelo_today_wellbeing', 'in_flow')
  );
  const [symptoms, setSymptoms] = useState(() => 
    StorageService.get('parallelo_today_symptoms', [])
  );
  const [careActionDone, setCareActionDone] = useState(null);

  const SYMPTOMS_LIST = [
    { id: 'throat', label: 'Першит горло' },
    { id: 'head', label: 'Шумит голова' },
    { id: 'weakness', label: 'Слабость и ломота' },
    { id: 'fever', label: 'Озноб / Температура' },
    { id: 'nose', label: 'Насморк / Заложенность' },
    { id: 'eyes', label: 'Тяжесть в глазах' },
    { id: 'cough', label: 'Кашель' },
  ];

  // Состояния для практик
  const [isCocoonOpen, setIsCocoonOpen] = useState(false);
  const [allowNoExpectations, setAllowNoExpectations] = useState(false);

  const isDandelionDay = selectedColor.id === 'stone' || wellbeing === 'sick';

  const handleWellbeingChange = (mode) => {
    setWellbeing(mode);
    StorageService.set('parallelo_today_wellbeing', mode);
    if (mode === 'sick') {
      const healingColor = MOOD_COLORS.find(c => c.id === 'sage') || MOOD_COLORS[2];
      setSelectedColor(healingColor);
      StorageService.set('parallelo_today_color', healingColor);
      setAllowNoExpectations(true);
      showMessage('Включён режим восстановления. Сегодня только покой и тепло.');
    } else if (mode === 'tired') {
      const stoneColor = MOOD_COLORS.find(c => c.id === 'stone') || MOOD_COLORS[4];
      setSelectedColor(stoneColor);
      StorageService.set('parallelo_today_color', stoneColor);
      showMessage('Усталость услышана. Вечер для мягкого замедления.');
    } else {
      showMessage('Тело в ресурсе и силе. Хорошего вечера.');
    }
  };

  const handleToggleSymptom = (symLabel) => {
    let updated;
    if (symptoms.includes(symLabel)) {
      updated = symptoms.filter(s => s !== symLabel);
    } else {
      updated = [...symptoms, symLabel];
    }
    setSymptoms(updated);
    StorageService.set('parallelo_today_symptoms', updated);
  };

  const handleColorPick = (color) => {
    setSelectedColor(color);
    StorageService.set('parallelo_today_color', color);
  };

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
    StorageService.set('parallelo_today_tag', tag);
    showMessage('Тихо. Этого достаточно.');
  };

  const handleSkip = (reason) => {
    setSelectedTag(reason);
    StorageService.set('parallelo_today_tag', reason);
    showMessage('Тихо. Этого достаточно.');
  };

  const showMessage = (msg) => {
    setSubmittedMessage(msg);
    setTimeout(() => {
      setSubmittedMessage(null);
    }, 4000);
  };

  const handleSave = () => {
    StorageService.set('parallelo_today_color', selectedColor);
    StorageService.set('parallelo_today_tag', selectedTag);
    StorageService.set('parallelo_today_note', sensoryNote);
    StorageService.set('parallelo_today_alive', feltAlive);
    StorageService.set('parallelo_today_wellbeing', wellbeing);
    StorageService.set('parallelo_today_symptoms', symptoms);

    // Добавляем в историю дней
    const history = StorageService.get('parallelo_history', []);
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = history.filter(h => h.date !== todayStr);
    filtered.unshift({
      date: todayStr,
      color: selectedColor.hex,
      mood: selectedColor.name,
      tag: selectedTag,
      note: sensoryNote,
      feltAlive,
      isDandelionDay,
      wellbeing,
      symptoms,
    });
    StorageService.set('parallelo_history', filtered.slice(0, 60));

    if (onSaveState) {
      onSaveState({
        color: selectedColor,
        tag: selectedTag,
        note: sensoryNote,
        feltAlive,
        isDandelionDay,
        wellbeing,
        symptoms,
        date: new Date().toISOString(),
      });
    }
    showMessage('Зафиксировано в твоём саду. Дыши спокойно.');
  };

  const displayQuestion = wellbeing === 'sick' 
    ? 'Что прямо сейчас согреет и принесёт телу облегчение?' 
    : activeQuestion.question;

  const displayTags = wellbeing === 'sick'
    ? ['Горячий чай с лимоном', 'Тёплое одеяло', 'Тишина и долгий сон', 'Свежий воздух из форточки']
    : activeQuestion.tags;

  return (
    <div className="space-y-5">
      {/* 0. Карточка ясности («Тест для папы»: Что это? Зачем? Что делать?) */}
      <WelcomeBanner activeTheme={activeTheme} />

      {/* 0.5. Блок «Самочувствие тела и симптомы» (Режим пледа и заботы) */}
      <div
        className="p-5 rounded-3xl border transition-all duration-300 shadow-sm space-y-3.5"
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
              Самочувствие тела
            </span>
            <div className="text-sm font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
              Как себя чувствует тело сегодня?
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
              wellbeing === 'sick'
                ? 'bg-purple-500/15 text-purple-800'
                : wellbeing === 'tired'
                ? 'bg-amber-500/15 text-amber-800'
                : 'bg-emerald-500/15 text-emerald-800'
            }`}
          >
            {wellbeing === 'sick' ? 'Режим покоя 🍵' : wellbeing === 'tired' ? 'Усталость ☁️' : 'В ресурсе ✨'}
          </span>
        </div>

        {/* 3 состояния: В ресурсе, Усталость, Приболела */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'in_flow', label: 'В ресурсе', icon: '✨' },
            { id: 'tired', label: 'Усталость', icon: '☁️' },
            { id: 'sick', label: 'Приболела', icon: '🍵' },
          ].map((item) => {
            const isSel = wellbeing === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleWellbeingChange(item.id)}
                className={`py-2 px-1.5 rounded-2xl border text-center transition-all ${
                  isSel ? 'shadow-xs font-semibold scale-102' : 'opacity-65 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSel ? activeTheme.surfaceContainer : 'transparent',
                  borderColor: isSel ? activeTheme.primary : activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              >
                <div className="text-base">{item.icon}</div>
                <div className="text-[11px] font-serif mt-0.5">{item.label}</div>
              </button>
            );
          })}
        </div>

        {/* Раскрывающийся блок симптомов, если выбрано «Приболела» */}
        {wellbeing === 'sick' && (
          <div className="space-y-3 pt-2 border-t border-black/5 animate-fade-in">
            <span
              className="text-[11px] font-semibold tracking-wider uppercase opacity-70 block"
              style={{ color: activeTheme.textSecondary }}
            >
              Что сейчас ощущается в теле:
            </span>

            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS_LIST.map((sym) => {
                const isChecked = symptoms.includes(sym.label);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleToggleSymptom(sym.label)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      isChecked
                        ? 'font-medium shadow-xs scale-102 bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-black/[0.02] border-black/5 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      color: isChecked ? undefined : activeTheme.textPrimary,
                    }}
                  >
                    {sym.label} {isChecked && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Островок выздоровления */}
            <div
              className="p-4 rounded-2xl border text-xs space-y-2.5"
              style={{
                backgroundColor: `${activeTheme.secondary}12`,
                borderColor: `${activeTheme.secondary}30`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🫖 🛌</span>
                <div className="font-serif font-semibold" style={{ color: activeTheme.textPrimary }}>
                  Островок выздоровления
                </div>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: activeTheme.textSecondary }}>
                Твоё тело занято важным делом — оно восстанавливается. Разреши себе сегодня не соответствовать ничьим ожиданиям.
              </p>

              {/* Быстрые действия заботы */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCareActionDone('Чай заварен. Тепло согревает изнутри.');
                    setTimeout(() => setCareActionDone(null), 3500);
                  }}
                  className="p-2 rounded-xl bg-white border border-black/10 text-left text-[11px] hover:shadow-xs transition-all"
                  style={{ color: activeTheme.textPrimary }}
                >
                  <div className="font-serif">🍵 Тёплый чай/морс</div>
                  <div className="text-[9px] opacity-60">С лимоном или травами</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCareActionDone('Одеяло укутало. Спи спокойно, ничего не сгорит.');
                    setTimeout(() => setCareActionDone(null), 3500);
                  }}
                  className="p-2 rounded-xl bg-white border border-black/10 text-left text-[11px] hover:shadow-xs transition-all"
                  style={{ color: activeTheme.textPrimary }}
                >
                  <div className="font-serif">🛌 Укутаться в плед</div>
                  <div className="text-[9px] opacity-60">Сон — лучшее лекарство</div>
                </button>
              </div>

              {careActionDone && (
                <div className="text-center font-serif italic text-xs text-purple-900 pt-1 animate-fade-in">
                  {careActionDone}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
          {todayQuestions.length > 1 && wellbeing !== 'sick' && (
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
          {displayQuestion}
        </h3>

        {/* Теги для ответа в один тап */}
        <div className="flex flex-wrap gap-2 mb-4">
          {displayTags.map((tag) => {
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
                onClick={() => handleColorPick(c)}
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
