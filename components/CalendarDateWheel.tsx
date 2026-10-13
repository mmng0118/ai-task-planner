"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";

type Props = {
  initialDate: Date;
  onCancel: () => void;
  onSelect: (date: Date) => void;
};

const years = Array.from({ length: 201 }, (_, index) => 1900 + index);
const months = Array.from({ length: 12 }, (_, index) => index + 1);

export function CalendarDateWheel({ initialDate, onCancel, onSelect }: Props) {
  const [year, setYear] = useState(initialDate.getFullYear());
  const [month, setMonth] = useState(initialDate.getMonth() + 1);
  const [day, setDay] = useState(initialDate.getDate());
  const [dateInput, setDateInput] = useState(formatDate(initialDate));
  const [wheelJumpToken, setWheelJumpToken] = useState(0);
  const days = useMemo(
    () => Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1),
    [month, year],
  );

  function updateDate(nextYear: number, nextMonth: number, nextDay: number) {
    const lastDay = new Date(nextYear, nextMonth, 0).getDate();
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(Math.min(nextDay, lastDay));
  }

  function commitDateInput() {
    const match = dateInput.match(/^(\d{4})-?(\d{1,2})-?(\d{1,2})$/);
    if (!match) {
      setDateInput(formatDate(new Date(year, month - 1, day)));
      return;
    }
    const [nextYear, nextMonth, nextDay] = match.slice(1).map(Number);
    const parsed = new Date(nextYear, nextMonth - 1, nextDay);
    if (nextYear < years[0] || nextYear > years[years.length - 1] || parsed.getFullYear() !== nextYear || parsed.getMonth() !== nextMonth - 1 || parsed.getDate() !== nextDay) {
      setDateInput(formatDate(new Date(year, month - 1, day)));
      return;
    }
    updateDate(nextYear, nextMonth, nextDay);
    setWheelJumpToken((token) => token + 1);
    setDateInput(formatDate(parsed));
  }

  useEffect(() => setDateInput(formatDate(new Date(year, month - 1, day))), [day, month, year]);

  return (
    <div className="dialog-backdrop calendar-wheel-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="task-edit-dialog calendar-date-wheel-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-date-wheel-title">
        <h2 id="calendar-date-wheel-title">日付を選択</h2>
        <input
          className="calendar-date-wheel-date-input"
          type="text"
          inputMode="numeric"
          aria-label="日付を直接入力"
          placeholder="YYYY-MM-DD"
          value={dateInput}
          onChange={(event) => setDateInput(event.target.value)}
          onBlur={commitDateInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <div className="calendar-date-wheels">
          <WheelColumn label="年" values={years} value={year} jumpToken={wheelJumpToken} format={(value) => `${value}年`} onChange={(value) => updateDate(value, month, day)} />
          <WheelColumn label="月" values={months} value={month} jumpToken={wheelJumpToken} format={(value) => `${value}月`} onChange={(value) => updateDate(year, value, day)} />
          <WheelColumn label="日" values={days} value={day} jumpToken={wheelJumpToken} format={(value) => `${value}日`} onChange={setDay} />
        </div>
        <div className="calendar-date-wheel-actions">
          <button className="coral-button" type="button" onClick={() => onSelect(new Date(year, month - 1, day))}>この日を表示</button>
          <button className="task-edit-cancel" type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </section>
    </div>
  );
}

function formatDate(date: Date) {
  const yearText = String(date.getFullYear()).padStart(4, "0");
  const monthText = String(date.getMonth() + 1).padStart(2, "0");
  const dayText = String(date.getDate()).padStart(2, "0");
  return `${yearText}-${monthText}-${dayText}`;
}

function WheelColumn({ label, values, value, jumpToken, format, onChange }: {
  label: string;
  values: number[];
  value: number;
  jumpToken: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedValueRef = useRef(value);
  selectedValueRef.current = value;

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>(`[data-value="${selectedValueRef.current}"]`);
    if (!list || !selected) return;
    list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
  }, [jumpToken, values]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    const index = Math.max(0, Math.min(values.length - 1, Math.round(list.scrollTop / 36)));
    if (values[index] !== value) onChange(values[index]);
  }

  function centerOption(optionValue: number, behavior: ScrollBehavior = "smooth") {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>(`[data-value="${optionValue}"]`);
    if (!list || !option) return;
    list.scrollTo({
      top: option.offsetTop - (list.clientHeight - option.offsetHeight) / 2,
      behavior,
    });
  }

  function moveSelection(offset: number) {
    const index = values.indexOf(value);
    centerOption(values[Math.max(0, Math.min(values.length - 1, index + offset))]);
  }

  return (
    <div className="calendar-date-wheel-column">
      <div ref={listRef} className="calendar-date-wheel-list" role="listbox" aria-label={label} tabIndex={0} onScroll={handleScroll} onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveSelection(event.key === "ArrowUp" ? -1 : 1);
        }
      }}>
        {values.map((option) => (
          <button
            className={`calendar-date-wheel-option${option === value ? " is-selected" : ""}`}
            key={option}
            type="button"
            role="option"
            data-value={option}
            aria-selected={option === value}
            onClick={() => {
              centerOption(option);
            }}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
