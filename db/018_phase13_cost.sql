-- ============================================================
-- 第十三階段-a:採購帶單價 → 更新成本 + 成本異動紀錄
-- 在 016 之後執行。可重複執行。
-- 收貨時:以採購單價更新對應產品成本,並寫一筆 cost_history。
-- ============================================================

create table if not exists cost_history (
  id         uuid primary key default gen_random_uuid(),
  sku        text references products(sku) on delete cascade,
  cost       numeric not null,
  note       text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cost_history_sku on cost_history(sku, created_at);

alter table cost_history enable row level security;
drop policy if exists cost_history_internal on cost_history;
create policy cost_history_internal on cost_history for all using (is_internal()) with check (is_internal());

-- 收貨入庫(含:更新產品成本 + 記錄成本異動)
create or replace function receive_po(p_po_id uuid, p_actor uuid)
returns int language plpgsql security definer set search_path = public as $$
declare po purchase_orders; n int;
begin
  if not is_internal() then raise exception '禁止'; end if;
  select * into po from purchase_orders where id = p_po_id;
  if po.id is null then raise exception '找不到採購單'; end if;
  if po.warehouse_id is null then raise exception '請指定入庫倉'; end if;
  if po.status = 'received' then raise exception '此採購單已收貨'; end if;

  insert into stock_movements (sku, delta, warehouse_id, reason, created_by)
  select i.sku, abs(i.qty), po.warehouse_id, '採購入庫', p_actor
  from purchase_order_items i
  where i.po_id = p_po_id and i.qty > 0;
  get diagnostics n = row_count;

  -- 以採購單價更新產品成本 + 記錄成本異動
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
