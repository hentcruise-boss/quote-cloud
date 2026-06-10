-- ============================================================
-- 第十二階段-d:權限細分到個別成員
-- 員工(staff)只看/編「自己負責(owner)或被指派(participant)」的案件;
-- 管理員(admin)看全部。外部維持「被指派才看得到」。
-- 在 001~016 之後執行。可重複執行。
--
-- 共用、非案件範圍的資料(產品/場景/庫存/倉/調撥/採購/BOM)維持「內部皆可」。
-- 要讓某內部同事也能看某案:在案件「參與者」面板把他加入(關係可選 watcher)。
-- ============================================================

-- 可見:管理員全部;否則需為負責人或參與者
create or replace function can_see_case(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
      or exists (select 1 from cases c where c.id = cid and c.owner_id = auth.uid())
      or exists (select 1 from case_participants cp where cp.case_id = cid and cp.profile_id = auth.uid());
$$;

-- 可編輯:內部 且 可見(管理員→全部;員工→自己的案)
create or replace function can_edit_case(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_internal() and can_see_case(cid);
$$;

-- ── cases(insert 需特別處理:新列尚不可查,故用 owner=self / admin)──
drop policy if exists cases_select on cases;
drop policy if exists cases_write  on cases;
drop policy if exists cases_insert on cases;
drop policy if exists cases_update on cases;
drop policy if exists cases_delete on cases;
create policy cases_select on cases for select using (can_see_case(id));
create policy cases_insert on cases for insert with check (is_internal() and (is_admin() or owner_id = auth.uid()));
create policy cases_update on cases for update using (can_edit_case(id)) with check (is_internal());
create policy cases_delete on cases for delete using (can_edit_case(id));

-- ── 簡單案件範圍表:select=可見;write=可編輯 ─────────────
do $$
declare t text;
begin
  foreach t in array array['quotes','production_tasks','qc_checks','delivery_records'] loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format('create policy %I on %I for select using (can_see_case(case_id))', t || '_select', t);
    execute format('create policy %I on %I for all using (can_edit_case(case_id)) with check (can_edit_case(case_id))', t || '_write', t);
  end loop;
end $$;

-- ── quote_items:依其報價所屬案件是否可編輯 ────────────────
drop policy if exists quote_items_internal on quote_items;
drop policy if exists quote_items_scope    on quote_items;
create policy quote_items_scope on quote_items for all
  using (exists (select 1 from quotes q where q.id = quote_items.quote_id and can_edit_case(q.case_id)))
  with check (exists (select 1 from quotes q where q.id = quote_items.quote_id and can_edit_case(q.case_id)));

-- ── case_events:可見才讀(內部備註僅內部);可編輯才寫 ─────
drop policy if exists case_events_select on case_events;
drop policy if exists case_events_write  on case_events;
create policy case_events_select on case_events for select using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy case_events_write  on case_events for all using (can_edit_case(case_id)) with check (can_edit_case(case_id));

-- ── comments ────────────────────────────────────────────────
drop policy if exists comments_select on comments;
drop policy if exists comments_insert on comments;
drop policy if exists comments_modify on comments;
drop policy if exists comments_delete on comments;
create policy comments_select on comments for select using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy comments_insert on comments for insert with check (can_edit_case(case_id) or (can_see_case(case_id) and author_id = auth.uid() and visibility = 'all'));
create policy comments_modify on comments for update using (can_edit_case(case_id) or author_id = auth.uid()) with check (can_edit_case(case_id) or author_id = auth.uid());
create policy comments_delete on comments for delete using (can_edit_case(case_id) or author_id = auth.uid());

-- ── attachments ─────────────────────────────────────────────
drop policy if exists attachments_select on attachments;
drop policy if exists attachments_insert on attachments;
drop policy if exists attachments_delete on attachments;
create policy attachments_select on attachments for select using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy attachments_insert on attachments for insert with check (can_edit_case(case_id) or (can_see_case(case_id) and uploaded_by = auth.uid() and visibility = 'all'));
create policy attachments_delete on attachments for delete using (can_edit_case(case_id) or uploaded_by = auth.uid());

-- ── tickets ─────────────────────────────────────────────────
drop policy if exists tickets_select on tickets;
drop policy if exists tickets_insert on tickets;
drop policy if exists tickets_update on tickets;
drop policy if exists tickets_delete on tickets;
create policy tickets_select on tickets for select using (can_see_case(case_id));
create policy tickets_insert on tickets for insert with check (can_edit_case(case_id) or (can_see_case(case_id) and created_by = auth.uid()));
create policy tickets_update on tickets for update using (can_edit_case(case_id)) with check (can_edit_case(case_id));
create policy tickets_delete on tickets for delete using (can_edit_case(case_id));

-- ── feedback ────────────────────────────────────────────────
drop policy if exists feedback_select on feedback;
drop policy if exists feedback_insert on feedback;
drop policy if exists feedback_modify on feedback;
create policy feedback_select on feedback for select using (can_see_case(case_id));
create policy feedback_insert on feedback for insert with check (can_edit_case(case_id) or (can_see_case(case_id) and submitted_by = auth.uid()));
create policy feedback_modify on feedback for all using (can_edit_case(case_id) or submitted_by = auth.uid()) with check (can_edit_case(case_id) or submitted_by = auth.uid());

-- ── contracts / invoices:可編輯內部 或 該案『客戶』參與者(讀)──
drop policy if exists contracts_select on contracts;
drop policy if exists contracts_write  on contracts;
create policy contracts_select on contracts for select using (
  can_edit_case(case_id) or exists (select 1 from case_participants cp where cp.case_id = contracts.case_id and cp.profile_id = auth.uid() and cp.relation = 'customer')
);
create policy contracts_write on contracts for all using (can_edit_case(case_id)) with check (can_edit_case(case_id));

drop policy if exists invoices_select on invoices;
drop policy if exists invoices_write  on invoices;
create policy invoices_select on invoices for select using (
  can_edit_case(case_id) or exists (select 1 from case_participants cp where cp.case_id = invoices.case_id and cp.profile_id = auth.uid() and cp.relation = 'customer')
);
create policy invoices_write on invoices for all using (can_edit_case(case_id)) with check (can_edit_case(case_id));

-- ── case_participants:可編輯該案才可管理參與者 ──────────────
drop policy if exists case_participants_internal on case_participants;
drop policy if exists case_participants_scope    on case_participants;
create policy case_participants_scope on case_participants for all
  using (can_edit_case(case_id)) with check (can_edit_case(case_id));
