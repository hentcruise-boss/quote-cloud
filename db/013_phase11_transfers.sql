-- ============================================================
-- 第十一階段-a:倉間調撥單 (transfers, transfer_items)
-- 在 011 之後執行。可重複執行。
-- 調撥以 execute_transfer() 原子完成:寫單 + 調出(-)/調入(+)兩筆異動。
-- ============================================================

create table if not exists transfers (
  id                uuid primary key default gen_random_uuid(),
  from_warehouse_id uuid references warehouses(id) on delete set null,
  to_warehouse_id   uuid references warehouses(id) on delete set null,
  status            text not null default 'done' check (status in ('draft','done')),
  note              text,
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create table if not exists transfer_items (
  id          uuid primary key default gen_random_uuid(),
  transfer_id uuid references transfers(id) on delete cascade,
  sku         text references products(sku) on delete cascade,
  qty         int not null
);
create index if not exists idx_transfer_items on transfer_items(transfer_id);

-- 內部限定
do $$
declare t text;
begin
  foreach t in array array['transfers','transfer_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_internal', t);
  end loop;
end $$;

-- 原子調撥
create or replace function execute_transfer(p_from uuid, p_to uuid, p_items jsonb, p_note text, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid; it jsonb;
begin
  if not is_internal() then raise exception '禁止'; end if;
  if p_from = p_to or p_from is null or p_to is null then raise exception '請選擇不同的來源與目的倉'; end if;

  insert into transfers (from_warehouse_id, to_warehouse_id, status, note, created_by)
    values (p_from, p_to, 'done', p_note, p_actor) returning id into tid;

  for it in select * from jsonb_array_elements(p_items) loop
    if (it->>'qty')::int <> 0 then
      insert into transfer_items (transfer_id, sku, qty) values (tid, it->>'sku', (it->>'qty')::int);
      insert into stock_movements (sku, delta, warehouse_id, reason, created_by)
        values (it->>'sku', -abs((it->>'qty')::int), p_from, '調撥出', p_actor);
      insert into stock_movements (sku, delta, warehouse_id, reason, created_by)
        values (it->>'sku',  abs((it->>'qty')::int), p_to,   '調撥入', p_actor);
    end if;
  end loop;
  return tid;
end; $$;

grant execute on function execute_transfer(uuid, uuid, jsonb, text, uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table transfers;
exception when duplicate_object then null;
end $$;
