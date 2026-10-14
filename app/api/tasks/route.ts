import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimatedMinutes } from "@/lib/tasks";

type TaskPayload = {
  id: string;
  title: string;
  deadline: string;
  summary: string;
  status: "todo" | "done";
  analysisStatus: "pending" | "complete";
  analysis: {
    summary: string;
    difficulty: number;
    estimatedHours: number;
    subtasks: string[];
    tip: string;
  };
  subtaskProgress?: boolean[];
  feedback?: {
    difficulty: number;
    actualHours: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskPayload(value: unknown): value is TaskPayload {
  if (!isRecord(value) || !isRecord(value.analysis)) return false;
  const analysis = value.analysis;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.deadline === "string" &&
    typeof value.summary === "string" &&
    (value.status === "todo" || value.status === "done") &&
    (value.analysisStatus === "pending" || value.analysisStatus === "complete") &&
    typeof analysis.summary === "string" &&
    typeof analysis.difficulty === "number" &&
    typeof analysis.estimatedHours === "number" &&
    Array.isArray(analysis.subtasks) &&
    analysis.subtasks.every((subtask) => typeof subtask === "string") &&
    typeof analysis.tip === "string"
  );
}

async function getSignedInUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null };
  }

  return { supabase, user: data.user };
}

function toTaskRow(task: TaskPayload, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title.trim(),
    deadline: task.deadline,
    summary: task.summary,
    analysis_summary: task.analysis.summary,
    difficulty: task.analysis.difficulty,
    estimated_minutes: estimatedMinutes(task.analysis.estimatedHours),
    tip: task.analysis.tip,
    status: task.status,
    analysis_status: task.analysisStatus,
    feedback_difficulty: task.feedback?.difficulty ?? null,
    feedback_actual_minutes: task.feedback
      ? Math.round(task.feedback.actualHours * 60)
      : null,
  };
}

async function replaceSubtasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  task: TaskPayload,
) {
  const { error: deleteError } = await supabase
    .from("subtasks")
    .delete()
    .eq("task_id", task.id);

  if (deleteError) return deleteError;
  if (task.analysis.subtasks.length === 0) return null;

  const rows = task.analysis.subtasks.map((title, position) => ({
    task_id: task.id,
    title,
    is_done: task.subtaskProgress?.[position] ?? false,
    position,
  }));

  const { error } = await supabase.from("subtasks").insert(rows);
  return error;
}

export async function GET() {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const task = isRecord(body) ? body.task : undefined;
  if (!isTaskPayload(task) || !/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
    return NextResponse.json({ error: "タスクの形式が正しくありません。" }, { status: 400 });
  }

  const { error: taskError } = await supabase
    .from("tasks")
    .insert(toTaskRow(task, user.id));

  if (taskError) {
    // A legacy-data import may be retried while its first request is still
    // finishing. Accept the duplicate only when the row belongs to this user.
    if (taskError.code === "23505") {
      const { data: existingTask, error: lookupError } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", task.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!lookupError && existingTask) {
        return NextResponse.json({ id: task.id, alreadyExists: true });
      }
    }

    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  const subtaskError = await replaceSubtasks(supabase, task);
  if (subtaskError) {
    return NextResponse.json({ error: subtaskError.message }, { status: 500 });
  }

  return NextResponse.json({ id: task.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const task = isRecord(body) ? body.task : undefined;
  if (!isTaskPayload(task) || !/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
    return NextResponse.json({ error: "タスクの形式が正しくありません。" }, { status: 400 });
  }

  const { data: updatedTask, error: taskError } = await supabase
    .from("tasks")
    .update(toTaskRow(task, user.id))
    .eq("id", task.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
  if (!updatedTask) {
    return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
  }

  const subtaskError = await replaceSubtasks(supabase, task);
  if (subtaskError) {
    return NextResponse.json({ error: subtaskError.message }, { status: 500 });
  }

  return NextResponse.json({ id: task.id });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const ids = isRecord(body) ? body.ids : undefined;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "削除するタスクIDが正しくありません。" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ deletedIds: [] });

  const { data: ownedTasks, error: lookupError } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", user.id)
    .in("id", ids);

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const ownedIds = (ownedTasks ?? []).map((task) => task.id);
  if (ownedIds.length > 0) {
    const { error: subtasksError } = await supabase
      .from("subtasks")
      .delete()
      .in("task_id", ownedIds);

    if (subtasksError) {
      return NextResponse.json({ error: subtasksError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .in("id", ownedIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ deletedIds: ownedIds });
}
