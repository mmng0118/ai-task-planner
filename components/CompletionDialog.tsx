"use client";

import { useState, type FormEvent } from "react";
import type { Task, TaskFeedback } from "../lib/tasks";

export function CompletionDialog({ task, onCancel, onSave }: { task: Task; onCancel: () => void; onSave: (feedback: TaskFeedback) => void }) {
  const [difficulty, setDifficulty] = useState(3);
  const [actualHours, setActualHours] = useState("");
  const [reflection, setReflection] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ difficulty, actualHours: Number(actualHours) || task.analysis.estimatedHours, reflection: reflection.trim() });
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button className="dialog-close" type="button" onClick={onCancel} aria-label="閉じる">×</button>
      <span className="feedback-check" aria-hidden="true">✓</span>
      <h2 id="feedback-title">タスク完了！</h2>
      <p className="feedback-task-name">{task.title}</p>
      <p className="feedback-prompt">今回の取り組みを教えてください</p>
      <form onSubmit={submit}>
        <fieldset className="difficulty-field">
          <legend>実際の難易度</legend>
          <div className="star-picker" role="radiogroup" aria-label="実際の難易度">
            {[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= difficulty ? "active" : ""} key={value} aria-label={`${value}つ星`} onClick={() => setDifficulty(value)}>★</button>)}
          </div>
        </fieldset>
        <label className="feedback-input-label">実際にかかった時間<input type="number" min="0" step="0.5" value={actualHours} onChange={(event) => setActualHours(event.target.value)} /></label>
        <label className="feedback-input-label">振り返り<textarea rows={3} placeholder="予想との差や難しかったことなど" value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
        <button className="coral-button feedback-save" type="submit">完了する</button>
      </form>
    </section>
  </div>;
}
