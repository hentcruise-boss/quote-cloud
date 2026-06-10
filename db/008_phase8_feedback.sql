-- ============================================================
-- 第八階段-c:客戶滿意度回饋 (feedback)
-- 在 001 ~ 007 之後執行。可重複執行。
-- 權限:參與者可讀;客戶/參與者可提交自己的;內部可讀全部。
-- ============================================================

create table if not exists feedback (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid references cases(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  submitted_by uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_feedback_case on feedback(case_id, created_at);

alter table feedback enable row level security;
drop policy if exists feedback_select on feedback;
drop policy if exists feedback_insert on feedback;
drop policy if exists feedback_modify on feedback;
create policy feedback_select on feedback for select using (can_see_case(case_id));
create policy feedback_insert on feedback for insert
  with check (is_internal() or (can_see_case(case_id) and submitted_by = auth.uid()));
create policy feedback_modify on feedback for all
  using (is_internal() or submitted_by = auth.uid())
  with check (is_internal() or submitted_by = auth.uid());

-- 回饋 → 時間軸事件 (讓內部看到 + 觸發通知)
create or replace function log_feedback_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into case_events (case_id, actor_id, type, summary, visibility)
  values (new.case_id, new.submitted_by, 'note',
          '客戶滿意度回饋:' || new.rating || '★' ||
          case when coalesce(new.comment,'') <> '' then '「' || left(new.comment, 40) || '」' else '' end,
          'all');
  return new;
end; $$;

drop trigger if exists trg_feedback_event on feedback;
create trigger trg_feedback_event after insert on feedback
  for each row execute function log_feedback_event();

do $$
begin
  alter publication supabase_realtime add table feedback;
exception when duplicate_object then null;
end $$;
