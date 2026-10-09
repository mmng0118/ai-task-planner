"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { daysUntil, type Task } from "../lib/tasks";
import { extractDocxText } from "../lib/docx";
import { extractPdfText } from "../lib/pdf";
import { DatePicker } from "./DatePicker";

type Props = {
  view: "add" | "list";
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

export function TaskEntryPanel({ view, tasks, totalCount, query, onQueryChange, onSubmit, onToggleDone, onDeleteTask, onSaveEdit, expandedTaskId, onToggleExpanded }: Props) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentText, setAttachmentText] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [formErrors, setFormErrors] = useState({ title: false, deadline: false });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editSubtasks, setEditSubtasks] = useState("");
  const [editErrors, setEditErrors] = useState({ title: false, deadline: false });

  async function handleDocumentChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setAttachmentFileName(file.name);
    setAttachmentText("");
    setAttachmentError("");
    setIsReadingFile(true);

    try {
      const fileName = file.name.toLowerCase();
      let extractedText: string;
      if (fileName.endsWith(".pdf")) {
        extractedText = await extractPdfText(file);
      } else if (fileName.endsWith(".docx")) {
        extractedText = await extractDocxText(file);
      } else {
        throw new Error("PDFまたはWord（.docx）ファイルを選択してください。");
      }
      if (!extractedText.trim()) {
        throw new Error(fileName.endsWith(".pdf")
          ? "PDFから文字を取り出せませんでした。スキャン画像のPDFはまだ読み取れません。"
          : "Word文書から文字を取り出せませんでした。");
      }
      setAttachmentText(extractedText);
    } catch (error) {
      setAttachmentFileName("");
      setAttachmentError(error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    } finally {
      setIsReadingFile(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (isReadingFile) {
      event.preventDefault();
      return;
    }
    if (!title.trim() || !deadline) {
      event.preventDefault();
      setFormErrors({ title: !title.trim(), deadline: !deadline });
      return;
    }
    setFormErrors({ title: false, deadline: false });
    const fullSummary = [
      summary.trim(),
      attachmentText ? `【${attachmentFileName}から抽出した文章】\n${attachmentText}` : "",
    ].filter(Boolean).join("\n\n");
    onSubmit(event, title, deadline, fullSummary);
    if (event.defaultPrevented) {
      setTitle("");
      setDeadline("");
      setSummary("");
      setAttachmentFileName("");
      setAttachmentText("");
      setAttachmentError("");
      setFormErrors({ title: false, deadline: false });
    }
  }

  function beginEdit(task: Task) {
    setEditingTask(task);
    setEditSubtasks(task.analysis.subtasks.join("\n"));
    setEditErrors({ title: false, deadline: false });
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;
    if (!editingTask.title.trim() || !editingTask.deadline) {
      setEditErrors({ title: !editingTask.title.trim(), deadline: !editingTask.deadline });
      return;
    }
    setEditErrors({ title: false, deadline: false });

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
      <div className="entry-columns single-column">
        {view === "add" && (
        <section className="surface-card entry-card">
          <div className="color-ruler" aria-hidden="true"><i /><i /><i /></div>
          <h1 className="section-title">タスク登録</h1>
          <form className="task-form" noValidate onSubmit={submit}>
            <label>タスク名<input required aria-invalid={formErrors.title} maxLength={100} value={title} onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setFormErrors((errors) => ({ ...errors, title: false })); }} placeholder="例：レポートを提出する" />{formErrors.title && <span className="field-error">タスク名を入力してください</span>}</label>
            <div className="task-form-field"><span className="task-form-field-label">締め切り</span><DatePicker value={deadline} onChange={(value) => { setDeadline(value); if (value) setFormErrors((errors) => ({ ...errors, deadline: false })); }} error={formErrors.deadline} /></div>
            <label className="task-summary-field">概要<textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="課題の内容を詳しく書くと正確な分析ができます" /></label>
            <div className="document-attach-control">
              <input id="task-document" className="document-upload-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleDocumentChange} />
              <label className="document-attach-button" htmlFor="task-document"><span aria-hidden="true">↥</span> PDF・Wordを選択</label>
              {(isReadingFile || attachmentFileName) && <div className="document-attach-result">
                {isReadingFile && <span className="document-attach-status" role="status">ファイルを読み取り中…</span>}
                {attachmentFileName && !isReadingFile && <span className="document-attach-status" role="status">{attachmentFileName}（{attachmentText.length.toLocaleString("ja-JP")}文字）</span>}
                {attachmentFileName && !isReadingFile && <button className="document-remove-button" type="button" onClick={() => { setAttachmentFileName(""); setAttachmentText(""); setAttachmentError(""); }}>外す</button>}
              </div>}
              {attachmentError && <span className="document-attach-error" role="alert">{attachmentError}</span>}
            </div>
            <button className="coral-button submit-button" type="submit" disabled={isReadingFile}>{isReadingFile ? "読み取り中…" : "登録する"}</button>
          </form>
        </section>
        )}

        {view === "list" && (
        <section className="surface-card task-list-card">
          <div className="color-ruler muted-ruler" aria-hidden="true"><i /><i /><i /></div>
          <div className="task-list-heading">
            <h2 className="section-title">タスク一覧</h2>
            <span className="task-count-badge" aria-label={`すべてのタスク ${totalCount}件`}><span>すべてのタスク</span><strong>{String(totalCount).padStart(2, "0")}</strong><span>件</span></span>
          </div>
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
                {expanded && 
                  <div className="task-list-detail">
                  <div className="task-list-analysis">
                    <strong className="task-list-analysis-title">概要</strong><p>{task.summary || "概要は登録されていません。"}</p></div>
                    {task.analysis.subtasks.length > 0 && <div className="task-list-subtasks">
                      <strong className="task-list-subtasks-title">サブタスク</strong>
                      <ul>{task.analysis.subtasks.map((subtask, index) => { const done = task.subtaskProgress?.[index] ?? false; return <li className={done ? "is-done" : ""} key={`${task.id}-subtask-${index}`}><span className="task-list-subtask-mark" aria-hidden="true">{done ? "✓" : "○"}</span><span>{subtask}</span></li>; })}</ul></div>}<span className="days-badge">{task.status === "done" ? "完了" : days < 0 ? "期限超過" : days === 0 ? "今日が締め切り" : `あと${days}日`}</span><span>目安 {task.analysis.estimatedHours}h</span><span className="difficulty-stars" aria-label={`難易度 ${task.analysis.difficulty}/5`}>{"★".repeat(task.analysis.difficulty)}<i>{"★".repeat(5 - task.analysis.difficulty)}</i></span><div className="task-delete-row"><button className="task-delete" type="button" aria-label={`${task.title}を削除する`} onClick={() => onDeleteTask(task)}><span aria-hidden="true">−</span></button></div></div>}
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
        )}
      </div>
      {editingTask && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTask(null); }}>
          <section className="task-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="task-edit-title">
            <button className="dialog-close" type="button" onClick={() => setEditingTask(null)} aria-label="閉じる">×</button>
            <h2 id="task-edit-title">タスクを編集</h2>
            <p className="task-edit-dialog-caption">登録内容とAIの分析結果を編集できます</p>
            <form className="task-edit-form" noValidate onSubmit={saveEdit}>
              <label>タスク名<input required aria-invalid={editErrors.title} maxLength={100} value={editingTask.title} onChange={(event) => { setEditingTask({ ...editingTask, title: event.target.value }); if (event.target.value.trim()) setEditErrors((errors) => ({ ...errors, title: false })); }} />{editErrors.title && <span className="field-error">タスク名を入力してください</span>}</label>
              <div className="task-edit-date-field"><span className="task-edit-date-label">締め切り</span><DatePicker value={editingTask.deadline} onChange={(value) => { setEditingTask({ ...editingTask, deadline: value }); if (value) setEditErrors((errors) => ({ ...errors, deadline: false })); }} error={editErrors.deadline} /></div>
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
