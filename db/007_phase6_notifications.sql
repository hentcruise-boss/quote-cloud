-- ============================================================
-- 第六階段:站內通知 (notifications)
-- 在 001 ~ 006 之後執行。可重複執行。
-- 通知由 trigger 自動對「案件參與者 + 負責人」產生(排除動作者本人)。
-- ============================================================

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  case_id    uuid references cases(id) on delete cascade,
  message    text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, is_read, created_at desc);

alter table notifications enable row level security;
drop policy if exists notif_select on notifications;
drop policy if exists notif_update on notifications;
drop policy if exists notif_delete on notifications;
create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on notifications for delete using (user_id = auth.uid());
-- 無 insert policy:僅由下方 trigger (security definer) 寫入

-- 產生通知:案件參與者 + 負責人,排除動作者本人 (內部備註只通知負責人)
create or replace function notify_case(p_case_id uuid, p_actor uuid, p_message text, p_internal_only boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, case_id, message)
  select distinct r.uid, p_case_id, p_message
  from (
    select owner_id as uid from cases where id = p_case_id and owner_id is not null
    union
    select cp.profile_id from case_participants cp where cp.case_id = p_case_id and not p_internal_only
  ) r
  where r.uid is not null
    and r.uid <> coalesce(p_actor, '00000000-0000-0000-0000-000000000000'::uuid);
end; $$;

-- 時間軸事件 → 通知
create or replace function trg_event_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_case(new.case_id, new.actor_id, coalesce(new.summary, new.type), new.visibility = 'internal');
  return new;
end; $$;
drop trigger if exists trg_event_notify on case_events;
create trigger trg_event_notify after insert on case_events for each row execute function trg_event_notify();

-- 留言 → 通知
create or replace function trg_comment_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_case(new.case_id, new.author_id, '新留言:' || left(coalesce(new.body, ''), 40), new.visibility = 'internal');
  return new;
end; $$;
drop trigger if exists trg_comment_notify on comments;
create trigger trg_comment_notify after insert on comments for each row execute function trg_comment_notify();

do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
