export type TaskStatus = "todo" | "done";

export type TaskAnalysis = {
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
    analysis : TaskAnalysis;
  }>;
};

// Replace this deterministic placeholder with an analysis API adapter later.
export function createPlaceholderAnalysis(summary: string): TaskAnalysis {
  const words = summary.trim().split(/\s+/).filter(Boolean).length;
  const difficulty = Math.min(5, Math.max(2, Math.ceil(words / 12) + 1));
  return {
    difficulty,
    estimatedHours: Math.max(2, Math.round(words / 8)),
    subtasks: ["課題の条件を確認する", "必要な資料を集める", "手を動かして仕上げる"],
    tip: "最初の 15 分で、完成形と必要な材料をメモしてみよう。",
  };
}

export const initialTasks: Task[] = [
  {
    id: "sample-1",
    title: "レポートを提出する",
    deadline: "2026-10-14",
    summary: "授業で扱ったテーマについて、参考文献を使ってレポートを書く。",
    status: "todo",
    analysis: { difficulty: 4, estimatedHours: 5, subtasks: ["課題の条件を確認する", "参考文献を探す", "構成を作って執筆する"], tip: "先に構成を決めてから書き始めると、スムーズに進められます。" },
  },
  {
    id: "sample-2",
    title: "参考文献を読む",
    deadline: "2026-10-21",
    summary: "参考文献を読んでコメントシートにまとめる",
    status: "todo",
    analysis: { difficulty: 3, estimatedHours: 10, subtasks: ["図書館で本を借りる", "あらすじを1割書く", "本文を7割書く", "結論を2割書く"], tip: "テーマに沿った文献を探すことが、レポートを完成させるためのカギです。" },
  },
  {
    id: "sample-3",
    title: "小テストの勉強をする",
    deadline: "2026-10-07",
    summary: "次回の小テスト範囲を復習し、間違えた問題を解き直す。",
    status: "todo",
    analysis: { difficulty: 3, estimatedHours: 2, subtasks: ["テスト範囲を確認する", "問題を解いて苦手を探す", "間違いを解き直す"], tip: "短時間でも問題を解いて確認すると、苦手な箇所が見つかります。" },
  },
  {
    id: "sample-4",
    title: "教科書の予習",
    deadline: "2026-10-15",
    summary: "次回の授業範囲を読み、わからない言葉を調べる。",
    status: "todo",
    analysis: { difficulty: 2, estimatedHours: 1, subtasks: ["授業範囲を読む", "重要語句を確認する", "疑問点をメモする"], tip: "分からないところに印をつけておけば、授業中に確認できます。" },
  },
];

export function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${date}T00:00:00`);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
}

export function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

export function formatShortDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}`;
}
