-- ============================================================
-- 第十二階段-a:庫存不足擋件 + 原子扣庫存
-- 在 010/011/013/014 之後執行。可重複執行。
-- guard:任何負向異動若會使該倉在庫 < 0 即擋下(調撥/出貨/領料/手動出庫皆受保護)。
-- 出貨扣庫存、BOM 扣料改為單一函式(交易內完成,失敗整批回滾)。
-- ============================================================

create or replace function guard_stock_nonneg()
returns trigger language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  if new.delta < 0 then
    select on_hand into cur from inventory where sku = new.sku and warehouse_id = new.warehouse_id;
    if coalesce(cur, 0) + new.delta < 0 then
      raise exception '庫存不足:SKU % 於該倉現有 %,無法扣 %', new.sku, coalesce(cur, 0), -new.delta;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_stock on stock_movements;
create trigger trg_guard_stock before insert on stock_movements for each row execute function guard_stock_nonneg();

-- 出貨扣庫存(依接受的報價;原子)
create or replace function deduct_quote_stock(p_case_id uuid, p_warehouse_id uuid, p_delivery_id uuid, p_actor uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_quote uuid; v_code text; n int;
begin
  if not is_internal() then raise exception '禁止'; end if;
  if p_warehouse_id is null then raise exception '請指定出貨倉'; end if;
  select code into v_code from cases where id = p_case_id;
  select id into v_quote from quotes where case_id = p_case_id and status = 'accepted' order by created_at limit 1;
  if v_quote is null then select id into v_quote from quotes where case_id = p_case_id order by created_at limit 1; end if;
  if v_quote is null then raise exception '找不到報價'; end if;

  insert into stock_movements (sku, delta, warehouse_id, reason, ref_case_id, created_by)
  select qi.sku, -abs(qi.qty), p_warehouse_id, '出貨:' || coalesce(v_code, ''), p_case_id, p_actor
  from quote_items qi join products p on p.sku = qi.sku
  where qi.quote_id = v_quote and qi.qty > 0;
  get diagnostics n = row_count;

  update delivery_records set stock_deducted = true where id = p_delivery_id;
  return n;
end; $$;
grant execute on function deduct_quote_stock(uuid, uuid, uuid, uuid) to authenticated;

-- 生產 BOM 扣料(原子)
create or replace function deduct_bom_stock(p_task_id uuid, p_actor uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t production_tasks; n int;
begin
  if not is_internal() then raise exception '禁止'; end if;
  select * into t from production_tasks where id = p_task_id;
  if t.product_sku is null then raise exception '此生產項目未指定料號'; end if;
  if t.warehouse_id is null then raise exception '此生產項目未指定領料倉'; end if;

  insert into stock_movements (sku, delta, warehouse_id, reason, ref_case_id, created_by)
  select b.component_sku, -round(b.qty_per * coalesce(t.qty, 1))::int, t.warehouse_id,
         '生產領料:' || coalesce(t.title, ''), t.case_id, p_actor
  from bom_items b
  where b.product_sku = t.product_sku and round(b.qty_per * coalesce(t.qty, 1))::int > 0;
  get diagnostics n = row_count;

  update production_tasks set material_deducted = true where id = p_task_id;
  return n;
end; $$;
grant execute on function deduct_bom_stock(uuid, uuid) to authenticated;
