-- ============================================================
-- 第四階段:售後 / 保固工單 (tickets)
-- 在 001 ~ 005 之後執行。可重複執行。
-- 權限:參與者可讀;客戶/參與者可「建立」工單 (報修);內部管理狀態。
-- ============================================================

create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references cases(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'service'  check (category in ('warranty','service','complaint','other')),
  priority    text not null default 'normal'   check (priority in ('low','normal','high')),
  status      text not null default 'open'     check (status in ('open','in_progress','resolved','closed')),
  created_by  uuid references profiles(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_tickets_case on tickets(case_id, created_at);

drop trigger if exists trg_tickets_touch on tickets;
create trigger trg_tickets_touch before update on tickets for each row execute function touch_updated_at();

alter table tickets enable row level security;
drop policy if exists tickets_select on tickets;
drop policy if exists tickets_insert on tickets;
drop policy if exists tickets_update on tickets;
drop policy if exists tickets_delete on tickets;
-- 讀:案件參與者
create policy tickets_select on tickets for select using (can_see_case(case_id));
-- 建立:內部,或案件參與者建立自己的 (客戶報修)
create policy tickets_insert on tickets for insert
  with check (is_internal() or (can_see_case(case_id) and created_by = auth.uid()));
-- 更新/刪除:僅內部 (狀態流程由內部掌控)
create policy tickets_update on tickets for update using (is_internal()) with check (is_internal());
create policy tickets_delete on tickets for delete using (is_internal());

-- 工單建立 → 時間軸事件 (trigger;讓客戶報修也能留痕,免寫 case_events 權限)
create or replace function log_ticket_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into case_events (case_id, actor_id, type, summary, visibility)
  values (new.case_id, new.created_by, 'note', '建立售後工單:' || coalesce(new.title, ''), 'all');
  return new;
end; $$;

drop trigger if exists trg_ticket_event on tickets;
create trigger trg_ticket_event after insert on tickets
  for each row execute function log_ticket_event();

do $$
begin
  alter publication supabase_realtime add table tickets;
exception when duplicate_object then null;
end $$;
