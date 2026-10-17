"use client";

import { useState } from "react";
import { daysUntil, formatDurationMinutes, formatShortDate, type Task } from "../lib/tasks";
import { buildSubtaskPlan } from "../lib/subtask-plan";

type Props = {
  tasks: Task[];
  onToggleSubtask: (taskId: string, subtaskIndex: number) => void;
  onOpenTaskInList: (task: Task) => void;
};

type ActivePlanRow = {
  rowId: string;
  taskId: string;
  view: "related" | "summary";
};

export function PlanPanel({
  tasks,
  onToggleSubtask,
  onOpenTaskInList,
}: Props) {
  const [activePlanRow, setActivePlanRow] = useState<ActivePlanRow | null>(null);
  const [planView, setPlanView] = useState<"todo" | "done">("todo");
  const plan = buildSubtaskPlan(tasks);
  const completedPlan = tasks.flatMap((task) =>
    task.status === "todo" && task.analysisStatus === "complete"
      ? task.analysis.subtasks.flatMap((subtask, subtaskIndex) =>
          task.subtaskProgress?.[subtaskIndex]
            ? [{ task, subtask, subtaskIndex, isFirstForTask: false }]
            : [],
        )
      : [],
  );
  const displayPlan = planView === "todo" ? plan : completedPlan;
  const visibleActivePlanRow = activePlanRow && displayPlan.some(
    ({ task, subtaskIndex }) => `${task.id}-${subtaskIndex}` === activePlanRow.rowId,
  ) ? activePlanRow : null;
  const activatePlanRow = (rowId: string, taskId: string) => {
    setActivePlanRow((current) => {
      if (current?.rowId !== rowId) return { rowId, taskId, view: "related" };
      if (current.view === "related") return { ...current, view: "summary" };
      return null;
    });
  };
  const hasCompletedSteps = tasks.some((task) =>
    task.status === "todo" &&
    task.analysisStatus === "complete" &&
    task.analysis.subtasks.length > 0 &&
    task.analysis.subtasks.every((_, index) => task.subtaskProgress?.[index] ?? false),
  );
  const pendingAnalysisCount = tasks.filter((task) =>
    task.status === "todo" && task.analysisStatus === "pending",
  ).length;

  return (
    <section className="workspace plan-workspace">
      <div className="plan-surface surface-card">
      <div className="color-ruler muted-ruler" aria-hidden="true"><i /><i /><i /></div>
      <div className="plan-heading">
        <div className="plan-heading-copy">
          <h2>おすすめプラン</h2>
          <div className="task-list-tabs plan-subtask-tabs" role="group" aria-label="サブタスクの状態">
            <button className={`task-list-tab${planView === "todo" ? " is-active" : ""}`} type="button" aria-pressed={planView === "todo"} onClick={() => setPlanView("todo")}>未完了 <span>{plan.length}</span></button>
            <button className={`task-list-tab${planView === "done" ? " is-active" : ""}`} type="button" aria-pressed={planView === "done"} onClick={() => setPlanView("done")}>完了済み <span>{completedPlan.length}</span></button>
          </div>
        </div>
      </div>

      <section className="priority-timeline subtask-priority-list" aria-label="サブタスクの優先順位">
        {planView === "todo" && pendingAnalysisCount > 0 && (
          <p className="subtask-plan-note">
            {pendingAnalysisCount}件のタスクは分析待ちです。分析が完了すると、ここに作業順が追加されます。
          </p>
        )}
        {displayPlan.map((item) => {
          const { task, subtask, subtaskIndex } = item;
          const isCompleted = task.subtaskProgress?.[subtaskIndex] ?? false;
          const days = daysUntil(task.deadline);
          const rowId = `${task.id}-${subtaskIndex}`;
          const isFocused = visibleActivePlanRow?.rowId === rowId;
          const isRelated = visibleActivePlanRow?.taskId === task.id;
          const isUnrelated = visibleActivePlanRow !== null && !isRelated;
          const summaryOpen = isFocused && visibleActivePlanRow?.view === "summary";
          const completedSubtaskCount = task.analysis.subtasks.reduce(
            (count, _, index) => count + (task.subtaskProgress?.[index] ? 1 : 0),
            0,
          );
          const totalSubtaskCount = task.analysis.subtasks.length;
          const progressCircumference = 2 * Math.PI * 43;
          const progressSegmentLength = totalSubtaskCount > 0
            ? progressCircumference / totalSubtaskCount
            : 0;
          const progressSegmentGap = totalSubtaskCount > 1
            ? Math.min(17, progressSegmentLength * 0.24)
            : 0;
          const progressSegmentArc = progressSegmentLength - progressSegmentGap;
          const progressGapAngle = progressSegmentGap / progressCircumference * 360;
          const progressRingRotation = totalSubtaskCount > 1
            ? -90 + progressGapAngle / 2
            : -90;
          return (
            <article
              key={rowId}
              className={`subtask-priority-row${isRelated ? " is-related" : ""}${isUnrelated ? " is-unrelated" : ""}${isFocused ? " is-focused" : ""}${summaryOpen ? " is-expanded" : ""}${isCompleted ? " is-completed" : ""}`}
              onClick={(event) => {
                if (
                  (event.target as HTMLElement).closest(
                    "button, input, .subtask-priority-expanded-content, .subtask-priority-detail, .subtask-priority-detail-meta",
                  )
                )
                  return;
                activatePlanRow(rowId, task.id);
              }}
            >
              <input
                className="subtask-checkbox subtask-priority-checkbox"
                type="checkbox"
                checked={isCompleted}
                onChange={() => onToggleSubtask(task.id, subtaskIndex)}
                aria-label={`${task.title}: ${subtask.title}を${isCompleted ? "未完了に戻す" : "完了"}`}
              />
              <div className="subtask-priority-main">
                <div className="subtask-priority-heading-row">
                  <button
                    className="subtask-priority-task"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      activatePlanRow(rowId, task.id);
                    }}
                    aria-expanded={summaryOpen}
                    aria-pressed={isFocused}
                    aria-label={`${task.title}。${isFocused ? (summaryOpen ? "関連表示を閉じる" : "概要を見る") : "関連する作業を表示"}`}
                  >
                    {task.title} &gt;&gt;
                  </button>
                </div>
                <div className="subtask-priority-title-row">
                  <strong className="subtask-priority-title">
                    {subtask.title}
                  </strong>
                </div>
                <span className="days-badge subtask-priority-deadline">
                  {days < 0
                    ? "期限超過"
                    : days === 0
                      ? "今日まで"
                      : `あと${days}日`}
                </span>
              </div>
              <div className="subtask-priority-progress-position">
                <span className="subtask-priority-progress-label">進捗度</span>
                <div
                  className="subtask-progress"
                  role="img"
                  aria-label={`${task.title}の進捗: ${completedSubtaskCount}/${totalSubtaskCount}個完了`}
                >
                  <svg
                    className="subtask-progress-ring"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                    style={{ transform: `rotate(${progressRingRotation}deg)` }}
                  >
                    {Array.from({ length: totalSubtaskCount }, (_, segmentIndex) => {
                      const segmentProps = totalSubtaskCount > 1
                        ? {
                            strokeDasharray: `${progressSegmentArc} ${progressCircumference - progressSegmentArc}`,
                            strokeDashoffset: -segmentIndex * progressSegmentLength,
                          }
                        : {};

                      return (
                        <g key={segmentIndex}>
                          <circle
                            className="subtask-progress-segment"
                            cx="50"
                            cy="50"
                            r="43"
                            {...segmentProps}
                          />
                          {segmentIndex < completedSubtaskCount && (
                            <circle
                              className="subtask-progress-segment is-complete"
                              cx="50"
                              cy="50"
                              r="43"
                              {...segmentProps}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <span className="subtask-progress-count" aria-hidden="true">
                    {completedSubtaskCount}/{totalSubtaskCount}
                  </span>
                </div>
              </div>
              {summaryOpen && (
                <div className="subtask-priority-expanded-content">
                  <div className="subtask-priority-detail-meta">
                    <span className="subtask-priority-meta-item">
                      <small>締め切り</small>
                      <span className="subtask-priority-date">
                        <i className="fact-deadline" aria-hidden="true" />
                        {formatShortDate(task.deadline)}
                      </span>
                    </span>
                    <span className="subtask-priority-meta-item">
                      <small>目安時間</small>
                      <span className="subtask-priority-time">
                        <i aria-hidden="true">◷</i>
                        {formatDurationMinutes(subtask.estimatedMinutes)}
                      </span>
                    </span>
                    <span className="subtask-priority-meta-item">
                      <small>予想難易度</small>
                      <span
                        className="difficulty-stars"
                        aria-label={`難易度 ${subtask.difficulty}/5`}
                      >
                        {"★".repeat(subtask.difficulty)}
                        <i>{"★".repeat(5 - subtask.difficulty)}</i>
                      </span>
                    </span>
                  </div>
                  <div className="subtask-priority-detail">
                    <strong>作業の概要</strong>
                    <p>{subtask.description || "作業内容の説明はありません。"}</p>
                  </div>
                  <div className="subtask-priority-open-task-wrap">
                    <button className="calendar-task-tooltip-link subtask-priority-open-task" type="button" onClick={() => onOpenTaskInList(task)}>タスク一覧で開く →</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {planView === "todo" && plan.length === 0 && hasCompletedSteps && pendingAnalysisCount === 0 && (
          <div className="surface-card no-plan">すべてのサブタスクが完了しています。</div>
        )}

        {planView === "todo" && plan.length === 0 && !hasCompletedSteps && pendingAnalysisCount === 0 && (
          <div className="surface-card no-plan">
            タスクを登録すると、取り組む作業の順番がここに表示されます。
          </div>
        )}

        {planView === "done" && completedPlan.length === 0 && (
          <div className="surface-card no-plan">完了したサブタスクはありません。</div>
        )}
      </section>
      </div>
    </section>
  );
}
