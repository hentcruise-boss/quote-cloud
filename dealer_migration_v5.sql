-- =====================================================================
--  Migration v5：每位經銷商指定收款帳戶（mmj_tw / xd_tw / qy_overseas）
--  跑完 v4 後執行；可重複跑。
-- =====================================================================

alter table public.dealers
  add column if not exists bank_account_key text not null default 'mmj_tw';

alter table public.dealers
  drop constraint if exists dealers_bank_account_chk;
alter table public.dealers
  add constraint dealers_bank_account_chk
  check (bank_account_key in ('mmj_tw','xd_tw','qy_overseas'));

-- demo 經銷商分別示範三組帳戶（不影響其他資料）
update public.dealers set bank_account_key = 'mmj_tw'      where email = 'dealer-a@mm-demo.com';
update public.dealers set bank_account_key = 'xd_tw'       where email = 'dealer-b@mm-demo.com';
update public.dealers set bank_account_key = 'qy_overseas' where email = 'dealer-c@mm-demo.com';
