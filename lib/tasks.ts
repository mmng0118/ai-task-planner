export type TaskStatus = "todo" | "done";

export type TaskAnalysis = {
  summary: string;
  difficulty: number;
  estimatedHours: number;
  subtasks: string[];
  tip: string;
};

export type TaskFeedback = {
  difficulty: number;
  actualHours: number;
  reflection: string;
};

export type Task = {
  id: string;
  title: string;
  deadline: string;
  summary: string;
  status: TaskStatus;
  analysis: TaskAnalysis;
  subtaskProgress?: boolean[];
  feedback?: TaskFeedback;
};

export type AnalyzeRequest = {
  tasks: Array<{
    id: string;
    title: string;
    summary: string;
    deadline: string;
  }>;
};

export type AnalyzeResponse = {
  tasks: Array<{
    id: string;
    analysis: TaskAnalysis;
  }>;
};

// Replace this deterministic placeholder with an analysis API adapter later.
export function createPlaceholderAnalysis(summary: string): TaskAnalysis {
  const words = summary.trim().split(/\s+/).filter(Boolean).length;
  const difficulty = Math.min(5, Math.max(2, Math.ceil(words / 12) + 1));
  return {
    summary: summary.trim() || "概要は登録されていません。",
    difficulty,
    estimatedHours: Math.max(2, Math.round(words / 8)),
    subtasks: [
      "課題の条件を確認する",
      "必要な資料を集める",
      "手を動かして仕上げる",
    ],
    tip: "最初の 15 分で、完成形と必要な材料をメモしてみよう。",
  };
}

export const initialTasks: Task[] = [];

export function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${date}T00:00:00`);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
}

export function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatShortDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}`;
}
