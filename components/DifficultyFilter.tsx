"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DifficultyFilter({ value, onChange }: Props) {
  const selectedDifficulty = Number(value) || 0;

  return (
    <div className="calendar-filter-difficulty">
      <span className="calendar-filter-field-label">難易度</span>
      <div className="calendar-filter-star-options" role="group" aria-label="難易度で絞り込む">
        <button
          className={`calendar-filter-all${selectedDifficulty === 0 ? " is-selected" : ""}`}
          type="button"
          aria-pressed={selectedDifficulty === 0}
          onClick={() => onChange("")}
        >
          指定しない
        </button>
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            className={`calendar-filter-star${level <= selectedDifficulty ? " is-filled" : ""}`}
            key={level}
            type="button"
            aria-pressed={selectedDifficulty === level}
            aria-label={`難易度 ${level}`}
            onClick={() => onChange(String(level))}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
