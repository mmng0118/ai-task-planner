"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CompletionDialog } from "../components/CompletionDialog";
import { CalendarPanel } from "../components/CalendarPanel";
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

type DatabaseTaskRow = {
  id: string;
  title: string;
  deadline: string;
  summary: string;
  analysis_summary: string | null;
  difficulty: number | null;
  estimated_minutes: number | null;
  tip: string | null;
  status: Task["status"];
  analysis_status: Task["analysisStatus"] | null;
  feedback_difficulty: number | null;
  feedback_actual_minutes: number | null;
  feedback_reflection: string | null;
  subtasks?: Array<{
    title: string;
    is_done: boolean;
    position: number;
  }>;
};

export default function Home() {
  const [screen, setScreen] = useState<PlannerScreen>("add");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [persistenceError, setPersistenceError] = useState("");
  const [query, setQuery] = useState("");
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [analyzingTaskIds, setAnalyzingTaskIds] = useState<string[]>([]);
  const isAnalyzing = analyzingTaskIds.length > 0;

  async function saveTaskRecord(task: Task) {
    try {
      await sendTaskMutation("PATCH", { task: toApiTask(task) });
      return true;
    } catch (error) {
      setPersistenceError(
        error instanceof Error ? error.message : "タスクを保存できませんでした。",
      );
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const rows = await fetchDatabaseTasks();
        if (cancelled) return;
        setTasks(rows.map(mapDatabaseTask));
        setPersistenceError("");
      } catch (error) {
        if (cancelled) return;
        setPersistenceError(
          error instanceof Error
            ? `タスクをデータベースに読み込めませんでした: ${error.message}`
            : "タスクをデータベースに読み込めませんでした。",
        );
      }
    }

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const aUrgency = urgencyScore(a, aDays);
        const bUrgency = urgencyScore(b, bDays);
        return bUrgency - aUrgency || aDays - bDays;
      }),
    [activeTasks],
  );

  async function addTask(
    event: FormEvent<HTMLFormElement>,
    title: string,
    deadline: string,
    summary: string,
  ): Promise<boolean> {
    event.preventDefault();
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      deadline,
      summary: summary.trim(),
      status: "todo",
      analysis: createPlaceholderAnalysis(summary),
      analysisStatus: "pending",
    };

    try {
      await sendTaskMutation("POST", { task: toApiTask(task) });
    } catch (error) {
      setPersistenceError(
        error instanceof Error ? error.message : "タスクを保存できませんでした。",
      );
      return false;
    }

    setTasks((current) => [task, ...current]);
    setPersistenceError("");
    void analyzeTasks([task]);
    return true;
  }

  function saveFeedback(feedback: TaskFeedback) {
    if (!feedbackTask) return;
    const updatedTask = { ...feedbackTask, status: "done" as const, feedback };
    setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
    void saveTaskRecord(updatedTask).then((saved) => {
      if (saved) setPersistenceError("");
    });
    setFeedbackTask(null);
  }

  function toggleDone(task: Task) {
    if (task.status === "done") {
      const updatedTask = { ...task, status: "todo" as const, feedback: undefined };
      setTasks((current) => current.map((item) => item.id === task.id ? updatedTask : item));
      void saveTaskRecord(updatedTask).then((saved) => {
        if (saved) setPersistenceError("");
      });
    } else {
      setFeedbackTask(task);
    }
  }

  function toggleSubtask(taskId: string, subtaskIndex: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const progress = Array.from(
      { length: task.analysis.subtasks.length },
      (_, index) => task.subtaskProgress?.[index] ?? false,
    );
    progress[subtaskIndex] = !progress[subtaskIndex];
    const updatedTask = { ...task, subtaskProgress: progress };
    setTasks((current) => current.map((item) => item.id === taskId ? updatedTask : item));
    void saveTaskRecord(updatedTask).then((saved) => {
      if (saved) setPersistenceError("");
    });
  }

  async function deleteTasks(taskIds: string[]): Promise<boolean> {
    try {
      await sendTaskMutation("DELETE", { ids: taskIds });
    } catch (error) {
      setPersistenceError(
        error instanceof Error ? error.message : "タスクを削除できませんでした。",
      );
      return false;
    }

    const ids = new Set(taskIds);
    setTasks((current) => current.filter((task) => !ids.has(task.id)));
    setExpandedTaskId((current) => current && ids.has(current) ? null : current);
    setPersistenceError("");
    return true;
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function openTaskInList(task: Task) {
    setQuery(task.title);
    setExpandedTaskId(task.id);
    setScreen("list");
  }

  async function saveTaskEdit(updatedTask: Task): Promise<boolean> {
    const currentTask = tasks.find((task) => task.id === updatedTask.id);
    const needsReanalysis = Boolean(currentTask && currentTask.status === "todo" && (
      currentTask.title !== updatedTask.title ||
      currentTask.summary !== updatedTask.summary ||
      currentTask.deadline !== updatedTask.deadline
    ));
    const taskToSave = needsReanalysis
      ? { ...updatedTask, analysisStatus: "pending" as const, analysisError: undefined }
      : updatedTask;

    if (!await saveTaskRecord(taskToSave)) return false;
    setTasks((currentTasks) => currentTasks.map((task) =>
      task.id === updatedTask.id ? taskToSave : task,
    ));
    setPersistenceError("");
    if (needsReanalysis) void analyzeTasks([taskToSave]);
    return true;
  }

  async function analyzeTasks(tasksToAnalyze: Task[]) {
    if (tasksToAnalyze.length === 0) return;
    const taskIds = tasksToAnalyze.map((task) => task.id);
    setAnalyzingTaskIds((current) => [...new Set([...current, ...taskIds])]);
    setTasks((current) => current.map((task) => taskIds.includes(task.id)
      ? { ...task, analysisError: undefined }
      : task,
    ));
    try {
      const requestData: AnalyzeRequest = {
        tasks: tasksToAnalyze.map((task) => ({
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
        throw new Error("APIから正しいJSON形式の返事がありませんでした。");
      }

      if (!response.ok) {
        const errorMessage =
          typeof responseBody === "object" &&
          responseBody !== null &&
          "error" in responseBody &&
          typeof responseBody.error === "string"
            ? responseBody.error
            : "分析に失敗しました。";

        throw new Error(errorMessage);
      }

      if (
        typeof responseBody !== "object" ||
        responseBody === null ||
        !("tasks" in responseBody)
      ) {
        throw new Error("分析結果の形式が正しくありませんでした。");
      }

      const result = responseBody as AnalyzeResponse;
      const resultIds = new Set(result.tasks.map((resultTask) => resultTask.id));
      if (taskIds.some((id) => !resultIds.has(id))) {
        throw new Error("一部のタスクの分析結果がありませんでした。もう一度お試しください。");
      }
      const analyzedTasks = tasksToAnalyze.map((task) => {
        const resultForTask = result.tasks.find((item) => item.id === task.id);
        return resultForTask
          ? {
              ...task,
              analysis: resultForTask.analysis,
              analysisStatus: "complete" as const,
              analysisError: undefined,
              subtaskProgress: undefined,
            }
          : task;
      });
      setTasks((currentTasks) => currentTasks.map((task) =>
        analyzedTasks.find((updatedTask) => updatedTask.id === task.id) ?? task,
      ));
      const saveResults = await Promise.all(analyzedTasks.map(saveTaskRecord));
      if (saveResults.every(Boolean)) setPersistenceError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI分析に失敗しました。もう一度お試しください。";
      setTasks((current) => current.map((task) => taskIds.includes(task.id)
        ? { ...task, analysisError: message }
        : task,
      ));
    } finally {
      setAnalyzingTaskIds((current) => current.filter((id) => !taskIds.includes(id)));
    }
  }

  return (
    <main className="app-shell">
      <PlannerSidebar screen={screen} onNavigate={setScreen} />
      {persistenceError && (
        <div className="persistence-error" role="alert">{persistenceError}</div>
      )}
      {screen === "add" || screen === "list" ? (
        <TaskEntryPanel
          view={screen}
          tasks={filteredTasks}
          totalCount={tasks.length}
          query={query}
          onQueryChange={setQuery}
          onSubmit={addTask}
          onToggleDone={toggleDone}
          onDeleteTasks={deleteTasks}
          onSaveEdit={saveTaskEdit}
          expandedTaskId={expandedTaskId}
          onToggleExpanded={toggleExpanded}
          analyzingTaskIds={analyzingTaskIds}
          onRetryAnalyze={(task) => void analyzeTasks([task])}
          isAnalyzing={isAnalyzing}
        />
      ) : screen === "analyze" ? (
        <PlanPanel
          tasks={sortedTasks.filter((task) => task.analysisStatus !== "pending")}
          onToggleDone={toggleDone}
          onToggleSubtask={toggleSubtask}
          expandedTaskId={expandedTaskId}
          onToggleExpanded={toggleExpanded}
        />
      ) : (
        <CalendarPanel tasks={filteredTasks} query={query} onQueryChange={setQuery} onOpenTaskInList={openTaskInList} />
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

function urgencyScore(task: Task, days: number) {
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
  const workloadScore =
    task.analysis.difficulty + task.analysis.estimatedHours / 4;

  return deadlineScore + workloadScore;
}

function mapDatabaseTask(row: DatabaseTaskRow): Task {
  const fallback = createPlaceholderAnalysis(row.summary);
  const subtasks = [...(row.subtasks ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    summary: row.summary,
    status: row.status,
    analysisStatus: row.analysis_status ?? "pending",
    analysis: {
      summary: row.analysis_summary ?? fallback.summary,
      difficulty: row.difficulty ?? fallback.difficulty,
      estimatedHours:
        row.estimated_minutes === null
          ? fallback.estimatedHours
          : row.estimated_minutes / 60,
      subtasks:
        row.analysis_status === "complete"
          ? subtasks.map((subtask) => subtask.title)
          : fallback.subtasks,
      tip: row.tip ?? fallback.tip,
    },
    subtaskProgress: subtasks.map((subtask) => subtask.is_done),
    feedback:
      typeof row.feedback_difficulty === "number" &&
      typeof row.feedback_actual_minutes === "number"
        ? {
            difficulty: row.feedback_difficulty,
            actualHours: row.feedback_actual_minutes / 60,
            reflection: row.feedback_reflection ?? "",
          }
        : undefined,
  };
}

function toApiTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    deadline: task.deadline,
    summary: task.summary,
    status: task.status,
    analysisStatus: task.analysisStatus ?? "pending",
    analysis: task.analysis,
    subtaskProgress: task.subtaskProgress,
    feedback: task.feedback,
  };
}

async function fetchDatabaseTasks(): Promise<DatabaseTaskRow[]> {
  const response = await fetch("/api/tasks");
  const result = (await response.json()) as {
    tasks?: DatabaseTaskRow[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "タスクを読み込めませんでした。");
  }

  return result.tasks ?? [];
}

async function sendTaskMutation(
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
) {
  const response = await fetch("/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "タスクを保存できませんでした。");
  }
}
