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
  feedback?: TaskFeedback;
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
    title: "生物のレポート",
    deadline: "2026-10-06",
    summary: "授業で扱った生態系について、参考文献を2つ以上使って考察する。",
    status: "todo",
    analysis: { difficulty: 3, estimatedHours: 4, subtasks: ["テーマを決める", "参考文献を探す", "考察を書いて見直す"], tip: "参考文献探しに時間がかかりそう。先に候補を3つ集めよう。" },
  },
  {
    id: "sample-2",
    title: "数学の問題集 p.42〜48",
    deadline: "2026-10-03",
    summary: "二次関数の章末問題。わからない問題には印をつける。",
    status: "todo",
    analysis: { difficulty: 4, estimatedHours: 3, subtasks: ["例題を読み直す", "問題を解く", "間違いを解き直す"], tip: "全部を一気に解かず、2ページずつ休憩を入れると進めやすいよ。" },
  },
  {
    id: "sample-3",
    title: "英単語チェック",
    deadline: "2026-10-10",
    summary: "Unit 5 の単語を覚えて、小テストに備える。",
    status: "todo",
    analysis: { difficulty: 2, estimatedHours: 2, subtasks: ["単語をざっと確認", "苦手な単語に印をつける", "翌日にもう一度テスト"], tip: "短い時間でも、日を分けて見直すと覚えやすいよ。" },
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
