-- ============================================================
-- 第十階段-b:客戶付款進度可視
-- 放寬 contracts / invoices 的「讀取」給該案件的『客戶』參與者;
-- 寫入仍限內部。供應商/現場看不到(避免外洩交易金額)。
-- 在 009 之後執行。可重複執行。
-- ============================================================

-- contracts
drop policy if exists contracts_internal on contracts;
drop policy if exists contracts_select   on contracts;
drop policy if exists contracts_write     on contracts;
create policy contracts_select on contracts for select using (
  is_internal() or exists (
    select 1 from case_participants cp
    where cp.case_id = contracts.case_id and cp.profile_id = auth.uid() and cp.relation = 'customer'
  )
);
create policy contracts_write on contracts for all using (is_internal()) with check (is_internal());

-- invoices
drop policy if exists invoices_internal on invoices;
drop policy if exists invoices_select   on invoices;
drop policy if exists invoices_write     on invoices;
create policy invoices_select on invoices for select using (
  is_internal() or exists (
    select 1 from case_participants cp
    where cp.case_id = invoices.case_id and cp.profile_id = auth.uid() and cp.relation = 'customer'
  )
);
create policy invoices_write on invoices for all using (is_internal()) with check (is_internal());
