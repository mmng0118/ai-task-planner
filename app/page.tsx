"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createPlaceholderAnalysis, daysUntil, formatDeadline, initialTasks, type Task } from "../lib/tasks";

type Screen = "add" | "list" | "analyze" | "reflection";
type NavigationScreen = Exclude<Screen, "reflection">;

const navigation: { id: NavigationScreen; label: string; icon: string }[] = [
  { id: "add", label: "add", icon: "+" },
  { id: "list", label: "list", icon: "☰" },
  { id: "analyze", label: "analyze", icon: "✦" },
];

const breathingOptions = ["時間にかなり余裕あり", "時間に余裕あり", "若干タイト", "かなりタイト", "ほぼ時間なし"];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("add");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(breathingOptions[2]);
  const [feedbackTask, setFeedbackTask] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", deadline: "", summary: "" });
  const [feedback, setFeedback] = useState({ difficulty: 3, actualHours: "", reflection: "" });
  const activeTasks = tasks.filter((task) => task.status === "todo");
  const orderedTasks = useMemo(() => [...activeTasks].sort((a, b) => {
    const aDays = daysUntil(a.deadline), bDays = daysUntil(b.deadline);
    const aScore = a.analysis.difficulty * 2 + (aDays <= 3 ? 5 : aDays <= 7 ? 3 : 0);
    const bScore = b.analysis.difficulty * 2 + (bDays <= 3 ? 5 : bDays <= 7 ? 3 : 0);
    return bScore - aScore || aDays - bDays;
  }), [activeTasks]);

  function navigate(next: NavigationScreen) {
    setScreen(next);
    setSelectedTask(null);
    document.getElementById("main-area")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task: Task = {
      id: crypto.randomUUID(),
      ...form,
      status: "todo",
      analysis: createPlaceholderAnalysis(form.summary),
    };
    setTasks((current) => [task, ...current]);
    setForm({ title: "", deadline: "", summary: "" });
    setScreen("list");
    document.getElementById("main-area")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginReflection(taskId: string) {
    setFeedbackTask(taskId);
    setFeedback({ difficulty: 3, actualHours: "", reflection: "" });
    setScreen("reflection");
    document.getElementById("main-area")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishTask() {
    if (!feedbackTask) return;
    setTasks((current) => current.map((task) => task.id === feedbackTask
      ? { ...task, status: "done", feedback: { difficulty: feedback.difficulty, actualHours: Number(feedback.actualHours) || 0, reflection: feedback.reflection } }
      : task));
    setFeedbackTask(null);
    setSelectedTask(null);
    setScreen("list");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <nav aria-label="画面切り替え">
          {navigation.map((item) => (
            <button className={`nav-item nav-${item.id} ${screen === item.id ? "active" : ""}`} key={item.id} onClick={() => navigate(item.id)}>
              <span className={`nav-icon nav-icon-${item.id}`} aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="main-area" id="main-area">
        <div className={`page-content page-${screen}`}>
          {screen === "add" && <>
            <ViewHeader screen="add" />
            <form className="task-form" onSubmit={addTask}>
              <label>タスク名<input required maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              <label>締め切り<input required type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
              <label>概要<textarea rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
              <button className="primary-button" type="submit">追加する</button>
            </form>
          </>}

          {screen === "list" && <>
            <ViewHeader screen="list" />
            <section className="task-list" aria-label="タスク一覧">
              {tasks.map((task) => (
                <article className={`task-card ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
                  <div className="task-row">
                    <button className="task-open" onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)} aria-expanded={selectedTask === task.id}>
                      <span className="task-name">{task.title}</span>
                      <span className="task-date">{formatDeadline(task.deadline)}</span>
                      <span className="task-days">{task.status === "done" ? "完了" : daysUntil(task.deadline) < 0 ? "期限超過" : daysUntil(task.deadline) === 0 ? "今日まで" : `あと ${daysUntil(task.deadline)} 日`}</span>
                    </button>
                    {task.status === "todo" && <button className="complete-button" onClick={() => beginReflection(task.id)}>完了</button>}
                  </div>
                  {selectedTask === task.id && <TaskDetails task={task} />}
                </article>
              ))}
              {tasks.length === 0 && <div className="empty-list" />}
            </section>
          </>}

          {screen === "analyze" && <>
            <ViewHeader screen="analyze" />
            <div className="schedule-select">
              <select aria-label="スケジュールの余裕度" value={breathing} onChange={(event) => setBreathing(event.target.value)}>
                {breathingOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <section className="priority-list" aria-label="優先順位">
              {orderedTasks.map((task, index) => (
                <article className="priority-card" key={task.id}>
                  <span className="rank">{index + 1}</span>
                  <div className="priority-content">
                    <button className="priority-task" onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)} aria-expanded={selectedTask === task.id}>{task.title}</button>
                    <div className="priority-meta"><span>{formatDeadline(task.deadline)}</span><span>{daysUntil(task.deadline) < 0 ? "期限超過" : daysUntil(task.deadline) === 0 ? "今日まで" : `あと ${daysUntil(task.deadline)} 日`}</span></div>
                    {selectedTask === task.id && <TaskDetails task={task} />}
                    <button className="complete-button priority-complete" onClick={() => beginReflection(task.id)}>完了</button>
                  </div>
                </article>
              ))}
            </section>
          </>}

          {screen === "reflection" && <>
            <ViewHeader screen="reflection" />
            <section className="feedback-panel">
              <h1>{tasks.find((task) => task.id === feedbackTask)?.title}</h1>
              <label className="feedback-label">実際の難易度</label>
              <div className="rating" role="radiogroup" aria-label="実際の難易度">
                {[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} aria-label={`${rating}つ星`} className={rating <= feedback.difficulty ? "rated" : ""} onClick={() => setFeedback({ ...feedback, difficulty: rating })}>★</button>)}
              </div>
              <label>実際にかかった時間<input type="number" min="0" step="0.5" value={feedback.actualHours} onChange={(event) => setFeedback({ ...feedback, actualHours: event.target.value })} /><span className="input-unit">時間</span></label>
              <label>感想・振り返り<textarea rows={4} value={feedback.reflection} onChange={(event) => setFeedback({ ...feedback, reflection: event.target.value })} /></label>
              <button className="primary-button" onClick={finishTask}>保存する</button>
            </section>
          </>}
        </div>
      </section>
    </main>
  );
}

function ViewHeader({ screen }: { screen: Screen }) {
  const icon = screen === "add" ? "+" : screen === "list" ? "☰" : "✦";
  return <header className={`view-header header-${screen}`}>
    <span className={`view-icon icon-${screen}`} aria-hidden="true">{icon}</span>
    <span>{screen}</span>
  </header>;
}

function TaskDetails({ task }: { task: Task }) {
  return <div className="task-details">
    <p className="task-summary">{task.summary}</p>
    <div className="analysis-facts"><span>難易度　{"★".repeat(task.analysis.difficulty)}{"☆".repeat(5 - task.analysis.difficulty)}</span><span>約 {task.analysis.estimatedHours} 時間</span></div>
    <ul>{task.analysis.subtasks.map((subtask) => <li key={subtask}>{subtask}</li>)}</ul>
    <p className="analysis-tip">{task.analysis.tip}</p>
  </div>;
}
