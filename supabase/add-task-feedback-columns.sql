alter table public.tasks
  add column if not exists feedback_difficulty smallint,
  add column if not exists feedback_actual_minutes integer,
  add column if not exists feedback_reflection text;
