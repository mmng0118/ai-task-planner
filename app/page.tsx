"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CompletionDialog } from "../components/CompletionDialog";
import {
  PlannerSidebar,
  type PlannerScreen,
} from "../components/PlannerSidebar";
import { PlanPanel } from "../components/PlanPanel";
import { TaskEntryPanel } from "../components/TaskEntryPanel";
import {
  createPlaceholderAnalysis,
  daysUntil,
  initialTasks,
  type Task,
  type TaskFeedback,
  type AnalyzeRequest,
  type AnalyzeResponse,
} from "../lib/tasks";

const storageKey = "ai-task-planner.tasks.v1";

export default function Home() {
  const [screen, setScreen] = useState<PlannerScreen>("add");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [slack, setSlack] = useState("かなり余裕あり");
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    let storedTasks: Task[] | null = null;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsedTasks = JSON.parse(saved) as Task[];
        const starterTaskIds = new Set([
          "sample-1",
          "sample-2",
          "sample-3",
          "sample-4",
        ]);
        storedTasks = parsedTasks.filter((task) => !starterTaskIds.has(task.id));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    queueMicrotask(() => {
      if (storedTasks) setTasks(storedTasks);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(tasks));
      } catch {
        // Keep the current session usable when browser storage is unavailable.
      }
    }
  }, [ready, tasks]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "todo"),
    [tasks],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        task.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query, tasks],
  );
  const sortedTasks = useMemo(
    () =>
      [...activeTasks].sort((a, b) => {
        const aDays = daysUntil(a.deadline);
        const bDays = daysUntil(b.deadline);
        const aUrgency = urgencyScore(a, aDays, slack);
        const bUrgency = urgencyScore(b, bDays, slack);
        return bUrgency - aUrgency || aDays - bDays;
      }),
    [activeTasks, slack],
  );

  function addTask(
    event: FormEvent<HTMLFormElement>,
    title: string,
    deadline: string,
    summary: string,
  ) {
    event.preventDefault();
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      deadline,
      summary: summary.trim(),
      status: "todo",
      analysis: createPlaceholderAnalysis(summary),
    };
    setTasks((current) => [task, ...current]);
  }

  function saveFeedback(feedback: TaskFeedback) {
    if (!feedbackTask) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === feedbackTask.id
          ? { ...task, status: "done", feedback }
          : task,
      ),
    );
    setFeedbackTask(null);
  }

  function toggleDone(task: Task) {
    if (task.status === "done") {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, status: "todo", feedback: undefined }
            : item,
        ),
      );
    } else {
      setFeedbackTask(task);
    }
  }

  function toggleSubtask(taskId: string, subtaskIndex: number) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const progress = Array.from(
          { length: task.analysis.subtasks.length },
          (_, index) => task.subtaskProgress?.[index] ?? false,
        );
        progress[subtaskIndex] = !progress[subtaskIndex];
        return { ...task, subtaskProgress: progress };
      }),
    );
  }

  function deleteTask(task: Task) {
    const confirmed = window.confirm(
      `「${task.title}」をタスク一覧から削除しますか？\nこの操作は取り消せません。`,
    );
    if (!confirmed) return;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setExpandedTaskId((current) => (current === task.id ? null : current));
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function saveTaskEdit(updatedTask: Task) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      ),
    );
  }

  async function analyzeTask() {
    if (activeTasks.length === 0) return;
    const requestData: AnalyzeRequest = {
      tasks: activeTasks.map((task) => ({
        id: task.id,
        title: task.title,
        summary: task.summary,
        deadline: task.deadline,
      })),
    };

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });
    const responseText = await response.text();
    let responseBody: unknown;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      window.alert("APIから正しいJSON形式の返事がありませんでした。");
      return;
    }

    if (!response.ok) {
      const errorMessage =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        typeof responseBody.error === "string"
          ? responseBody.error
          : "分析に失敗しました。";

      window.alert(errorMessage);
      return;
    }

    if (
      typeof responseBody !== "object" ||
      responseBody === null ||
      !("tasks" in responseBody)
    ) {
      window.alert("分析結果の形式が正しくありませんでした。");
      return;
    }

    const result = responseBody as AnalyzeResponse;
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        const resultForTask = result.tasks.find(
          (resultTask) => resultTask.id === task.id,
        );

        return resultForTask
          ? { ...task, analysis: resultForTask.analysis }
          : task;
      }),
    );
  }

  return (
    <main className="app-shell">
      <PlannerSidebar screen={screen} onNavigate={setScreen} />
      {screen === "add" ? (
        <TaskEntryPanel
          tasks={filteredTasks}
          totalCount={tasks.length}
          query={query}
          onQueryChange={setQuery}
          onSubmit={addTask}
          onToggleDone={toggleDone}
          onDeleteTask={deleteTask}
          onSaveEdit={saveTaskEdit}
          expandedTaskId={expandedTaskId}
          onToggleExpanded={toggleExpanded}
        />
      ) : (
        <PlanPanel
          tasks={sortedTasks}
          slack={slack}
          onSlackChange={setSlack}
          onAnalyze={analyzeTask}
          onToggleDone={toggleDone}
          onToggleSubtask={toggleSubtask}
          expandedTaskId={expandedTaskId}
          onToggleExpanded={toggleExpanded}
        />
      )}
      {feedbackTask && (
        <CompletionDialog
          task={feedbackTask}
          onCancel={() => setFeedbackTask(null)}
          onSave={saveFeedback}
        />
      )}
    </main>
  );
}

function urgencyScore(task: Task, days: number, slack: string) {
  const timePressure =
    slack === "かなりタイト"
      ? 4
      : slack === "若干タイト"
        ? 3
        : slack === "余裕あり"
          ? 1
          : 0;
  const deadlineScore =
    days < 0
      ? 16
      : days === 0
        ? 14
        : days <= 3
          ? 10
          : days <= 7
            ? 7
            : days <= 14
              ? 4
              : 1;
  return (
    deadlineScore +
    task.analysis.difficulty +
    timePressure +
    task.analysis.estimatedHours / 4
  );
}
