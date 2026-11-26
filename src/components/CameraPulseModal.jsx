import React, { useCallback, useEffect, useRef, useState } from 'react';
import { analyzePpgSamples, evaluateFrameFinger } from '../services/ppgProcessor';
import { IconPulse } from './RitualIcons';

const TARGET_DURATION_MS = 15000;
const MAX_EXTENSION_MS = 20000;
const CANVAS_SIZE = 40;

/**
 * Модальное окно замера пульса через заднюю камеру смартфона (PPG) с живой волной.
 */
export function CameraPulseModal({ activeTheme, isOpen, onClose, onSaveBpm }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const sessionRef = useRef(0);

  const samplesRef = useRef([]);
  const contactMsRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const lastAnalyzeAtRef = useRef(0);
  const lastContactAtRef = useRef(0);

  const [cameras, setCameras] = useState([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'measuring' | 'done' | 'retry' | 'error'
  const [progress, setProgress] = useState(0);
  const [liveBpm, setLiveBpm] = useState(null);
  const [finalBpm, setFinalBpm] = useState(null);
  const [signalQuality, setSignalQuality] = useState('calibrating');
  const [wavePoints, setWavePoints] = useState([]);
  const [statusHint, setStatusHint] = useState('Мягко приложите палец к объективу задней камеры');
  const [torchActive, setTorchActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (trackRef.current) {
      try {
        trackRef.current.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
      } catch {
        // Не все браузеры поддерживают advanced torch constraints
      }
      try {
        trackRef.current.stop();
      } catch {
        // Безопасная остановка трека
      }
      trackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // Игнорируем повторную остановку
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchActive(false);
  }, []);

  const resetMeasurementState = useCallback(() => {
    samplesRef.current = [];
    contactMsRef.current = 0;
    lastSampleAtRef.current = 0;
    lastFrameAtRef.current = 0;
    lastAnalyzeAtRef.current = 0;
    lastContactAtRef.current = 0;
    setProgress(0);
    setLiveBpm(null);
    setFinalBpm(null);
    setSignalQuality('calibrating');
    setWavePoints([]);
  }, []);

  const startMeasurement = useCallback(
    async (explicitDeviceId = null) => {
      const token = ++sessionRef.current;
      stopCamera();
      resetMeasurementState();
      setPhase('waiting');
      setErrorMessage('');
      setStatusHint('Мягко приложите подушечку пальца к объективу задней камеры');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPhase('error');
        setErrorMessage(
          'Камера недоступна в этом браузере. Введите пульс вручную или откройте сайт по HTTPS.'
        );
        return;
      }

      try {
        const videoConstraint = explicitDeviceId
          ? {
              deviceId: { exact: explicitDeviceId },
              width: { ideal: 128 },
              height: { ideal: 128 },
              frameRate: { ideal: 30 },
            }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 128 },
              height: { ideal: 128 },
              frameRate: { ideal: 30 },
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });

        if (sessionRef.current !== token) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0] || null;
        trackRef.current = track;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Перечисляем камеры после получения разрешения, чтобы при 3 объективах можно было сменить линзу
        if (navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              if (sessionRef.current !== token) return;
              const videoInputs = devices.filter((d) => d.kind === 'videoinput');
              const rearCandidates = videoInputs.filter(
                (d) => !/front|selfie|передн|фронтал/i.test(d.label || '')
              );
              const list = rearCandidates.length > 0 ? rearCandidates : videoInputs;
              setCameras(list);
              if (track) {
                const activeId = track.getSettings?.().deviceId;
                const foundIdx = list.findIndex((c) => c.deviceId === activeId);
                if (foundIdx >= 0) setCameraIdx(foundIdx);
              }
            })
            .catch(() => {});
        }

        // Пробуем включить вспышку (на Android работает, на Safari iOS может не поддерживаться)
        if (track && typeof track.getCapabilities === 'function') {
          try {
            const caps = track.getCapabilities();
            if (caps && caps.torch) {
              await track.applyConstraints({ advanced: [{ torch: true }] });
              if (sessionRef.current === token) setTorchActive(true);
            }
          } catch {
            // Если фонарик недоступен, замер пройдёт при обычном освещении
          }
        }

        const tick = () => {
          if (sessionRef.current !== token) return;
          const now = performance.now();
          const videoEl = videoRef.current;
          const canvasEl = canvasRef.current;

          if (
            videoEl &&
            canvasEl &&
            videoEl.readyState >= 2 &&
            videoEl.videoWidth > 0 &&
            now - lastSampleAtRef.current >= 28
          ) {
            const dt = lastFrameAtRef.current > 0 ? Math.min(200, now - lastFrameAtRef.current) : 33;
            lastFrameAtRef.current = now;
            lastSampleAtRef.current = now;

            const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(videoEl, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
              const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
              const frame = evaluateFrameFinger(imgData, CANVAS_SIZE, CANVAS_SIZE);

              if (frame.isFinger) {
                lastContactAtRef.current = now;
                contactMsRef.current += dt;
                samplesRef.current.push({ t: now, v: frame.meanR });

                // Храним окно последних 13 секунд
                const cutoff = now - 13000;
                while (samplesRef.current.length > 0 && samplesRef.current[0].t < cutoff) {
                  samplesRef.current.shift();
                }

                const pct = Math.min(100, Math.round((contactMsRef.current / TARGET_DURATION_MS) * 100));
                setProgress(pct);
                setPhase('measuring');

                if (now - lastAnalyzeAtRef.current >= 200) {
                  lastAnalyzeAtRef.current = now;
                  const analysis = analyzePpgSamples(samplesRef.current);
                  setWavePoints(analysis.wavePoints);
                  setSignalQuality(analysis.quality);

                  if (analysis.bpm !== null) {
                    setLiveBpm(analysis.bpm);
                    setStatusHint('Идёт считывание волны... Не давите сильно');
                  } else if (analysis.quality === 'weak_pulse') {
                    setStatusHint('Слабая волна — чуть ослабьте нажим пальца');
                  } else if (analysis.quality === 'unstable') {
                    setStatusHint('Держите руку неподвижно, волна выравнивается...');
                  } else {
                    setStatusHint('Настраиваем сигнал — держите палец ровно...');
                  }

                  if (contactMsRef.current >= TARGET_DURATION_MS) {
                    if (analysis.bpm !== null) {
                      setFinalBpm(analysis.bpm);
                      setPhase('done');
                      setStatusHint('Готово! Проверьте результат ниже');
                      stopCamera();
                      return;
                    }
                    if (contactMsRef.current >= MAX_EXTENSION_MS) {
                      setPhase('retry');
                      setStatusHint(
                        'Не удалось поймать ровную волну — попробуйте не давить сильно на камеру и опереть руку'
                      );
                      stopCamera();
                      return;
                    }
                  }
                }
              } else {
                const missDuration = lastContactAtRef.current > 0 ? now - lastContactAtRef.current : 999;
                if (missDuration > 600 && contactMsRef.current > 0) {
                  resetMeasurementState();
                }
                setPhase('waiting');
                setStatusHint(
                  frame.tooDark
                    ? 'Мало света: приложите палец к основной камере со вспышкой или поднесите к свету'
                    : 'Мягко приложите подушечку пальца к объективу задней камеры'
                );
              }
            }
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (sessionRef.current !== token) return;
        setPhase('error');
        setErrorMessage(
          'Доступ к камере отклонён в браузере — разрешите камеру в адресной строке или введите пульс вручную.'
        );
      }
    },
    [resetMeasurementState, stopCamera]
  );

  useEffect(() => {
    if (isOpen) {
      startMeasurement();
    } else {
      sessionRef.current += 1;
      stopCamera();
      resetMeasurementState();
    }
    return () => {
      sessionRef.current += 1;
      stopCamera();
    };
  }, [isOpen, startMeasurement, stopCamera, resetMeasurementState]);

  if (!isOpen) return null;

  const handleSwitchLens = () => {
    if (cameras.length < 2) return;
    const nextIdx = (cameraIdx + 1) % cameras.length;
    setCameraIdx(nextIdx);
    startMeasurement(cameras[nextIdx].deviceId);
  };

  const handleSave = () => {
    if (!finalBpm) return;
    if (onSaveBpm) onSaveBpm(finalBpm);
    onClose();
  };

  const svgWidth = 260;
  const svgHeight = 64;
  const wavePolyline =
    wavePoints.length >= 2
      ? wavePoints
          .map((v, i) => {
            const x = (i / (wavePoints.length - 1)) * svgWidth;
            const y = svgHeight / 2 - v * (svgHeight * 0.38);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  const shownBpm = finalBpm ?? liveBpm ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm p-5 rounded-2xl shadow-2xl border relative space-y-4"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 text-xs opacity-60 hover:opacity-100 p-1"
          style={{ color: activeTheme.textSecondary }}
          aria-label="Закрыть"
        >
          ✕
        </button>

        <div>
          <span
            className="text-[10px] font-mono uppercase tracking-widest block mb-1"
            style={{ color: activeTheme.primary }}
          >
            Камера · фотоплетизмография
          </span>
          <h3 className="text-lg font-serif font-medium" style={{ color: activeTheme.textPrimary }}>
            Замер пульса камерой
          </h3>
        </div>

        {phase === 'error' ? (
          <div
            className="p-3.5 rounded-xl border text-xs leading-relaxed space-y-3"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
              color: activeTheme.textSecondary,
            }}
          >
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => startMeasurement()}
              className="w-full py-2 rounded-xl border text-xs font-medium"
              style={{
                borderColor: activeTheme.primary,
                color: activeTheme.primary,
              }}
            >
              Попробовать снова
            </button>
          </div>
        ) : (
          <>
            {/* Индикатор объектива + цифра пульса */}
            <div
              className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-10 h-10 rounded-full object-cover border"
                    style={{
                      borderColor:
                        phase === 'measuring' ? activeTheme.accent : activeTheme.borderColor,
                    }}
                  />
                  <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="hidden" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-3xl font-semibold tabular-nums leading-none"
                      style={{
                        color: finalBpm
                          ? activeTheme.accent
                          : liveBpm
                          ? activeTheme.primary
                          : activeTheme.textMuted,
                      }}
                    >
                      {shownBpm}
                    </span>
                    <span className="text-xs" style={{ color: activeTheme.textSecondary }}>
                      уд/мин
                    </span>
                  </div>
                  <div className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: activeTheme.textMuted }}>
                    <IconPulse className="w-3 h-3 shrink-0" />
                    <span>
                      {phase === 'done'
                        ? signalQuality === 'good'
                          ? 'Ровная волна'
                          : 'Ориентировочное значение'
                        : torchActive
                        ? 'Подсветка включена'
                        : 'Нужен дневной или комнатный свет'}
                    </span>
                  </div>
                </div>
              </div>

              {cameras.length > 1 && phase !== 'done' && (
                <button
                  type="button"
                  onClick={handleSwitchLens}
                  className="px-2.5 py-1.5 rounded-lg border text-[10px] font-medium shrink-0"
                  style={{
                    borderColor: activeTheme.borderColor,
                    backgroundColor: activeTheme.surfaceCard,
                    color: activeTheme.textSecondary,
                  }}
                >
                  Сменить объектив
                </button>
              )}
            </div>

            {/* Живая волна */}
            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: activeTheme.surfaceContainer,
                borderColor: activeTheme.borderColor,
              }}
            >
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-16 overflow-visible">
                <line
                  x1="0"
                  y1={svgHeight / 2}
                  x2={svgWidth}
                  y2={svgHeight / 2}
                  stroke={activeTheme.gridLine}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                {wavePolyline && (
                  <polyline
                    fill="none"
                    stroke={phase === 'done' ? activeTheme.primary : activeTheme.accent}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={wavePolyline}
                  />
                )}
              </svg>
            </div>

            {/* Подсказка и прогресс */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: activeTheme.textSecondary }}>{statusHint}</span>
                <span className="tabular-nums shrink-0 ml-2" style={{ color: activeTheme.textMuted }}>
                  {progress}%
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: activeTheme.borderColor }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: phase === 'done' ? activeTheme.accent : activeTheme.primary,
                  }}
                />
              </div>
            </div>

            {/* Кнопки результата */}
            {phase === 'done' && finalBpm && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: activeTheme.primary,
                    color: activeTheme.primaryText,
                  }}
                >
                  Записать {finalBpm} уд/мин
                </button>
                <button
                  type="button"
                  onClick={() => startMeasurement(cameras[cameraIdx]?.deviceId || null)}
                  className="w-full py-2 rounded-xl border text-xs"
                  style={{
                    borderColor: activeTheme.borderColor,
                    color: activeTheme.textSecondary,
                  }}
                >
                  Измерить заново
                </button>
              </div>
            )}

            {phase === 'retry' && (
              <button
                type="button"
                onClick={() => startMeasurement(cameras[cameraIdx]?.deviceId || null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: activeTheme.primary,
                  color: activeTheme.primaryText,
                }}
              >
                Попробовать снова
              </button>
            )}
          </>
        )}

        <p className="text-[10px] leading-relaxed" style={{ color: activeTheme.textMuted }}>
          Ориентировочный замер для личного дневника, не является медицинским прибором. Видео никуда не сохраняется.
        </p>
      </div>
    </div>
  );
}
