"use client";

import { useState } from "react";
import { daysUntil, formatShortDate, type Task } from "../lib/tasks";

const slackOptions = ["かなり余裕あり", "余裕あり", "若干タイト", "かなりタイト"];
const rankColors = ["rank-coral", "rank-orange", "rank-green", "rank-blue"];

type Props = {
  tasks: Task[];
  slack: string;
  onSlackChange: (slack: string) => void;
  onToggleDone: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskIndex: number) => void;
  expandedTaskId: string | null;
  onToggleExpanded: (taskId: string) => void;
};

export function PlanPanel({ tasks, slack, onSlackChange, onToggleDone, onToggleSubtask, expandedTaskId, onToggleExpanded }: Props) {
  const [sampleNotice, setSampleNotice] = useState(false);
  return (
    <section className="workspace plan-workspace">
      <section className="surface-card schedule-panel">
        <h1>スケジュールの余裕度</h1>
        <div className="slack-options" role="radiogroup" aria-label="スケジュールの余裕度">
          {slackOptions.map((option) => <label className={`slack-option ${slack === option ? "selected" : ""}`} key={option}>
            <input type="radio" name="slack" checked={slack === option} onChange={() => onSlackChange(option)} />
            <span className="radio-dot" aria-hidden="true" />{option}
          </label>)}
        </div>
        <div className="analyze-action">
          <button className="coral-button analyze-button" type="button" onClick={() => setSampleNotice(true)}>AIに分析してもらう</button>
          {sampleNotice && <span role="status">サンプル分析結果を表示しています</span>}
        </div>
      </section>

      <div className="plan-heading"><h2>おすすめプラン</h2><span /></div>
      <section className="priority-timeline" aria-label="優先順位">
        {tasks.map((task, index) => {
          const days = daysUntil(task.deadline);
          const expanded = expandedTaskId === task.id;
          return <article className={`priority-row ${rankColors[index % rankColors.length]}`} key={task.id}>
            <div className="timeline-marker" aria-hidden="true"><i /></div>
            <div className={`priority-card ${expanded ? "is-expanded" : ""}`}>
              <span className="rank-number" aria-label={`${index + 1}番目`}>{task.status === "done" ? "✓" : index + 1}</span>
              <div className="priority-main">
                <span className="days-badge">{task.status === "done" ? "完了" : days < 0 ? "期限超過" : days === 0 ? "今日まで" : `あと${days}日`}</span>
                <div className="priority-titleline">
                  <button className="priority-title-button" type="button" onClick={() => onToggleExpanded(task.id)} aria-expanded={expanded}>{task.title}</button>
                </div>
              </div>
              <div className="priority-side">
                <div className="priority-facts">
                  <div className="priority-facts-top">
                    <span><i className="fact-clock" aria-hidden="true">◷</i>{task.analysis.estimatedHours}h</span>
                    <span><i className="fact-deadline" aria-hidden="true" />{formatShortDate(task.deadline)}</span>
                  </div>
                  <span className="difficulty-stars" aria-label={`難易度 ${task.analysis.difficulty}/5`}>{"★".repeat(task.analysis.difficulty)}<i>{"★".repeat(5 - task.analysis.difficulty)}</i></span>
                </div>
                <button className={`priority-check ${task.status === "done" ? "checked" : ""}`} type="button" aria-label={task.status === "done" ? `${task.title}を未完了に戻す` : `${task.title}を完了する`} onClick={() => onToggleDone(task)}>{task.status === "done" ? "✓" : ""}</button>
              </div>
              {expanded && <div className="analysis-detail">
                <section className="analysis-section">
                  <h3>概要</h3>
                  <p className="analysis-summary">{task.summary || "概要は登録されていません。"}</p>
                </section>
                <section className="analysis-section">
                  <h3>サブタスク</h3>
                  <ul className="subtask-list">{task.analysis.subtasks.map((step, subtaskIndex) => <li key={`${task.id}-${step}`}>
                    <label>
                      <input className="subtask-checkbox" type="checkbox" checked={task.subtaskProgress?.[subtaskIndex] ?? false} onChange={() => onToggleSubtask(task.id, subtaskIndex)} />
                      <span>{step}</span>
                    </label>
                  </li>)}</ul>
                </section>
                <section className="analysis-section">
                  <h3>総評 / アドバイス</h3>
                  <div className="analysis-advice"><p>{task.analysis.tip}</p></div>
                </section>
              </div>}
            </div>
          </article>;
        })}
        {tasks.length === 0 && <div className="surface-card no-plan">タスクを登録すると、おすすめの順番がここに表示されます。</div>}
      </section>
    </section>
  );
}
