-- ============================================================
-- 安全修補:防止「自助升級角色」越權
-- 問題:profiles_update_self 允許使用者更新自己的列(含 role),
--       任何註冊者可用公開 anon key 直接把自己改成 admin。
-- 修法:加觸發器,非管理員不得變更 role。
--   - 透過 API 的一般使用者(auth.uid() 存在且非 admin)→ 擋下
--   - 管理員(is_admin())→ 允許(使用者頁設定角色照常)
--   - SQL Editor / 後端(auth.uid() 為 NULL,本就是 DB 權限)→ 允許(初始設 admin 照常)
-- 在 001 之後執行。可重複執行。
-- ============================================================

create or replace function protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_admin() then
    raise exception '只有管理員可以變更角色';
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_profile_role on profiles;
create trigger trg_protect_profile_role before update on profiles
  for each row execute function protect_profile_role();
