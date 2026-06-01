-- ============================================================
-- 第十三階段-b:庫存批號 / 序號
-- 在 016/018 之後執行。可重複執行。
-- 異動與採購項加 batch_no;收貨時帶入批號(同時保留 018 的成本更新)。
-- ============================================================

alter table stock_movements      add column if not exists batch_no text;
alter table purchase_order_items add column if not exists batch_no text;

-- 收貨入庫(批號 + 成本更新)
create or replace function receive_po(p_po_id uuid, p_actor uuid)
returns int language plpgsql security definer set search_path = public as $$
declare po purchase_orders; n int;
begin
  if not is_internal() then raise exception '禁止'; end if;
  select * into po from purchase_orders where id = p_po_id;
  if po.id is null then raise exception '找不到採購單'; end if;
  if po.warehouse_id is null then raise exception '請指定入庫倉'; end if;
  if po.status = 'received' then raise exception '此採購單已收貨'; end if;

  insert into stock_movements (sku, delta, warehouse_id, reason, batch_no, created_by)
  select i.sku, abs(i.qty), po.warehouse_id, '採購入庫', i.batch_no, p_actor
  from purchase_order_items i
  where i.po_id = p_po_id and i.qty > 0;
  get diagnostics n = row_count;

  update products pr set cost = i.unit_cost
  from purchase_order_items i
  where i.po_id = p_po_id and i.sku = pr.sku and i.unit_cost is not null and i.unit_cost > 0;

  insert into cost_history (sku, cost, note, created_by)
  select i.sku, i.unit_cost, '採購收貨', p_actor
  from purchase_order_items i
  where i.po_id = p_po_id and i.unit_cost is not null and i.unit_cost > 0;

  update purchase_orders set status = 'received', received_at = now() where id = p_po_id;
  return n;
end; $$;
grant execute on function receive_po(uuid, uuid) to authenticated;
