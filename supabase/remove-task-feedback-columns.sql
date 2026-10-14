alter table public.tasks
  drop column if exists feedback_difficulty,
  drop column if exists feedback_actual_minutes;
