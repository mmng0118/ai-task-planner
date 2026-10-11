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

const storageKey = "ai-task-planner.tasks.v1";

export default function Home() {
  const [screen, setScreen] = useState<PlannerScreen>("add");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [analyzingTaskIds, setAnalyzingTaskIds] = useState<string[]>([]);
  const isAnalyzing = analyzingTaskIds.length > 0;

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
        const aUrgency = urgencyScore(a, aDays);
        const bUrgency = urgencyScore(b, bDays);
        return bUrgency - aUrgency || aDays - bDays;
      }),
    [activeTasks],
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
      analysisStatus: "pending",
    };
    setTasks((current) => [task, ...current]);
    void analyzeTasks([task]);
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

  function deleteTasks(taskIds: string[]) {
    const ids = new Set(taskIds);
    setTasks((current) => current.filter((task) => !ids.has(task.id)));
    setExpandedTaskId((current) => current && ids.has(current) ? null : current);
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function openTaskInList(task: Task) {
    setQuery(task.title);
    setExpandedTaskId(task.id);
    setScreen("list");
  }

  function saveTaskEdit(updatedTask: Task) {
    const currentTask = tasks.find((task) => task.id === updatedTask.id);
    const needsReanalysis = Boolean(currentTask && currentTask.status === "todo" && (
      currentTask.title !== updatedTask.title ||
      currentTask.summary !== updatedTask.summary ||
      currentTask.deadline !== updatedTask.deadline
    ));
    const taskToSave = needsReanalysis
      ? { ...updatedTask, analysisStatus: "pending" as const, analysisError: undefined }
      : updatedTask;
    setTasks((currentTasks) => currentTasks.map((task) =>
      task.id === updatedTask.id ? taskToSave : task,
    ));
    if (needsReanalysis) void analyzeTasks([taskToSave]);
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
      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          const resultForTask = result.tasks.find(
            (resultTask) => resultTask.id === task.id,
          );

          return resultForTask
              ? { ...task, analysis: resultForTask.analysis, analysisStatus: "complete", analysisError: undefined }
            : task;
        }),
      );
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
