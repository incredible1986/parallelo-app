import React, { useMemo, useState } from 'react';
import {
  BASIC_LAB_MARKERS,
  EXAMS_CATALOG,
  computeDueStatus,
  formatCheckupAge,
  parseDecimalInput,
} from '../data/checkupData';
import { formatShortRuDate, getLocalDateKey, parseDateKey } from '../services/storage';
import { computeDayIndex, computeMean } from '../services/analytics';
import { IconShield } from './RitualIcons';

function formatFullShortDate(dateKey) {
  if (!dateKey) return '';
  return `${formatShortRuDate(dateKey)} ${dateKey.slice(0, 4)}`;
}

function getDeltaString(curr, prev) {
  const diff = Math.round((curr - prev) * 100) / 100;
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return String(diff);
  return '0';
}

export function CheckupsView({ activeTheme, checkups, onUpdateCheckups, allRecords }) {
  const todayKey = getLocalDateKey();

  // Состояние инлайн-редактирования профилактического осмотра
  const [editingExamId, setEditingExamId] = useState(null);
  const [examDateInput, setExamDateInput] = useState(todayKey);
  const [examIntervalInput, setExamIntervalInput] = useState(12);
  const [examNoteInput, setExamNoteInput] = useState('');

  // Состояние формы внесения/редактирования бланка анализов
  const [isLabFormOpen, setIsLabFormOpen] = useState(false);
  const [editingLabId, setEditingLabId] = useState(null);
  const [labDateInput, setLabDateInput] = useState(todayKey);
  const [labNoteInput, setLabNoteInput] = useState('');
  const [labValuesInput, setLabValuesInput] = useState({});
  const [labFormNotice, setLabFormNotice] = useState(null);

  // Добавление собственного показателя
  const [isAddingCustomMarker, setIsAddingCustomMarker] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [customUnitInput, setCustomUnitInput] = useState('');

  // Двухэтапное подтверждение удаления бланка
  const [confirmDeleteLabId, setConfirmDeleteLabId] = useState(null);

  const dueColorMap = {
    due: activeTheme.primary,
    soon: activeTheme.secondary,
    ok: activeTheme.accent,
    unset: activeTheme.textMuted,
  };

  const allMarkers = useMemo(
    () => [...BASIC_LAB_MARKERS, ...(checkups.customMarkers || [])],
    [checkups.customMarkers]
  );

  const markerGroups = useMemo(() => {
    const groups = new Map();
    allMarkers.forEach((m) => {
      const groupName = m.group || 'Мои показатели';
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push(m);
    });
    return Array.from(groups.entries());
  }, [allMarkers]);

  const sortedLabs = useMemo(
    () =>
      [...(checkups.labEntries || [])].sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }),
    [checkups.labEntries]
  );

  const latestLabDate = sortedLabs[0]?.date || '';
  const labDueStatus = computeDueStatus(latestLabDate, 6, todayKey);

  // Последние значения показателей с нейтральным сравнением (было -> стало)
  const markerDynamics = useMemo(() => {
    if (sortedLabs.length === 0) return [];
    const result = [];
    allMarkers.forEach((marker) => {
      const matches = sortedLabs.filter(
        (entry) =>
          entry.values &&
          entry.values[marker.id] !== undefined &&
          entry.values[marker.id] !== null &&
          Number.isFinite(Number(entry.values[marker.id]))
      );
      if (matches.length === 0) return;

      const latest = matches[0];
      const prev = matches[1] || null;
      const latestVal = Number(latest.values[marker.id]);
      const prevVal = prev ? Number(prev.values[marker.id]) : null;
      result.push({
        marker,
        latestVal,
        latestDate: latest.date,
        prevVal,
        prevDate: prev ? prev.date : null,
      });
    });
    return result;
  }, [allMarkers, sortedLabs]);

  const getDiaryWindowAverage = (targetDateKey) => {
    if (!targetDateKey || !allRecords) return null;
    const targetMs = parseDateKey(targetDateKey).getTime();
    const indices = Object.values(allRecords)
      .filter((r) => {
        if (!r || !r.date) return false;
        if (!r.isSaved && !(r.rituals && r.rituals.length > 0)) return false;
        const diffDays = Math.abs((parseDateKey(r.date).getTime() - targetMs) / 86400000);
        return diffDays <= 7;
      })
      .map((r) => computeDayIndex(r))
      .filter((val) => val !== null && Number.isFinite(val));

    if (indices.length === 0) return null;
    return Math.round(computeMean(indices));
  };

  const openExamEditor = (exam) => {
    const current = checkups.exams?.[exam.id] || {};
    if (editingExamId === exam.id) {
      setEditingExamId(null);
      return;
    }
    setEditingExamId(exam.id);
    setExamDateInput(current.lastDate || todayKey);
    setExamIntervalInput(Number(current.intervalMonths || exam.defaultMonths));
    setExamNoteInput(current.note || '');
  };

  const handleSaveExam = (e, exam) => {
    e.preventDefault();
    if (!examDateInput) return;
    const prevExam = checkups.exams?.[exam.id] || {};
    const nextHistory = Array.from(
      new Set([...(prevExam.history || []), examDateInput])
    ).sort((a, b) => b.localeCompare(a));

    onUpdateCheckups({
      exams: {
        ...checkups.exams,
        [exam.id]: {
          ...prevExam,
          lastDate: examDateInput,
          intervalMonths: Number(examIntervalInput || exam.defaultMonths),
          note: examNoteInput.trim(),
          history: nextHistory,
        },
      },
    });
    setEditingExamId(null);
  };

  const openNewLabForm = () => {
    if (isLabFormOpen && !editingLabId) {
      setIsLabFormOpen(false);
      setLabFormNotice(null);
      return;
    }
    setEditingLabId(null);
    setLabDateInput(todayKey);
    setLabNoteInput('');
    setLabValuesInput({});
    setLabFormNotice(null);
    setIsLabFormOpen(true);
  };

  const openEditLabForm = (entry) => {
    const prefilled = {};
    Object.entries(entry.values || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) prefilled[k] = String(v);
    });
    setEditingLabId(entry.id);
    setLabDateInput(entry.date || todayKey);
    setLabNoteInput(entry.note || '');
    setLabValuesInput(prefilled);
    setLabFormNotice(null);
    setIsLabFormOpen(true);
  };

  const handleAddCustomMarker = (e) => {
    e.preventDefault();
    const title = customTitleInput.trim();
    const unit = customUnitInput.trim() || 'ед.';
    if (!title) return;

    const newMarker = {
      id: `custom_lab_${Date.now()}`,
      title,
      unit,
      placeholder: '0',
      group: 'Мои показатели',
      hint: 'Личный показатель',
    };
    onUpdateCheckups({
      customMarkers: [...(checkups.customMarkers || []), newMarker],
    });
    setCustomTitleInput('');
    setCustomUnitInput('');
    setIsAddingCustomMarker(false);
  };

  const handleSaveLabSheet = (e) => {
    e.preventDefault();
    if (!labDateInput) {
      setLabFormNotice('Укажите дату бланка.');
      return;
    }

    const parsedValues = {};
    let hasInvalid = false;

    allMarkers.forEach((m) => {
      const raw = labValuesInput[m.id];
      if (raw === undefined || String(raw).trim() === '') return;
      const num = parseDecimalInput(raw);
      if (num === null) {
        hasInvalid = true;
      } else {
        parsedValues[m.id] = num;
      }
    });

    if (hasInvalid) {
      setLabFormNotice('Проверьте числовые значения (допускаются точка или запятая).');
      return;
    }

    if (Object.keys(parsedValues).length === 0) {
      setLabFormNotice('Введите хотя бы один показатель из бланка.');
      return;
    }

    const nextEntry = {
      id: editingLabId || `lab_${Date.now()}`,
      date: labDateInput,
      note: labNoteInput.trim(),
      values: parsedValues,
      updatedAt: new Date().toISOString(),
    };

    const existing = checkups.labEntries || [];
    const nextEntries = editingLabId
      ? existing.map((item) => (item.id === editingLabId ? nextEntry : item))
      : [...existing, nextEntry];

    nextEntries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    onUpdateCheckups({ labEntries: nextEntries });

    setIsLabFormOpen(false);
    setEditingLabId(null);
    setLabValuesInput({});
    setLabNoteInput('');
    setLabFormNotice(null);
  };

  const handleDeleteLabEntry = (entryId) => {
    if (confirmDeleteLabId !== entryId) {
      setConfirmDeleteLabId(entryId);
      setTimeout(() => {
        setConfirmDeleteLabId((curr) => (curr === entryId ? null : curr));
      }, 4500);
      return;
    }
    const nextEntries = (checkups.labEntries || []).filter((item) => item.id !== entryId);
    onUpdateCheckups({ labEntries: nextEntries });
    setConfirmDeleteLabId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs block" style={{ color: activeTheme.textSecondary }}>
          Личная медкарта без диагнозов
        </span>
        <h2 className="text-lg font-serif font-medium mt-0.5" style={{ color: activeTheme.textPrimary }}>
          Чекап и осмотры
        </h2>
      </div>

      {/* БЛОК 1: Плановые осмотры */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div>
          <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
            Плановые осмотры
          </span>
          <p className="text-[11px] mt-0.5" style={{ color: activeTheme.textMuted }}>
            Спокойный календарь визитов, чтобы не держать даты в голове
          </p>
        </div>

        <div className="space-y-2.5">
          {EXAMS_CATALOG.map((exam) => {
            const stateData = checkups.exams?.[exam.id] || {
              lastDate: '',
              intervalMonths: exam.defaultMonths,
              note: '',
              history: [],
            };
            const isSpecialist = exam.id === 'specialist';
            const displayTitle = isSpecialist
              ? checkups.specialistRole === 'urologist'
                ? exam.altTitle
                : exam.title
              : exam.title;
            const due = computeDueStatus(
              stateData.lastDate,
              stateData.intervalMonths || exam.defaultMonths,
              todayKey
            );
            const statusColor = dueColorMap[due.state] || activeTheme.textMuted;
            const isEditing = editingExamId === exam.id;

            return (
              <div
                key={exam.id}
                className="p-3 rounded-xl border space-y-2.5"
                style={{
                  backgroundColor: activeTheme.surfaceContainer,
                  borderColor: activeTheme.borderColor,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
                        {displayTitle}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded border"
                        style={{
                          borderColor: statusColor,
                          color: statusColor,
                          backgroundColor: activeTheme.surfaceCard,
                        }}
                      >
                        {due.label}
                      </span>
                    </div>

                    <div className="text-[11px] tabular-nums" style={{ color: activeTheme.textSecondary }}>
                      {stateData.lastDate
                        ? `${formatFullShortDate(stateData.lastDate)} · ${formatCheckupAge(
                            stateData.lastDate,
                            todayKey
                          )}`
                        : 'Дата пока не указана'}
                    </div>

                    {stateData.note && (
                      <div className="text-[11px]" style={{ color: activeTheme.textMuted }}>
                        {stateData.note}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openExamEditor(exam)}
                    className="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium shrink-0 transition-colors"
                    style={{
                      backgroundColor: activeTheme.surfaceCard,
                      borderColor: isEditing ? activeTheme.primary : activeTheme.borderColor,
                      color: isEditing ? activeTheme.primary : activeTheme.textPrimary,
                    }}
                  >
                    {isEditing ? 'Закрыть' : stateData.lastDate ? 'Обновить' : 'Указать'}
                  </button>
                </div>

                {isSpecialist && (
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'gynecologist', label: 'Гинеколог' },
                      { id: 'urologist', label: 'Уролог' },
                    ].map((opt) => {
                      const active = (checkups.specialistRole || 'gynecologist') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateCheckups({ specialistRole: opt.id })}
                          className="px-2.5 py-1 rounded-lg border text-[11px] transition-colors"
                          style={{
                            backgroundColor: active ? activeTheme.surfaceElevated : 'transparent',
                            borderColor: active ? activeTheme.primary : activeTheme.borderColor,
                            color: active ? activeTheme.textPrimary : activeTheme.textSecondary,
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isEditing && (
                  <form
                    onSubmit={(e) => handleSaveExam(e, exam)}
                    className="pt-2.5 border-t space-y-2.5 animate-fade-in"
                    style={{ borderColor: activeTheme.borderColor }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`examDate_${exam.id}`}
                          className="text-[10px] block mb-1"
                          style={{ color: activeTheme.textSecondary }}
                        >
                          Дата осмотра
                        </label>
                        <input
                          id={`examDate_${exam.id}`}
                          type="date"
                          max={todayKey}
                          value={examDateInput}
                          onChange={(e) => setExamDateInput(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border focus:outline-none"
                          style={{
                            backgroundColor: activeTheme.surfaceCard,
                            borderColor: activeTheme.borderColor,
                            color: activeTheme.textPrimary,
                          }}
                        />
                      </div>

                      <div>
                        <span className="text-[10px] block mb-1" style={{ color: activeTheme.textSecondary }}>
                          Повторять раз в
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 h-[34px]">
                          {[6, 12].map((months) => {
                            const isPick = Number(examIntervalInput) === months;
                            return (
                              <button
                                key={months}
                                type="button"
                                onClick={() => setExamIntervalInput(months)}
                                className="rounded-lg border text-[11px] font-medium"
                                style={{
                                  backgroundColor: isPick
                                    ? activeTheme.surfaceElevated
                                    : activeTheme.surfaceCard,
                                  borderColor: isPick ? activeTheme.primary : activeTheme.borderColor,
                                  color: isPick ? activeTheme.textPrimary : activeTheme.textSecondary,
                                }}
                              >
                                {months} мес.
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={examNoteInput}
                      onChange={(e) => setExamNoteInput(e.target.value)}
                      placeholder="Клиника, врач или пометка для себя"
                      className="w-full text-xs p-2 rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: activeTheme.surfaceCard,
                        borderColor: activeTheme.borderColor,
                        color: activeTheme.textPrimary,
                      }}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: activeTheme.primary,
                          color: activeTheme.primaryText,
                        }}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingExamId(null)}
                        className="px-2.5 py-1.5 text-xs"
                        style={{ color: activeTheme.textSecondary }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* БЛОК 2: Базовые анализы (раз в полгода) */}
      <div
        className="p-4 rounded-2xl border space-y-3"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
              Базовые анализы (раз в полгода)
            </span>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded border"
                style={{
                  borderColor: dueColorMap[labDueStatus.state] || activeTheme.textMuted,
                  color: dueColorMap[labDueStatus.state] || activeTheme.textMuted,
                  backgroundColor: activeTheme.surfaceContainer,
                }}
              >
                {labDueStatus.label}
              </span>
              {latestLabDate && (
                <span className="text-[11px] tabular-nums" style={{ color: activeTheme.textMuted }}>
                  последний: {formatFullShortDate(latestLabDate)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openNewLabForm}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0"
            style={{
              backgroundColor: isLabFormOpen ? activeTheme.surfaceContainer : activeTheme.primary,
              color: isLabFormOpen ? activeTheme.textPrimary : activeTheme.primaryText,
              border: isLabFormOpen ? `1px solid ${activeTheme.borderColor}` : 'none',
            }}
          >
            {isLabFormOpen ? 'Закрыть форму' : '+ Внести анализы'}
          </button>
        </div>

        {/* Форма добавления / редактирования бланка анализов */}
        {isLabFormOpen && (
          <form
            onSubmit={handleSaveLabSheet}
            className="p-3 rounded-xl border space-y-3 animate-fade-in"
            style={{
              backgroundColor: activeTheme.surfaceContainer,
              borderColor: activeTheme.borderColor,
            }}
          >
            <div className="text-xs font-medium" style={{ color: activeTheme.textPrimary }}>
              {editingLabId ? 'Редактирование бланка' : 'Новый бланк анализов'}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label
                  htmlFor="labSheetDate"
                  className="text-[10px] block mb-1"
                  style={{ color: activeTheme.textSecondary }}
                >
                  Дата сдачи
                </label>
                <input
                  id="labSheetDate"
                  type="date"
                  max={todayKey}
                  value={labDateInput}
                  onChange={(e) => setLabDateInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: activeTheme.surfaceCard,
                    borderColor: activeTheme.borderColor,
                    color: activeTheme.textPrimary,
                  }}
                />
              </div>
              <input
                type="text"
                value={labNoteInput}
                onChange={(e) => setLabNoteInput(e.target.value)}
                placeholder="Лаборатория / самочувствие / комментарий врача"
                className="w-full text-xs p-2 rounded-lg border focus:outline-none"
                style={{
                  backgroundColor: activeTheme.surfaceCard,
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textPrimary,
                }}
              />
            </div>

            <div className="space-y-3">
              {markerGroups.map(([groupTitle, items]) => (
                <div key={groupTitle} className="space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: activeTheme.textMuted }}>
                    {groupTitle}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-lg border flex items-center justify-between gap-2"
                        style={{
                          backgroundColor: activeTheme.surfaceCard,
                          borderColor: activeTheme.borderColor,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: activeTheme.textPrimary }}>
                            {m.title}
                          </div>
                          {m.hint && (
                            <div className="text-[10px] truncate" style={{ color: activeTheme.textMuted }}>
                              {m.hint}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={m.placeholder || '0'}
                            value={labValuesInput[m.id] ?? ''}
                            onChange={(e) =>
                              setLabValuesInput((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            aria-label={m.title}
                            className="w-20 text-right tabular-nums text-xs p-1.5 rounded-lg border focus:outline-none"
                            style={{
                              backgroundColor: activeTheme.surfaceContainer,
                              borderColor: activeTheme.borderColor,
                              color: activeTheme.textPrimary,
                            }}
                          />
                          <span className="text-[10px] w-14 truncate" style={{ color: activeTheme.textSecondary }}>
                            {m.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Мини-форма добавления своего показателя */}
            <div className="pt-1">
              {!isAddingCustomMarker ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomMarker(true)}
                  className="text-[11px] font-medium underline decoration-dotted"
                  style={{ color: activeTheme.primary }}
                >
                  + Добавить свой показатель
                </button>
              ) : (
                <div
                  className="p-2.5 rounded-lg border space-y-2"
                  style={{
                    backgroundColor: activeTheme.surfaceCard,
                    borderColor: activeTheme.borderColor,
                  }}
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      value={customTitleInput}
                      onChange={(e) => setCustomTitleInput(e.target.value)}
                      placeholder="Название (напр. Витамин D)"
                      className="col-span-2 text-xs p-1.5 rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: activeTheme.surfaceContainer,
                        borderColor: activeTheme.borderColor,
                        color: activeTheme.textPrimary,
                      }}
                    />
                    <input
                      type="text"
                      value={customUnitInput}
                      onChange={(e) => setCustomUnitInput(e.target.value)}
                      placeholder="нг/мл"
                      className="text-xs p-1.5 rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: activeTheme.surfaceContainer,
                        borderColor: activeTheme.borderColor,
                        color: activeTheme.textPrimary,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomMarker}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{
                        backgroundColor: activeTheme.accent,
                        color: activeTheme.primaryText,
                      }}
                    >
                      Добавить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomMarker(false);
                        setCustomTitleInput('');
                        setCustomUnitInput('');
                      }}
                      className="text-[11px]"
                      style={{ color: activeTheme.textSecondary }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>

            {labFormNotice && (
              <div className="text-[11px]" style={{ color: activeTheme.primary }}>
                {labFormNotice}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: activeTheme.primary,
                  color: activeTheme.primaryText,
                }}
              >
                Сохранить бланк
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLabFormOpen(false);
                  setEditingLabId(null);
                  setLabFormNotice(null);
                }}
                className="px-3 py-2 rounded-xl border text-xs"
                style={{
                  borderColor: activeTheme.borderColor,
                  color: activeTheme.textSecondary,
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Пустое состояние */}
        {sortedLabs.length === 0 && !isLabFormOpen && (
          <div
            className="p-3.5 rounded-xl border border-dashed text-xs leading-relaxed"
            style={{
              borderColor: activeTheme.borderColor,
              color: activeTheme.textSecondary,
            }}
          >
            Здесь можно спокойно хранить цифры из общего анализа крови, глюкозы или других регулярных бланков — чтобы видеть свою динамику от сдачи к сдаче.
          </div>
        )}

        {/* Последние показатели и нейтральная динамика */}
        {markerDynamics.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
              Последние показатели
            </span>
            <div className="space-y-1.5">
              {markerDynamics.map(({ marker, latestVal, latestDate, prevVal }) => (
                <div
                  key={marker.id}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: activeTheme.surfaceContainer,
                    borderColor: activeTheme.borderColor,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: activeTheme.textPrimary }}>
                      {marker.title}
                    </div>
                    <div className="text-[10px] tabular-nums" style={{ color: activeTheme.textMuted }}>
                      {formatFullShortDate(latestDate)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold tabular-nums" style={{ color: activeTheme.textPrimary }}>
                      {latestVal} <span className="font-normal text-[11px]" style={{ color: activeTheme.textSecondary }}>{marker.unit}</span>
                    </div>
                    {prevVal !== null && (
                      <div className="text-[10px] tabular-nums" style={{ color: activeTheme.textSecondary }}>
                        было {prevVal} ({getDeltaString(latestVal, prevVal)})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* История бланков */}
        {sortedLabs.length > 0 && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: activeTheme.borderColor }}>
            <span className="text-xs font-medium block" style={{ color: activeTheme.textSecondary }}>
              История бланков
            </span>
            <div className="space-y-2">
              {sortedLabs.map((entry) => {
                const count = Object.keys(entry.values || {}).length;
                const diaryAvg = getDiaryWindowAverage(entry.date);
                const isConfirming = confirmDeleteLabId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border space-y-1.5"
                    style={{
                      backgroundColor: activeTheme.surfaceContainer,
                      borderColor: activeTheme.borderColor,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium tabular-nums" style={{ color: activeTheme.textPrimary }}>
                        {formatFullShortDate(entry.date)} · показателей: {count}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditLabForm(entry)}
                          className="text-[11px] px-2 py-0.5 rounded border"
                          style={{
                            borderColor: activeTheme.borderColor,
                            color: activeTheme.primary,
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLabEntry(entry.id)}
                          className="text-[11px] px-2 py-0.5 rounded border"
                          style={{
                            borderColor: isConfirming ? activeTheme.primary : activeTheme.borderColor,
                            color: isConfirming ? activeTheme.primary : activeTheme.textMuted,
                          }}
                        >
                          {isConfirming ? 'Удалить?' : 'Удалить'}
                        </button>
                      </div>
                    </div>

                    {entry.note && (
                      <p className="text-[11px] leading-relaxed" style={{ color: activeTheme.textSecondary }}>
                        {entry.note}
                      </p>
                    )}

                    {diaryAvg !== null && (
                      <div className="text-[10px] tabular-nums" style={{ color: activeTheme.textMuted }}>
                        Состояние по дневнику в эти дни: ~{diaryAvg} из 100
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* БЛОК 3: Приватность и немедицинский дисклеймер */}
      <div
        className="p-4 rounded-2xl border flex items-start gap-2.5 text-[11px] leading-relaxed"
        style={{
          backgroundColor: activeTheme.surfaceCard,
          borderColor: activeTheme.borderColor,
          color: activeTheme.textMuted,
        }}
      >
        <IconShield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: activeTheme.secondary }} />
        <p>
          Все записи хранятся только на вашем устройстве (защищаются общим PIN-кодом и входят в резервную копию JSON). Parallelo не ставит диагнозов и не оценивает нормы: референсные границы зависят от конкретной лаборатории, пола и возраста — обсуждайте бланки со своим врачом.
        </p>
      </div>
    </div>
  );
}
