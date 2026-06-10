-- ============================================================
-- 第二階段:對外開放 (客戶 / 供應商 / 現場) + 成本不外洩
-- 在 001 ~ 003 之後執行。可重複執行 (idempotent)。
--
-- 模型:外部使用者透過 case_participants 被指派到案件;
--       只看得到被指派的案件。成本欄位以「乾淨視圖」對外遮蔽。
-- ============================================================

-- 能否看到某案件:內部全部;外部須為該案件參與者
-- (security definer → 內部查 case_participants 時不受其 RLS 影響)
create or replace function can_see_case(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_internal()
      or exists (select 1 from case_participants cp
                 where cp.case_id = cid and cp.profile_id = auth.uid());
$$;

-- ── cases:參與者可讀;僅內部可寫 ──────────────────────────
drop policy if exists cases_internal on cases;
drop policy if exists cases_select   on cases;
drop policy if exists cases_write     on cases;
create policy cases_select on cases for select using (can_see_case(id));
create policy cases_write  on cases for all    using (is_internal()) with check (is_internal());

-- ── quotes:參與者可讀;僅內部可寫 ─────────────────────────
drop policy if exists quotes_internal on quotes;
drop policy if exists quotes_select   on quotes;
drop policy if exists quotes_write     on quotes;
create policy quotes_select on quotes for select using (can_see_case(case_id));
create policy quotes_write  on quotes for all    using (is_internal()) with check (is_internal());

-- ── case_events:參與者讀 (內部備註隱藏);僅內部寫 ─────────
drop policy if exists case_events_internal on case_events;
drop policy if exists case_events_select   on case_events;
drop policy if exists case_events_write     on case_events;
create policy case_events_select on case_events for select
  using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy case_events_write on case_events for all
  using (is_internal()) with check (is_internal());

-- ── comments:參與者可讀 + 寫自己的 (對外強制 visibility='all') ──
drop policy if exists comments_internal on comments;
drop policy if exists comments_select   on comments;
drop policy if exists comments_insert   on comments;
drop policy if exists comments_modify   on comments;
drop policy if exists comments_delete   on comments;
create policy comments_select on comments for select
  using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy comments_insert on comments for insert
  with check (is_internal() or (can_see_case(case_id) and author_id = auth.uid() and visibility = 'all'));
create policy comments_modify on comments for update
  using (is_internal() or author_id = auth.uid()) with check (is_internal() or author_id = auth.uid());
create policy comments_delete on comments for delete
  using (is_internal() or author_id = auth.uid());

-- ── attachments:參與者可讀 + 上傳自己的;內部全部 ─────────
drop policy if exists attachments_internal on attachments;
drop policy if exists attachments_select   on attachments;
drop policy if exists attachments_insert   on attachments;
drop policy if exists attachments_delete   on attachments;
create policy attachments_select on attachments for select
  using (can_see_case(case_id) and (visibility = 'all' or is_internal()));
create policy attachments_insert on attachments for insert
  with check (is_internal() or (can_see_case(case_id) and uploaded_by = auth.uid() and visibility = 'all'));
create policy attachments_delete on attachments for delete
  using (is_internal() or uploaded_by = auth.uid());

-- ── customers:參與者可讀自己案件的客戶;內部全部 ──────────
drop policy if exists customers_internal on customers;
drop policy if exists customers_select   on customers;
drop policy if exists customers_write     on customers;
create policy customers_select on customers for select using (
  is_internal() or exists (
    select 1 from cases c
    join case_participants cp on cp.case_id = c.id
    where c.customer_id = customers.id and cp.profile_id = auth.uid()
  )
);
create policy customers_write on customers for all using (is_internal()) with check (is_internal());

-- ── 對外乾淨報價視圖 (僅「客戶」參與者;不含 cost/vendor/fee/毛利) ──
-- 視圖以擁有者執行 → 繞過 quote_items 原表 RLS;列的可見性由 where 控制,
-- 欄位的可見性由「只投影安全欄位」保證 → 成本在資料層即不存在於回應。
drop view if exists quote_items_public;
create view quote_items_public as
  select qi.id, q.case_id, qi.quote_id, qi.floor, qi.space, qi.sku, qi.name,
         qi.spec, qi.material, qi.price, qi.qty, qi.remark, qi.sort_order
  from quote_items qi
  join quotes q on q.id = qi.quote_id
  where is_internal() or exists (
    select 1 from case_participants cp
    where cp.case_id = q.case_id and cp.profile_id = auth.uid() and cp.relation = 'customer'
  );
grant select on quote_items_public to authenticated;

-- ── 公開姓名視圖 (只露 id, full_name) ─────────────────────
drop view if exists public_profiles;
create view public_profiles as select id, full_name from profiles;
grant select on public_profiles to authenticated;

-- ── 附件 → 時間軸事件 (trigger;讓外部上傳免寫 case_events 權限) ──
create or replace function log_attachment_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into case_events (case_id, actor_id, type, summary, visibility)
  values (new.case_id, new.uploaded_by, 'attachment',
          '上傳檔案:' || coalesce(new.filename, ''), coalesce(new.visibility, 'all'));
  return new;
end; $$;

drop trigger if exists trg_attachment_event on attachments;
create trigger trg_attachment_event after insert on attachments
  for each row execute function log_attachment_event();

-- ── Storage:參與者可讀/上傳該案件附件 ───────────────────
-- 物件路徑 case/<case_id>/<檔案>;取第 2 段為 case_id。
drop policy if exists "case-files internal read"     on storage.objects;
drop policy if exists "case-files internal write"    on storage.objects;
drop policy if exists "case-files internal update"   on storage.objects;
drop policy if exists "case-files internal delete"   on storage.objects;
drop policy if exists "case-files participant read"  on storage.objects;
drop policy if exists "case-files participant write" on storage.objects;
drop policy if exists "case-files participant del"   on storage.objects;
create policy "case-files participant read" on storage.objects for select using (
  bucket_id = 'case-files' and (is_internal() or can_see_case(nullif((storage.foldername(name))[2], '')::uuid))
);
create policy "case-files participant write" on storage.objects for insert with check (
  bucket_id = 'case-files' and (is_internal() or can_see_case(nullif((storage.foldername(name))[2], '')::uuid))
);
create policy "case-files participant del" on storage.objects for delete using (
  bucket_id = 'case-files' and is_internal()
);
