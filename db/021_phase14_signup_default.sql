-- ============================================================
-- 第十四階段:自助註冊安全預設
-- 自助註冊者預設為最低權限「客戶」(看不到成本/案件),
-- 由管理員於「使用者」頁再升級為內部員工/管理員,或設供應商/現場。
-- 在 001 之後執行。可重複執行。(只影響「之後」註冊的新帳號)
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'customer')
  on conflict (id) do nothing;
  return new;
end; $$;
