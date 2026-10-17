import { daysUntil, type Task, type TaskSubtask } from "./tasks";

export type PlannedSubtask = {
  task: Task;
  subtask: TaskSubtask;
  subtaskIndex: number;
  isFirstForTask: boolean;
};

type TaskQueue = {
  task: Task;
  pendingIndices: number[];
  cursor: number;
  remainingMinutes: number;
};

/**
 * Merge each task's ordered action steps into one priority queue.
 * Only the next unfinished step from a task is eligible, so its original
 * dependency order stays intact while larger tasks can be interleaved.
 */
export function buildSubtaskPlan(tasks: Task[], today = new Date()): PlannedSubtask[] {
  const queues: TaskQueue[] = tasks
    .filter((task) => task.status === "todo" && task.analysisStatus === "complete")
    .map((task) => {
      const pendingIndices = task.analysis.subtasks
        .map((_, index) => index)
        .filter((index) => !(task.subtaskProgress?.[index] ?? false));
      return {
        task,
        pendingIndices,
        cursor: 0,
        remainingMinutes: pendingIndices.reduce(
          (sum, index) => sum + task.analysis.subtasks[index].estimatedMinutes,
          0,
        ),
      };
    })
    .filter((queue) => queue.pendingIndices.length > 0);

  const plan: PlannedSubtask[] = [];
  const seenTasks = new Set<string>();
  let previousTaskId = "";

  while (queues.some((queue) => queue.cursor < queue.pendingIndices.length)) {
    const candidates = queues
      .filter((queue) => queue.cursor < queue.pendingIndices.length)
      .map((queue) => {
        const subtaskIndex = queue.pendingIndices[queue.cursor];
        const subtask = queue.task.analysis.subtasks[subtaskIndex];
        return {
          queue,
          subtask,
          subtaskIndex,
          score: priorityScore(queue, subtask, previousTaskId, today),
          daysLeft: daysUntil(queue.task.deadline),
        };
      })
      .sort((a, b) =>
        b.score - a.score ||
        a.daysLeft - b.daysLeft ||
        a.queue.task.deadline.localeCompare(b.queue.task.deadline) ||
        a.queue.task.title.localeCompare(b.queue.task.title, "ja") ||
        a.subtaskIndex - b.subtaskIndex,
      );

    const next = candidates[0];
    if (!next) break;

    plan.push({
      task: next.queue.task,
      subtask: next.subtask,
      subtaskIndex: next.subtaskIndex,
      isFirstForTask: !seenTasks.has(next.queue.task.id),
    });
    seenTasks.add(next.queue.task.id);
    next.queue.cursor += 1;
    next.queue.remainingMinutes = Math.max(
      0,
      next.queue.remainingMinutes - next.subtask.estimatedMinutes,
    );
    previousTaskId = next.queue.task.id;
  }

  return plan;
}

function priorityScore(
  queue: TaskQueue,
  subtask: TaskSubtask,
  previousTaskId: string,
  today: Date,
) {
  const daysLeft = daysUntil(queue.task.deadline, today);
  // Deadline pressure leads. Remaining workload raises the rank when a task
  // has little time left; quick wins get a bounded boost and large tasks yield
  // one place to other tasks between action steps when they are not urgent.
  const deadlinePressure =
    daysLeft < 0 ? 110 + Math.min(20, Math.abs(daysLeft))
      : daysLeft === 0 ? 100
        : daysLeft <= 1 ? 90
          : daysLeft <= 3 ? 76
            : daysLeft <= 7 ? 62
              : daysLeft <= 14 ? 48
                : daysLeft <= 30 ? 36
                  : 24;
  const workloadPressure = Math.min(
    24,
    (queue.remainingMinutes / Math.max(1, daysLeft + 1) / 30) * 3,
  );
  const subtaskEffort =
    (Math.max(1, Math.min(5, subtask.difficulty)) - 1) * 1.5 +
    Math.min(6, Math.log2(Math.max(1, subtask.estimatedMinutes / 10)) * 1.5);
  const quickFinishBonus = queue.remainingMinutes <= 60
    ? 20
    : queue.remainingMinutes <= 120 ? 9 : 0;
  const quickActionBonus = subtask.estimatedMinutes <= 20 ? 3 : 0;
  const sameTaskPenalty = previousTaskId === queue.task.id && queue.remainingMinutes > 60
    ? Math.max(0, 25 - deadlinePressure * 0.2)
    : 0;
  const finishContinuationBonus = previousTaskId === queue.task.id && queue.remainingMinutes <= 60
    ? 16
    : 0;

  return deadlinePressure + workloadPressure + subtaskEffort + quickFinishBonus +
    quickActionBonus - sameTaskPenalty + finishContinuationBonus;
}
