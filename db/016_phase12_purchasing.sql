-- ============================================================
-- 第十二階段-c:採購單(補庫存)
-- 在 011 之後執行。可重複執行。
-- 收貨以 receive_po() 原子寫入正向異動(入庫),並標記已收貨。
-- ============================================================

create table if not exists purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  supplier     text,
  warehouse_id uuid references warehouses(id) on delete set null,
  status       text not null default 'ordered' check (status in ('draft','ordered','received')),
  note         text,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  received_at  timestamptz
);
create table if not exists purchase_order_items (
  id        uuid primary key default gen_random_uuid(),
  po_id     uuid references purchase_orders(id) on delete cascade,
  sku       text references products(sku) on delete cascade,
  qty       int not null,
  unit_cost numeric
);
create index if not exists idx_poi on purchase_order_items(po_id);

do $$
declare t text;
begin
  foreach t in array array['purchase_orders','purchase_order_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_internal', t);
  end loop;
end $$;

-- 收貨入庫(原子)
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

  update purchase_orders set status = 'received', received_at = now() where id = p_po_id;
  return n;
end; $$;
grant execute on function receive_po(uuid, uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table purchase_orders;
exception when duplicate_object then null;
end $$;
