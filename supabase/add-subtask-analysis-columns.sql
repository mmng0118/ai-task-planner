-- Run once in Supabase SQL Editor before deploying subtask-level analysis.
-- Existing rows keep NULL values so the app can ask for a fresh analysis.
alter table public.subtasks
  add column if not exists description text,
  add column if not exists estimated_minutes integer,
  add column if not exists difficulty smallint;

notify pgrst, 'reload schema';
