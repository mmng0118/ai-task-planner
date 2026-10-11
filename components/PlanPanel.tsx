"use client";

import { daysUntil, formatEstimatedHours, formatShortDate, type Task } from "../lib/tasks";

const rankColors = ["rank-coral", "rank-orange", "rank-green", "rank-blue"];

type Props = {
  tasks: Task[];
  onToggleDone: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskIndex: number) => void;
  expandedTaskId: string | null;
  onToggleExpanded: (taskId: string) => void;
};

export function PlanPanel({
  tasks,
  onToggleDone,
  onToggleSubtask,
  expandedTaskId,
  onToggleExpanded,
}: Props) {
  const planContent = (
    <>
      <div className="plan-heading">
        <span className="plan-heading-dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="plan-heading-copy">
          <h2>おすすめプラン</h2>
          <p>プランにはAI分析済みのタスクのみを表示しています。</p>
        </div>
        <span className="plan-heading-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <section className="priority-timeline" aria-label="優先順位">
        {tasks.map((task, index) => {
          const days = daysUntil(task.deadline);
          const expanded = expandedTaskId === task.id;
          return (
            <article className={`priority-row ${rankColors[index % rankColors.length]}`} key={task.id}>
              <div className="timeline-marker" aria-hidden="true"><i /></div>
              <div className={`priority-card ${expanded ? "is-expanded" : ""}`}>
                <span className="rank-number" aria-label={`${index + 1}番目`}>{task.status === "done" ? "✓" : index + 1}</span>
                <div className="priority-main">
                  <span className="days-badge">
                    {task.status === "done" ? "完了" : days < 0 ? "期限超過" : days === 0 ? "今日まで" : `あと${days}日`}
                  </span>
                  <div className="priority-titleline">
                    <button className="priority-title-button" type="button" onClick={() => onToggleExpanded(task.id)} aria-expanded={expanded}>{task.title}</button>
                  </div>
                </div>
                <div className="priority-side">
                  <div className="priority-facts">
                    <div className="priority-facts-top">
                      <span><i className="fact-clock" aria-hidden="true">◷</i>{formatEstimatedHours(task.analysis.estimatedHours)}</span>
                      <span><i className="fact-deadline" aria-hidden="true" />{formatShortDate(task.deadline)}</span>
                    </div>
                    <span className="difficulty-stars" aria-label={`難易度 ${task.analysis.difficulty}/5`}>
                      {"★".repeat(task.analysis.difficulty)}<i>{"★".repeat(5 - task.analysis.difficulty)}</i>
                    </span>
                  </div>
                  <button className={`priority-check ${task.status === "done" ? "checked" : ""}`} type="button" aria-label={task.status === "done" ? `${task.title}を未完了に戻す` : `${task.title}を完了する`} onClick={() => onToggleDone(task)}>{task.status === "done" ? "✓" : ""}</button>
                </div>
                {expanded && (
                  <div className="analysis-detail">
                    <section className="analysis-section">
                      <h3>概要</h3>
                      <p className="analysis-summary">{task.analysis.summary || task.summary || "概要は登録されていません。"}</p>
                    </section>
                    <section className="analysis-section">
                      <h3>サブタスク</h3>
                      <ul className="subtask-list">
                        {task.analysis.subtasks.map((step, subtaskIndex) => (
                          <li key={`${task.id}-${step}`}>
                            <label>
                              <input className="subtask-checkbox" type="checkbox" checked={task.subtaskProgress?.[subtaskIndex] ?? false} onChange={() => onToggleSubtask(task.id, subtaskIndex)} />
                              <span>{step}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="analysis-section">
                      <h3>総評 / アドバイス</h3>
                      <div className="analysis-advice"><p>{task.analysis.tip}</p></div>
                    </section>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {tasks.length === 0 && (
          <div className="surface-card no-plan">
            タスク一覧でタスクをまとめてAI分析すると、おすすめプランがここに表示されます。
          </div>
        )}
      </section>
    </>
  );

  return (
    <section className="workspace plan-workspace">
      {planContent}
    </section>
  );
}
