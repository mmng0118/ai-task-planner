"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { estimatedMinutes, formatEstimatedHours, type Task } from "../lib/tasks";
import { DatePicker } from "./DatePicker";
import { DifficultyFilter } from "./DifficultyFilter";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export function CalendarPanel({ tasks, query, onQueryChange, onOpenTaskInList }: { tasks: Task[]; query: string; onQueryChange: (query: string) => void; onOpenTaskInList: (task: Task) => void }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [minutesMin, setMinutesMin] = useState(0);
  const [minutesMax, setMinutesMax] = useState<number | null>(null);
  const [draftDifficulty, setDraftDifficulty] = useState("");
  const [draftDeadlineFrom, setDraftDeadlineFrom] = useState("");
  const [draftDeadlineTo, setDraftDeadlineTo] = useState("");
  const [draftMinutesMin, setDraftMinutesMin] = useState(0);
  const [draftMinutesMax, setDraftMinutesMax] = useState(480);
  const [shownMonth, setShownMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const longestTaskMinutes = Math.max(0, ...tasks.map((task) => estimatedMinutes(task.analysis.estimatedHours)));
  const sliderMaxMinutes = Math.max(480, Math.ceil((longestTaskMinutes + 30) / 30) * 30);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (difficultyFilter && task.analysis.difficulty !== Number(difficultyFilter)) return false;

    if (deadlineFrom && task.deadline < deadlineFrom) return false;
    if (deadlineTo && task.deadline > deadlineTo) return false;

    const taskMinutes = estimatedMinutes(task.analysis.estimatedHours);
    if (taskMinutes < minutesMin) return false;
    if (minutesMax !== null && taskMinutes > minutesMax) return false;
    return true;
  }), [deadlineFrom, deadlineTo, difficultyFilter, minutesMin, minutesMax, tasks]);

  const hasFilters = Boolean(difficultyFilter || deadlineFrom || deadlineTo || minutesMin > 0 || minutesMax !== null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchSuggestions = normalizedQuery ? visibleTasks.slice(0, 8) : [];

  const monthDays = useMemo(() => {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const count = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const today = new Date();
    const todayKey = toDateKey(today);

    return Array.from({ length: count }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const date = new Date(year, month, day);
      const key = toDateKey(date);
      return {
        day,
        key,
        isToday: key === todayKey,
        tasks: visibleTasks.filter((task) => task.deadline === key),
      };
    });
  }, [shownMonth, visibleTasks]);

  useEffect(() => {
    if (!focusedTaskId) return;
    document.getElementById(`calendar-task-${focusedTaskId}`)?.focus();
    setFocusedTaskId(null);
  }, [focusedTaskId, shownMonth, visibleTasks]);

  useEffect(() => {
    if (!filtersOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filtersOpen]);

  function moveMonth(offset: number) {
    setShownMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectSearchSuggestion(task: Task) {
    onQueryChange(task.title);
    setShownMonth(new Date(`${task.deadline}T00:00:00`));
    setSearchSuggestionsOpen(false);
    setFocusedTaskId(task.id);
  }

  function openFilters() {
    setDraftDifficulty(difficultyFilter);
    setDraftDeadlineFrom(deadlineFrom);
    setDraftDeadlineTo(deadlineTo);
    setDraftMinutesMin(minutesMin);
    setDraftMinutesMax(minutesMax ?? sliderMaxMinutes);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setDifficultyFilter(draftDifficulty);
    if (draftDeadlineFrom && draftDeadlineTo && draftDeadlineFrom > draftDeadlineTo) {
      setDeadlineFrom(draftDeadlineTo);
      setDeadlineTo(draftDeadlineFrom);
    } else {
      setDeadlineFrom(draftDeadlineFrom);
      setDeadlineTo(draftDeadlineTo);
    }
    setMinutesMin(draftMinutesMin);
    setMinutesMax(draftMinutesMax >= sliderMaxMinutes ? null : draftMinutesMax);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setDifficultyFilter("");
    setDeadlineFrom("");
    setDeadlineTo("");
    setMinutesMin(0);
    setMinutesMax(null);
    setDraftDifficulty("");
    setDraftDeadlineFrom("");
    setDraftDeadlineTo("");
    setDraftMinutesMin(0);
    setDraftMinutesMax(sliderMaxMinutes);
    setFiltersOpen(false);
  }

  return (
    <section className="workspace calendar-workspace">
      <div className="calendar-surface">
        <div className="calendar-toolbar">
          <h1 className="section-title" aria-live="polite">
            {new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(shownMonth)}
          </h1>
          <div className="calendar-controls">
            <button type="button" aria-label="前の月" onClick={() => moveMonth(-1)}>‹</button>
            <button type="button" className="calendar-today-button" onClick={() => {
              const today = new Date();
              setShownMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}>{shownMonth.getMonth() + 1}月</button>
            <button type="button" aria-label="次の月" onClick={() => moveMonth(1)}>›</button>
          </div>
        </div>

        <div className="calendar-search-row">
          <div className={`calendar-search-wrap${searchSuggestionsOpen && searchSuggestions.length ? " has-suggestions" : ""}`} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchSuggestionsOpen(false);
          }}>
          <label className="search-field calendar-search">
            <span className="search-icon" aria-hidden="true" />
            <input value={query} onFocus={() => setSearchSuggestionsOpen(true)} onChange={(event) => { onQueryChange(event.target.value); setSearchSuggestionsOpen(true); }} placeholder="タスクを検索" aria-label="カレンダーのタスクを検索" aria-autocomplete="list" aria-expanded={searchSuggestionsOpen && searchSuggestions.length > 0} />
          </label>
          <button className={`calendar-filter-toggle${hasFilters ? " has-filters" : ""}`} type="button" aria-label={`フィルター${hasFilters ? `適用中 ${[difficultyFilter, deadlineFrom || deadlineTo, minutesMin > 0 || minutesMax !== null].filter(Boolean).length}件` : ""}`} aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={openFilters}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3.5 5h17l-6.7 7.5v5.8l-3.6 1.8v-7.6L3.5 5Z" /></svg>
          </button>
          {searchSuggestionsOpen && searchSuggestions.length > 0 && <div className="calendar-search-suggestions" role="listbox" aria-label="検索候補">
            {searchSuggestions.map((task) => <button className="calendar-search-suggestion" type="button" role="option" aria-selected="false" key={task.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchSuggestion(task)}>
              <span className="calendar-suggestion-icon" aria-hidden="true">⌕</span>
              <span className="calendar-suggestion-title">{task.title}</span>
              <span className="calendar-suggestion-date">{formatDeadline(task.deadline)}</span>
            </button>)}
          </div>}
          </div>
        </div>
        {filtersOpen && <div className="dialog-backdrop calendar-filter-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
          <section className="task-edit-dialog calendar-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-filter-title">
            <button className="dialog-close" type="button" aria-label="フィルターを閉じる" onClick={() => setFiltersOpen(false)}>×</button>
            <h2 id="calendar-filter-title">フィルター</h2>
            <div className="calendar-filter-fields">
          <DifficultyFilter value={draftDifficulty} onChange={setDraftDifficulty} />
          <div className="calendar-filter-date-field">
            <span className="calendar-filter-field-label">締め切り期間</span>
            <div className="calendar-filter-date-range">
              <label>最短日<DatePicker value={draftDeadlineFrom} onChange={setDraftDeadlineFrom} ariaLabel="締め切りの最短日" /></label>
              <span className="calendar-filter-date-separator" aria-hidden="true">〜</span>
              <label>最長日<DatePicker value={draftDeadlineTo} onChange={setDraftDeadlineTo} ariaLabel="締め切りの最長日" /></label>
            </div>
          </div>
          <div className="calendar-filter-time-field">
            <span className="calendar-filter-field-label">予想時間</span>
            <div className="calendar-filter-time-range">
              <div className="calendar-filter-range-values" aria-live="polite">
                <strong>{draftMinutesMin === 0 ? "指定なし" : formatEstimatedHours(draftMinutesMin / 60)}</strong>
                <span>〜</span>
                <strong>{draftMinutesMax >= sliderMaxMinutes ? "指定なし" : formatEstimatedHours(draftMinutesMax / 60)}</strong>
              </div>
              <div className="calendar-dual-range" style={{
                "--range-start": `${(draftMinutesMin / sliderMaxMinutes) * 100}%`,
                "--range-end": `${(draftMinutesMax / sliderMaxMinutes) * 100}%`,
              } as CSSProperties}>
                <span className="calendar-dual-track" aria-hidden="true" />
                <span className="calendar-dual-selection" aria-hidden="true" />
                <input className="calendar-dual-input calendar-dual-input-min" type="range" min="0" max={sliderMaxMinutes} step="10" value={draftMinutesMin} aria-label="予想時間の下限" onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setDraftMinutesMin(nextValue);
                  if (nextValue > draftMinutesMax) setDraftMinutesMax(nextValue);
                }} />
                <input className="calendar-dual-input calendar-dual-input-max" type="range" min="0" max={sliderMaxMinutes} step="10" value={draftMinutesMax} aria-label="予想時間の上限" onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setDraftMinutesMax(nextValue);
                  if (nextValue < draftMinutesMin) setDraftMinutesMin(nextValue);
                }} />
              </div>
            </div>
          </div>
            </div>
            <div className="calendar-filter-actions">
              <button className="calendar-filter-reset" type="button" onClick={clearFilters}>条件をクリア</button>
              <div className="calendar-filter-buttons">
                <button className="coral-button" type="button" onClick={applyFilters}>この条件で表示</button>
                <button className="task-edit-cancel" type="button" onClick={() => setFiltersOpen(false)}>キャンセル</button>
              </div>
            </div>
          </section>
        </div>}

        <div className="calendar-grid" role="grid" aria-label="締め切りカレンダー">
          {weekdays.map((weekday) => <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>)}
          {monthDays.map((cell, index) => cell ? (
            <div className={`calendar-day${cell.isToday ? " is-today" : ""}`} role="gridcell" aria-label={`${shownMonth.getMonth() + 1}月${cell.day}日`} key={cell.key}>
              <span className="calendar-day-number">{cell.day}</span>
              <div className="calendar-day-tasks">
                {cell.tasks.map((task) => (
                  <div className="calendar-task-wrap" key={task.id}>
                    <span id={`calendar-task-${task.id}`} className={`calendar-task${task.status === "done" ? " is-done" : ""}`} tabIndex={0} aria-describedby={`calendar-task-summary-${task.id}`}>{task.title}</span>
                    <div className="calendar-task-tooltip" id={`calendar-task-summary-${task.id}`} role="group" aria-label={`${task.title}の概要とリンク`}>
                      <span>{task.analysis.summary || task.summary || "概要は登録されていません。"}</span>
                      <button className="calendar-task-tooltip-link" type="button" onClick={() => onOpenTaskInList(task)}>タスク一覧で開く →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="calendar-day is-outside" role="gridcell" aria-hidden="true" key={`empty-${index}`} />)}
        </div>
        {visibleTasks.length === 0 && (normalizedQuery || hasFilters) && <p className="calendar-empty">条件に合うタスクはありません</p>}
      </div>
    </section>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00`);
  return Number.isNaN(date.getTime()) ? deadline : new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}
