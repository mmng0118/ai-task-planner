"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type TextareaHTMLAttributes } from "react";
import { daysUntil, estimatedMinutes, formatEstimatedHours, type Task } from "../lib/tasks";
import { extractDocxText } from "../lib/docx";
import { extractPdfText } from "../lib/pdf";
import { DatePicker } from "./DatePicker";
import { DifficultyFilter } from "./DifficultyFilter";

type Props = {
  view: "add" | "list";
  tasks: Task[];
  totalCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, title: string, deadline: string, summary: string) => Promise<boolean>;
  onToggleDone: (task: Task) => void;
  onDeleteTasks: (taskIds: string[]) => Promise<boolean>;
  onSaveEdit: (task: Task) => Promise<boolean>;
  expandedTaskId: string | null;
  onToggleExpanded: (taskId: string) => void;
  analyzingTaskIds: string[];
  onRetryAnalyze: (task: Task) => void;
  isAnalyzing: boolean;
};

export function TaskEntryPanel({ view, tasks, totalCount, query, onQueryChange, onSubmit, onToggleDone, onDeleteTasks, onSaveEdit, expandedTaskId, onToggleExpanded, analyzingTaskIds, onRetryAnalyze, isAnalyzing }: Props) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentText, setAttachmentText] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [formErrors, setFormErrors] = useState({ title: false, deadline: false });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSelectingTasks, setIsSelectingTasks] = useState(false);
  const [taskListTab, setTaskListTab] = useState<"todo" | "done">("todo");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editSubtasks, setEditSubtasks] = useState<string[]>([]);
  const editSubtasksRef = useRef<string[]>([]);
  const dragSubtaskIndexRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const [draggingSubtaskIndex, setDraggingSubtaskIndex] = useState<number | null>(null);
  const [editErrors, setEditErrors] = useState({ title: false, deadline: false });
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const replaceEditSubtasks = useCallback((nextSubtasks: string[]) => {
    editSubtasksRef.current = nextSubtasks;
    setEditSubtasks(nextSubtasks);
  }, []);

  const moveEditSubtask = useCallback((from: number, to: number) => {
    const current = editSubtasksRef.current;
    if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    replaceEditSubtasks(next);
  }, [replaceEditSubtasks]);

  useEffect(() => {
    if (draggingSubtaskIndex === null) return;

    function moveWithPointer(event: PointerEvent) {
      if (event.pointerId !== dragPointerIdRef.current) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const row = element?.closest<HTMLElement>("[data-subtask-index]");
      const to = Number(row?.dataset.subtaskIndex);
      const from = dragSubtaskIndexRef.current;
      if (!row || !Number.isInteger(to) || from === null || to === from) return;
      moveEditSubtask(from, to);
      dragSubtaskIndexRef.current = to;
      setDraggingSubtaskIndex(to);
    }

    function finishPointerDrag(event: PointerEvent) {
      if (event.pointerId !== dragPointerIdRef.current) return;
      dragPointerIdRef.current = null;
      dragSubtaskIndexRef.current = null;
      setDraggingSubtaskIndex(null);
    }

    document.addEventListener("pointermove", moveWithPointer);
    document.addEventListener("pointerup", finishPointerDrag);
    document.addEventListener("pointercancel", finishPointerDrag);
    return () => {
      document.removeEventListener("pointermove", moveWithPointer);
      document.removeEventListener("pointerup", finishPointerDrag);
      document.removeEventListener("pointercancel", finishPointerDrag);
    };
  }, [draggingSubtaskIndex, moveEditSubtask]);

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((id) => tasks.some((task) => task.id === id)));
  }, [tasks]);

  useEffect(() => {
    if (!filtersOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filtersOpen]);

  const longestTaskMinutes = Math.max(0, editingTask ? estimatedMinutes(editingTask.analysis.estimatedHours) : 0, ...tasks.map((task) => estimatedMinutes(task.analysis.estimatedHours)));
  const sliderMaxMinutes = Math.max(480, Math.ceil((longestTaskMinutes + 30) / 30) * 30);
  const editTimeOptions = createEstimatedTimeOptions(sliderMaxMinutes);
  const editTimeIndex = editingTask
    ? findNearestTimeOption(editTimeOptions, estimatedMinutes(editingTask.analysis.estimatedHours))
    : 0;
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
  const tabTasks = visibleTasks.filter((task) => task.status === taskListTab);
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  function changeTaskListTab(tab: "todo" | "done") {
    setTaskListTab(tab);
    setIsSelectingTasks(false);
    setSelectedTaskIds([]);
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

  function startTaskSelection() {
    setIsSelectingTasks(true);
    setSelectedTaskIds([]);
    if (expandedTaskId) onToggleExpanded(expandedTaskId);
  }

  function cancelTaskSelection() {
    setIsSelectingTasks(false);
    setSelectedTaskIds([]);
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((current) => current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]);
  }

  async function deleteSelectedTasks() {
    if (selectedTaskIds.length === 0) return;
    const confirmed = window.confirm(`選択した${selectedTaskIds.length}件のタスクを削除しますか？\nこの操作は取り消せません。`);
    if (!confirmed) return;
    if (await onDeleteTasks(selectedTaskIds)) cancelTaskSelection();
  }

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

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    if (await onSubmit(event, title, deadline, fullSummary)) {
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
    replaceEditSubtasks([...task.analysis.subtasks]);
    setEditErrors({ title: false, deadline: false });
  }

  function updateEditSubtask(index: number, value: string) {
    replaceEditSubtasks(editSubtasksRef.current.map((subtask, currentIndex) => currentIndex === index ? value : subtask));
  }

  function removeEditSubtask(index: number) {
    replaceEditSubtasks(editSubtasksRef.current.filter((_, currentIndex) => currentIndex !== index));
  }

  function startSubtaskDrag(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    dragSubtaskIndexRef.current = index;
    dragPointerIdRef.current = event.pointerId;
    setDraggingSubtaskIndex(index);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;
    if (!editingTask.title.trim() || !editingTask.deadline) {
      setEditErrors({ title: !editingTask.title.trim(), deadline: !editingTask.deadline });
      return;
    }
    setEditErrors({ title: false, deadline: false });

    const subtasks = editSubtasks.map((subtask) => subtask.trim()).filter(Boolean);
    const subtasksChanged =
      subtasks.length !== editingTask.analysis.subtasks.length ||
      subtasks.some((subtask, index) => subtask !== editingTask.analysis.subtasks[index]);

    const saved = await onSaveEdit({
      ...editingTask,
      analysis: { ...editingTask.analysis, subtasks },
      subtaskProgress: subtasksChanged ? undefined : editingTask.subtaskProgress,
    });
    if (saved) setEditingTask(null);
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
            <label className="task-summary-field">概要<AutoResizeTextarea rows={4} value={summary} onChange={setSummary} placeholder="課題の内容を詳しく書くと正確な分析ができます" /></label>
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
            {isAnalyzing && <p className="task-submit-status" role="status">AIがタスクを分析しています。完了するとプランに反映されます。</p>}
            <button className="coral-button submit-button" type="submit" disabled={isReadingFile || isAnalyzing}>{isReadingFile ? "読み取り中…" : isAnalyzing ? "AI分析中…" : "登録する"}</button>
          </form>
        </section>
        )}

        {view === "list" && (
        <section className="surface-card task-list-card">
            <div className="color-ruler muted-ruler" aria-hidden="true"><i /><i /><i /></div>
            <div className="task-list-heading">
              <h2 className="section-title">タスク一覧</h2>
              <span className="task-count-badge" aria-label={`全${totalCount}件`}><span>全</span><strong>{totalCount}</strong><span>件</span></span>
            </div>
            <div className="task-list-tabs" role="group" aria-label="タスクの状態">
              <button className={`task-list-tab${taskListTab === "todo" ? " is-active" : ""}`} type="button" aria-pressed={taskListTab === "todo"} onClick={() => changeTaskListTab("todo")}>未完了 <span>{todoCount}</span></button>
              <button className={`task-list-tab${taskListTab === "done" ? " is-active" : ""}`} type="button" aria-pressed={taskListTab === "done"} onClick={() => changeTaskListTab("done")}>完了済み <span>{doneCount}</span></button>
            </div>
            <div className="calendar-search-wrap task-list-search-wrap">
              <label className="search-field calendar-search"><span className="search-icon" aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="タスクを検索" aria-label="タスクを検索" /></label>
              <button className={`calendar-filter-toggle${hasFilters ? " has-filters" : ""}`} type="button" aria-label={`フィルター${hasFilters ? `適用中 ${[difficultyFilter, deadlineFrom || deadlineTo, minutesMin > 0 || minutesMax !== null].filter(Boolean).length}件` : ""}`} aria-expanded={filtersOpen} aria-haspopup="dialog" onClick={openFilters}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3.5 5h17l-6.7 7.5v5.8l-3.6 1.8v-7.6L3.5 5Z" /></svg>
              </button>
            </div>
          <div className="task-bulk-toolbar">
            {isSelectingTasks ? <>
              <span className="task-selection-count">{selectedTaskIds.length}件選択中</span>
              <button className="task-edit-cancel task-bulk-cancel" type="button" onClick={cancelTaskSelection}>キャンセル</button>
              <button className="task-bulk-delete" type="button" disabled={selectedTaskIds.length === 0} onClick={deleteSelectedTasks}>選択したタスクを削除</button>
            </> : tabTasks.length > 0 && <button className="task-bulk-start" type="button" onClick={startTaskSelection}>タスクを取り消す</button>}
          </div>
          <div className="task-list" id="task-list-panel" aria-label={taskListTab === "todo" ? "未完了タスク" : "完了済みタスク"}>
            {tabTasks.map((task) => {
              const expanded = expandedTaskId === task.id;
              const days = daysUntil(task.deadline);
              return <div className="task-list-entry" key={task.id}>
                <article className={`task-list-item ${task.status === "done" ? "task-done" : ""}`}>
                <div className="task-list-header">
                <button className={`task-list-main${isSelectingTasks ? " is-selecting" : ""}${selectedTaskIds.includes(task.id) ? " is-selected" : ""}`} type="button" onClick={() => isSelectingTasks ? toggleTaskSelection(task.id) : onToggleExpanded(task.id)} aria-expanded={isSelectingTasks ? undefined : expanded} aria-pressed={isSelectingTasks ? selectedTaskIds.includes(task.id) : undefined} aria-label={isSelectingTasks ? `${task.title}を${selectedTaskIds.includes(task.id) ? "選択解除" : "選択"}` : undefined}>
                  {isSelectingTasks && <span className="task-select-indicator" aria-hidden="true">{selectedTaskIds.includes(task.id) ? "✓" : ""}</span>}
                  <span className="list-task-title">{task.title}</span>
                  {task.analysisStatus === "pending" && <span className={`task-analysis-chip${task.analysisError ? " has-error" : ""}`}>
                    {analyzingTaskIds.includes(task.id) ? "AI分析中…" : task.analysisError ? "分析に失敗" : "分析待ち"}
                  </span>}
                </button>
                {!isSelectingTasks && <div className="task-actions">
                  {!editingTask && <button className="task-edit" type="button" onClick={() => beginEdit(task)}>
                    <span aria-hidden="true">✎</span>
                    <span>タスクを編集する</span>
                  </button>}
                  <button className="task-check" type="button" aria-label={task.status === "done" ? `${task.title}を未完了に戻す` : `${task.title}を完了する`} onClick={() => onToggleDone(task)}>{task.status === "done" ? "✓" : ""}</button>
                </div>}
                </div>
                {expanded && !isSelectingTasks &&
                  <div className="task-list-detail">
                  {task.analysisStatus === "pending" && <div className={`task-analysis-inline${task.analysisError ? " has-error" : ""}`} role={task.analysisError ? "alert" : "status"}>
                    <span>{analyzingTaskIds.includes(task.id) ? "AIがタスクを分析しています…" : task.analysisError || "このタスクはまだ分析されていません。"}</span>
                    {!analyzingTaskIds.includes(task.id) && <button type="button" onClick={() => onRetryAnalyze(task)} disabled={isAnalyzing}>{task.analysisError ? "AI分析を再試行" : "AI分析する"}</button>}
                  </div>}
                  {task.analysisStatus !== "pending" && <div className="task-list-meta">
                    <span className="days-badge">{task.status === "done" ? "完了" : days < 0 ? "期限超過" : days === 0 ? "今日が締め切り" : `あと${days}日`}</span>
                    <span>目安 {formatEstimatedHours(task.analysis.estimatedHours)}</span>
                    <span className="difficulty-stars" aria-label={`難易度 ${task.analysis.difficulty}/5`}>{"★".repeat(task.analysis.difficulty)}<i>{"★".repeat(5 - task.analysis.difficulty)}</i></span>
                  </div>}
                  <div className="task-list-analysis">
                    <strong className="task-list-analysis-title">概要</strong><p>{task.analysisStatus === "complete" ? task.analysis.summary : task.summary || "概要は登録されていません。"}</p></div>
                    {task.analysisStatus !== "pending" && <>
                    {task.analysis.subtasks.length > 0 && <div className="task-list-subtasks">
                      <strong className="task-list-subtasks-title">サブタスク</strong>
                      <ul>{task.analysis.subtasks.map((subtask, index) => { const done = task.subtaskProgress?.[index] ?? false; return <li className={done ? "is-done" : ""} key={`${task.id}-subtask-${index}`}><span className="task-list-subtask-mark" aria-hidden="true">{done ? "✓" : "−"}</span><span>{subtask}</span></li>; })}</ul></div>}
                    </>}</div>}
                </article>
              </div>;
              
            })}
            {tabTasks.length === 0 && (tasks.length === 0
              ? <p className="empty-state">該当するタスクはありません<br/><span className="empty-state-span">タスクを登録</span>してください</p>
              : hasFilters || query.trim()
                ? <p className="empty-state">条件に一致するタスクはありません</p>
                : <p className="empty-state">{taskListTab === "done" ? "完了したタスクはありません" : "未完了のタスクはありません"}</p>)}
          </div>
        </section>
        )}
      </div>
      {filtersOpen && view === "list" && (
        <div className="dialog-backdrop calendar-filter-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
          <section className="task-edit-dialog calendar-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="task-list-filter-title">
            <button className="dialog-close" type="button" aria-label="フィルターを閉じる" onClick={() => setFiltersOpen(false)}>×</button>
            <h2 id="task-list-filter-title">フィルター</h2>
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
        </div>
      )}
      {editingTask && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingTask(null); }}>
          <section className="task-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="task-edit-title">
            <button className="dialog-close" type="button" onClick={() => setEditingTask(null)} aria-label="閉じる">×</button>
            <h2 id="task-edit-title">タスクを編集</h2>
            <form className="task-edit-form" noValidate onSubmit={saveEdit}>
              <label>タスク名<input required aria-invalid={editErrors.title} maxLength={100} value={editingTask.title} onChange={(event) => { setEditingTask({ ...editingTask, title: event.target.value }); if (event.target.value.trim()) setEditErrors((errors) => ({ ...errors, title: false })); }} />{editErrors.title && <span className="field-error">タスク名を入力してください</span>}</label>
              <div className="task-edit-date-field"><span className="task-edit-date-label">締め切り</span><DatePicker value={editingTask.deadline} onChange={(value) => { setEditingTask({ ...editingTask, deadline: value }); if (value) setEditErrors((errors) => ({ ...errors, deadline: false })); }} error={editErrors.deadline} /></div>
              <label>入力した概要<AutoResizeTextarea rows={3} value={editingTask.summary} onChange={(value) => setEditingTask({ ...editingTask, summary: value })} /></label>
              {editingTask.analysisStatus !== "pending" && <>
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
                <label className="task-edit-time-control">
                  <span className="task-edit-time-heading"><span>予想時間</span><strong>{formatEstimatedHours(editingTask.analysis.estimatedHours)}</strong></span>
                  <input
                    className="task-edit-time-slider"
                    type="range"
                    min={0}
                    max={editTimeOptions.length - 1}
                    step={1}
                    value={editTimeIndex}
                    aria-label="予想時間"
                    aria-valuetext={formatEstimatedHours(editTimeOptions[editTimeIndex] / 60)}
                    onChange={(event) => {
                      const minutes = editTimeOptions[Number(event.target.value)];
                      setEditingTask({ ...editingTask, analysis: { ...editingTask.analysis, estimatedHours: minutes / 60 } });
                    }}
                  />
                </label>
              </div>
              <fieldset className="task-edit-subtasks">
                <legend>サブタスク</legend>
                <div className="task-edit-subtask-list">
                  {editSubtasks.map((subtask, index) => (
                    <div className={`task-edit-subtask-row${draggingSubtaskIndex === index ? " is-dragging" : ""}`} key={index} data-subtask-index={index}>
                      <button
                        className="task-edit-subtask-grip"
                        type="button"
                        aria-label={`サブタスク${index + 1}を並べ替え`}
                        onPointerDown={(event) => startSubtaskDrag(index, event)}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                          event.preventDefault();
                          moveEditSubtask(index, Math.max(0, Math.min(editSubtasks.length - 1, index + (event.key === "ArrowUp" ? -1 : 1))));
                        }}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <input
                        aria-label={`サブタスク${index + 1}`}
                        value={subtask}
                        onChange={(event) => updateEditSubtask(index, event.target.value)}
                        placeholder={`サブタスク${index + 1}`}
                      />
                      <button className="task-edit-subtask-remove" type="button" onClick={() => removeEditSubtask(index)} aria-label={`サブタスク${index + 1}を削除`}>
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button className="task-edit-subtask-add" type="button" onClick={() => replaceEditSubtasks([...editSubtasksRef.current, ""])}>＋ サブタスクを追加</button>
              </fieldset>
              </>}
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

function AutoResizeTextarea({ value, onChange, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalHeightRef = useRef<number | null>(null);

  const resizeTextareaToContent = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    if (originalHeightRef.current === null) originalHeightRef.current = textarea.getBoundingClientRect().height;
    textarea.style.height = "auto";
    const styles = window.getComputedStyle(textarea);
    const borders = Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
    textarea.style.height = `${Math.max(originalHeightRef.current, textarea.scrollHeight + borders)}px`;
  }, []);

  useLayoutEffect(() => {
    resizeTextareaToContent(textareaRef.current);
  }, [resizeTextareaToContent, value]);

  return <textarea
    {...props}
    ref={textareaRef}
    value={value}
    onChange={(event) => {
      onChange(event.currentTarget.value);
      resizeTextareaToContent(event.currentTarget);
    }}
  />;
}

function createEstimatedTimeOptions(maxMinutes: number) {
  const options = [10, 20, 30, 40, 50, 60];
  for (let minutes = 90; minutes <= maxMinutes; minutes += 30) options.push(minutes);
  return options;
}

function findNearestTimeOption(options: number[], minutes: number) {
  return options.reduce((bestIndex, option, index) =>
    Math.abs(option - minutes) < Math.abs(options[bestIndex] - minutes) ? index : bestIndex,
  0);
}
