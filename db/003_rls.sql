-- ============================================================
-- 第一階段 RLS + Storage (內部團隊可讀寫; 關閉匿名外網)
-- ⚠️ 執行後, 原本用 anon key 直連的舊頁面將無法讀寫 ——
--    這是預期的: 資料自此關進「登入後」, 由新版 App 以 Auth 存取。
-- 可重複執行 (政策先 drop 再 create)。
--
-- 第二階段才會放寬給客戶/供應商/現場, 並加上「成本不外洩」乾淨視圖。
-- ============================================================

-- 目前使用者是否為內部 (admin/staff)
create or replace function is_internal()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin','staff')
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ── profiles ────────────────────────────────────────────────
alter table profiles enable row level security;
drop policy if exists profiles_select       on profiles;
drop policy if exists profiles_update_self   on profiles;
drop policy if exists profiles_admin_all     on profiles;
create policy profiles_select     on profiles for select using (id = auth.uid() or is_internal());
create policy profiles_update_self on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all  on profiles for all    using (is_admin()) with check (is_admin());

-- ── 第一階段: 其餘業務資料 = 內部可讀寫 ────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'customers','cases','case_participants','quotes','quote_items',
    'case_events','comments','attachments','products','scenes',
    'export_history','projects'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format(
      'create policy %I on %I for all using (is_internal()) with check (is_internal())',
      t || '_internal', t);
  end loop;
end $$;

-- ── Storage: 私有 bucket case-files (第一階段內部可存取) ─────
insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

drop policy if exists "case-files internal read"   on storage.objects;
drop policy if exists "case-files internal write"  on storage.objects;
drop policy if exists "case-files internal update" on storage.objects;
drop policy if exists "case-files internal delete" on storage.objects;
create policy "case-files internal read"   on storage.objects for select using (bucket_id = 'case-files' and is_internal());
create policy "case-files internal write"  on storage.objects for insert with check (bucket_id = 'case-files' and is_internal());
create policy "case-files internal update" on storage.objects for update using (bucket_id = 'case-files' and is_internal());
create policy "case-files internal delete" on storage.objects for delete using (bucket_id = 'case-files' and is_internal());
