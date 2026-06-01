-- ============================================================
-- 第十階段-c:多公司 / 多倉
-- 在 001 ~ 010 之後執行。可重複執行。
-- 把庫存從「每 SKU 一筆」改為「每 SKU × 倉庫 一筆」。
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists companies (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists warehouses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company_id uuid references companies(id) on delete set null,
  is_default boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- seed 公司
insert into companies (name) select '祥鼎辦公家具' where not exists (select 1 from companies where name = '祥鼎辦公家具');
insert into companies (name) select '木美家'       where not exists (select 1 from companies where name = '木美家');

-- seed 倉庫(清遠倉公司未指定,可於介面設定)
insert into warehouses (name, company_id, is_default)
  select '祥鼎倉', (select id from companies where name = '祥鼎辦公家具' limit 1), true
  where not exists (select 1 from warehouses where name = '祥鼎倉');
insert into warehouses (name, company_id)
  select '木美家一倉', (select id from companies where name = '木美家' limit 1)
  where not exists (select 1 from warehouses where name = '木美家一倉');
insert into warehouses (name, company_id)
  select '木美家二倉', (select id from companies where name = '木美家' limit 1)
  where not exists (select 1 from warehouses where name = '木美家二倉');
insert into warehouses (name)
  select '清遠倉' where not exists (select 1 from warehouses where name = '清遠倉');

-- ── inventory 改為分倉(sku, warehouse_id)複合主鍵 ─────────
alter table inventory add column if not exists warehouse_id uuid references warehouses(id) on delete cascade;
update inventory set warehouse_id = (select id from warehouses where is_default limit 1) where warehouse_id is null;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'inventory_pkey') then
    alter table inventory drop constraint inventory_pkey;
  end if;
end $$;
alter table inventory alter column warehouse_id set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_pkey') then
    alter table inventory add constraint inventory_pkey primary key (sku, warehouse_id);
  end if;
end $$;

-- ── stock_movements 加 warehouse_id ───────────────────────
alter table stock_movements add column if not exists warehouse_id uuid references warehouses(id) on delete set null;
update stock_movements set warehouse_id = (select id from warehouses where is_default limit 1) where warehouse_id is null;

-- 異動結算改為分倉
create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into inventory (sku, warehouse_id, on_hand, updated_at)
  values (new.sku, new.warehouse_id, new.delta, now())
  on conflict (sku, warehouse_id) do update set on_hand = inventory.on_hand + new.delta, updated_at = now();
  return new;
end; $$;

-- ── delivery_records:出貨倉 + 是否已扣庫存(供 10a 自動扣庫存)──
alter table delivery_records add column if not exists warehouse_id uuid references warehouses(id) on delete set null;
alter table delivery_records add column if not exists stock_deducted boolean not null default false;

-- RLS:公司/倉庫 內部讀寫
do $$
declare t text;
begin
  foreach t in array array['companies','warehouses'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_internal', t);
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table companies, warehouses;
exception when duplicate_object then null;
end $$;
