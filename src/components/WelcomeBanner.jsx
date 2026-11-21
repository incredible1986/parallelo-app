import React, { useState } from 'react';

/**
 * Карточка первого контакта («Тест для папы»)
 * С первого взгляда отвечает на вопросы: Что это? Зачем я здесь? Что делать?
 */
export function WelcomeBanner({ activeTheme }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsOpen(true)}
          className="text-[11px] opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity underline decoration-dotted"
          style={{ color: activeTheme.textSecondary }}
        >
          <span>Зачем мне Parallelo?</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-3xl border mb-5 transition-all duration-300 relative overflow-hidden shadow-xs"
      style={{
        backgroundColor: activeTheme.surfaceContainer,
        borderColor: activeTheme.borderColor,
      }}
    >
      {/* Кнопка скрыть */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 text-xs opacity-50 hover:opacity-100 p-1 transition-opacity"
        style={{ color: activeTheme.textSecondary }}
        title="Свернуть подсказку"
      >
        ✕
      </button>

      {/* 1. ЧТО ЭТО */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${activeTheme.primary}15`,
            color: activeTheme.primary,
          }}
        >
          Островок заземления
        </span>
        <span className="text-xs font-serif italic opacity-75" style={{ color: activeTheme.textSecondary }}>
          15 секунд в день
        </span>
      </div>

      <h2
        className="text-base font-serif font-medium leading-snug mb-2"
        style={{ color: activeTheme.textPrimary }}
      >
        Зачем ты здесь: чтобы не потерять себя между работой, семьёй и делами.
      </h2>

      {/* 2. ЗАЧЕМ ЭТО (Антитезис токсичной продуктивности) */}
      <p
        className="text-xs leading-relaxed opacity-85 mb-3.5"
        style={{ color: activeTheme.textSecondary }}
      >
        Здесь <strong>нет</strong> списков задач, сгорающих стриков и чувства вины.
        Это твоё карманное зеркало, которое возвращает внимание в тело и замечает моменты,
        когда ты чувствуешь жизнь по-настоящему.
      </p>

      {/* 3. ЧТО СДЕЛАТЬ ПРЯМО СЕЙЧАС (3 шага) */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-black/5 text-[11px]">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs" style={{ color: activeTheme.primary }}>1. Цвет дня</span>
          <span className="opacity-70 leading-tight">Выбери оттенок своего состояния</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs" style={{ color: activeTheme.primary }}>2. Якорь</span>
          <span className="opacity-70 leading-tight">Баня, прогулка, чашка чая или тишина</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs" style={{ color: activeTheme.primary }}>3. Выдох</span>
          <span className="opacity-70 leading-tight">«Я здесь, и этого достаточно»</span>
        </div>
      </div>
    </div>
  );
}
