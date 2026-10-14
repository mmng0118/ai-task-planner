"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDateWheel } from "./CalendarDateWheel";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  ariaLabel?: string;
};

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function toIso(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDisplay(value: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DatePicker({ value, onChange, error = false, ariaLabel = "締め切り" }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => firstOfMonth(selectedDate ?? new Date()));

  useEffect(() => {
    const nextSelectedDate = parseDate(value);
    if (nextSelectedDate) setVisibleMonth(firstOfMonth(nextSelectedDate));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const leadingDays = visibleMonth.getDay();
  const calendarCells = [
    ...Array.from({ length: leadingDays }, (_, index) => ({ key: `blank-${index}`, day: null as number | null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
  ];

  function chooseDay(day: number) {
    const chosen = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    onChange(toIso(chosen));
    setOpen(false);
  }

  function isSelected(day: number) {
    return selectedDate !== null && selectedDate.getFullYear() === visibleMonth.getFullYear() && selectedDate.getMonth() === visibleMonth.getMonth() && selectedDate.getDate() === day;
  }

  function isToday(day: number) {
    const today = new Date();
    return today.getFullYear() === visibleMonth.getFullYear() && today.getMonth() === visibleMonth.getMonth() && today.getDate() === day;
  }

  return (
    <div className="date-picker" ref={rootRef}>
      <div className={`date-picker-control ${error ? "has-error" : ""}`}>
        <input
          id={id}
          type="text"
          value={toDisplay(value)}
          placeholder="年 / 月 / 日"
          readOnly
          aria-label={ariaLabel}
          aria-required="true"
          aria-invalid={error}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
        />
        <button
          className="date-picker-trigger"
          type="button"
          aria-label={open ? "カレンダーを閉じる" : "カレンダーを開く"}
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="calendar-icon" aria-hidden="true" />
        </button>
      </div>
      {error && <span className="field-error">締め切りを選択してください</span>}
      {open && (
        <div className="date-picker-calendar" id={`${id}-calendar`} role="dialog" aria-label="締め切りを選択">
          <div className="date-picker-month">
            <button type="button" aria-label="前の月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <button className="date-picker-month-title" type="button" aria-label={`${visibleMonth.getFullYear()}年${visibleMonth.getMonth() + 1}月を選択`} aria-haspopup="dialog" aria-expanded={wheelOpen} onClick={() => { setOpen(false); setWheelOpen(true); }}>{visibleMonth.getFullYear()}年{visibleMonth.getMonth() + 1}月</button>
            <button type="button" aria-label="次の月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="date-picker-grid" aria-label="日付">
            {weekdays.map((weekday) => <span className="date-picker-weekday" aria-hidden="true" key={weekday}>{weekday}</span>)}
            {calendarCells.map(({ key, day }) => day === null
              ? <span className="date-picker-blank" aria-hidden="true" key={key} />
              : <button
                  className={`date-picker-day${isSelected(day) ? " selected" : ""}${isToday(day) ? " is-today" : ""}`}
                  type="button"
                  aria-pressed={isSelected(day)}
                  aria-current={isToday(day) ? "date" : undefined}
                  aria-label={`${visibleMonth.getFullYear()}年${visibleMonth.getMonth() + 1}月${day}日`}
                  key={key}
                  onClick={() => chooseDay(day)}
                >{day}</button>)}
          </div>
        </div>
      )}
      {wheelOpen && (
        <CalendarDateWheel
          initialDate={selectedDate ?? visibleMonth}
          onCancel={() => setWheelOpen(false)}
          onSelect={(date) => {
            onChange(toIso(date));
            setVisibleMonth(firstOfMonth(date));
            setWheelOpen(false);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
