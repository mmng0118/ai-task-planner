"use client";

import { useState, type FormEvent } from "react";
import { daysUntil, type Task } from "../lib/tasks";

type Props = {
  tasks: Task[];
  totalCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, title: string, deadline: string, summary: string) => void;
  onToggleDone: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onSaveEdit: (task: Task) => void;
  expandedTaskId: string | null;
  onToggleExpanded: (taskId: string) => void;
};

export function TaskEntryPanel({ tasks, totalCount, query, onQueryChange, onSubmit, onToggleDone, onDeleteTask, onSaveEdit, expandedTaskId, onToggleExpanded }: Props) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editSubtasks, setEditSubtasks] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    onSubmit(event, title, deadline, summary);
    if (event.defaultPrevented) {
      setTitle("");
      setDeadline("");
      setSummary("");
    }
  }

  function beginEdit(task: Task) {
    setEditingTask(task);
    setEditSubtasks(task.analysis.subtasks.join("\n"));
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;

    const subtasks = editSubtasks
      .split("\n")
      .map((subtask) => subtask.trim())
      .filter(Boolean);
    const subtasksChanged =
      subtasks.length !== editingTask.analysis.subtasks.length ||
      subtasks.some((subtask, index) => subtask !== editingTask.analysis.subtasks[index]);

    onSaveEdit({
      ...editingTask,
      analysis: { ...editingTask.analysis, subtasks },
      subtaskProgress: subtasksChanged ? undefined : editingTask.subtaskProgress,
    });
    setEditingTask(null);
  }

  return (
    <section className="workspace entry-workspace">
      <header className="overview-row">
        <div className="welcome-tile" aria-label="タスクプランナー">
          <span className="welcome-spark">✳</span><span>タスクの管理はAIにおまかせ</span>
        </div>
        <div className="count-tile">
          <div><span className="count-label">すべてのタスク</span><strong>{String(totalCount).padStart(2, "0")}</strong><span className="count-unit">件</span></div>
          <span className="count-art" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </header>

      <div className="entry-columns">
        <section className="surface-card entry-card">
          <div className="color-ruler" aria-hidden="true"><i /><i /><i /></div>
          <h1 className="section-title">タスク登録</h1>
          <form className="task-form" onSubmit={submit}>
            <label>タスク名<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：レポートを提出する" /></label>
            <label>締め切り<input required type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
            <label>概要<textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="課題の内容、留意すべき点などを詳しく書くと正確な分析ができます" /></label>
            <button className="coral-button submit-button" type="submit">登録する</button>
          </form>
        </section>

        <section className="surface-card task-list-card">
          <div className="color-ruler muted-ruler" aria-hidden="true"><i /><i /><i /></div>
          <h2 className="section-title">タスク一覧</h2>
          <label className="search-field"><span className="search-icon" aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="タスクを検索" aria-label="タスクを検索" /></label>
          <div className="task-list" aria-label="登録済みタスク">
            {tasks.map((task) => {
              const expanded = expandedTaskId === task.id;
              const days = daysUntil(task.deadline);
              return <div className="task-list-entry" key={task.id}>
                <article className={`task-list-item ${task.status === "done" ? "task-done" : ""}`}>
                <button className="task-list-main" type="button" onClick={() => onToggleExpanded(task.id)} aria-expanded={expanded}>
                  <span className="list-task-title">{task.title}</span>
                </button>
                <div className="task-actions">
                  <button className="task-check" type="button" aria-label={task.status === "done" ? `${task.title}を未完了に戻す` : `${task.title}を完了する`} onClick={() => onToggleDone(task)}>{task.status === "done" ? "✓" : ""}</button>
                </div>
                {expanded && <div className="task-list-detail"><p>{task.summary || "概要は登録されていません。"}</p><span className="days-badge">{task.status === "done" ? "完了" : days < 0 ? "期限超過" : days === 0 ? "今日が締め切り" : `あと${days}日`}</span><span>目安 {task.analysis.estimatedHours}h</span><span className="difficulty-stars" aria-label={`難易度 ${task.analysis.difficulty}/5`}>{"★".repeat(task.analysis.difficulty)}<i>{"★".repeat(5 - task.analysis.difficulty)}</i></span><div className="task-delete-row"><button className="task-delete" type="button" aria-label={`${task.title}を削除する`} onClick={() => onDeleteTask(task)}><span aria-hidden="true">−</span></button></div></div>}
                </article>
                {expanded && !editingTask && (
                  <div className="task-edit-row">
                    <button className="task-edit" type="button" onClick={() => beginEdit(task)}>
                      <span aria-hidden="true">✎</span>
                      <span>タスクを編集する</span>
                    </button>
                  </div>
                )}
              </div>;
              
            })}
            {tasks.length === 0 && <p className="empty-state">該当するタスクはありません<br/>
            <span className="empty-state-span">タスク</span>を登録してください</p>}
          </div>
        </section>
      </div>
      {editingTask && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTask(null); }}>
          <section className="task-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="task-edit-title">
            <button className="dialog-close" type="button" onClick={() => setEditingTask(null)} aria-label="閉じる">×</button>
            <h2 id="task-edit-title">タスクを編集</h2>
            <p className="task-edit-dialog-caption">登録内容とAIの分析結果を編集できます</p>
            <form className="task-edit-form" onSubmit={saveEdit}>
              <label>タスク名<input required maxLength={100} value={editingTask.title} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} /></label>
              <label>締め切り<input required type="date" value={editingTask.deadline} onChange={(event) => setEditingTask({ ...editingTask, deadline: event.target.value })} /></label>
              <label>入力した概要<textarea rows={3} value={editingTask.summary} onChange={(event) => setEditingTask({ ...editingTask, summary: event.target.value })} /></label>
              <div className="task-edit-numbers">
                <fieldset className="difficulty-field task-edit-difficulty">
                  <legend>予想難易度</legend>
                  <div className="star-picker" role="radiogroup" aria-label="難易度を設定">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        className={value <= editingTask.analysis.difficulty ? "active" : ""}
                        key={value}
                        role="radio"
                        aria-checked={value === editingTask.analysis.difficulty}
                        aria-label={`${value}つ星`}
                        onClick={() => setEditingTask({ ...editingTask, analysis: { ...editingTask.analysis, difficulty: value } })}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>予想時間（h）<input required type="number" min={1} value={editingTask.analysis.estimatedHours} onChange={(event) => setEditingTask({ ...editingTask, analysis: { ...editingTask.analysis, estimatedHours: Number(event.target.value) } })} /></label>
              </div>
              <label>サブタスク（1行につき1タスクまで）<textarea rows={4} value={editSubtasks} onChange={(event) => setEditSubtasks(event.target.value)} /></label>
              <div className="task-edit-buttons">
                <button className="coral-button" type="submit">保存する</button>
                <button className="task-edit-cancel" type="button" onClick={() => setEditingTask(null)}>キャンセル</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
