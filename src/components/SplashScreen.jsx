import React, { useEffect, useState } from 'react';

/**
 * Завораживающая заставка входа в Parallelo.
 * Показывается при открытии приложения (~2.8 сек) и мгновенно пропускается по тапу.
 */
export function SplashScreen({ onFinish }) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={handleClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClose();
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-12 overflow-hidden cursor-pointer select-none transition-opacity duration-500 ${
        isLeaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 42%, #19293A 0%, #0D141C 48%, #06090D 100%)',
      }}
    >
      {/* Фоновые орбиты параллельных ритмов */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[340px] h-[340px] rounded-full border animate-splash-orbit"
          style={{ borderColor: 'rgba(217, 155, 78, 0.14)' }}
        />
        <div
          className="absolute w-[480px] h-[480px] rounded-full border animate-splash-orbit-reverse"
          style={{ borderColor: 'rgba(79, 163, 154, 0.12)' }}
        />
        <div
          className="absolute w-[640px] h-[640px] rounded-full border"
          style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
        />
        {/* Мягкое глубинное свечение */}
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl animate-splash-glow"
          style={{
            background:
              'radial-gradient(circle, rgba(217,155,78,0.22) 0%, rgba(79,163,154,0.12) 45%, transparent 75%)',
          }}
        />
      </div>

      {/* Верхний тихий акцент */}
      <div className="relative z-10 text-[10px] tracking-[0.3em] uppercase text-slate-400/70 animate-splash-rise">
        Личное пространство ритмов
      </div>

      {/* Центральная композиция: лого + смысл */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs space-y-6 animate-splash-rise">
        <div className="relative p-2 rounded-[36px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-md">
          <img
            src="./branding/parallelo-p-3d.jpg"
            alt="Parallelo"
            className="w-40 h-40 sm:w-44 sm:h-44 rounded-[28px] object-contain"
          />
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-presence-breathe"
            style={{
              backgroundColor: '#D99B4E',
              borderColor: '#0D141C',
            }}
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-serif font-normal tracking-[0.22em] text-slate-100">
            PARALLELO
          </h1>
          <p className="text-sm font-serif text-amber-200/90 leading-relaxed">
            Параллельная вселенная без давления и чувства вины
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Место, где тело, сон и события дня складываются в честную картину вашего ритма.
          </p>
        </div>
      </div>

      {/* Нижняя подсказка */}
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <div className="w-16 h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full animate-pulse"
            style={{ width: '65%', backgroundColor: '#D99B4E' }}
          />
        </div>
        <span className="text-[11px] text-slate-400/75 tracking-wide">
          Нажмите в любом месте, чтобы войти
        </span>
      </div>
    </div>
  );
}
