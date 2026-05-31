-- ============================================================
-- 第九階段-c:庫存 (inventory, stock_movements)
-- 在 001 ~ 009 之後執行。可重複執行。
-- 權限:內部限定。出入庫以 stock_movements 紀錄,trigger 自動結算在庫量。
-- ============================================================

create table if not exists inventory (
  sku           text primary key references products(sku) on delete cascade,
  on_hand       int not null default 0,
  reorder_point int not null default 0,
  updated_at    timestamptz not null default now()
);

create table if not exists stock_movements (
  id          uuid primary key default gen_random_uuid(),
  sku         text references products(sku) on delete cascade,
  delta       int not null,            -- 入庫為正、出庫為負
  reason      text,
  ref_case_id uuid references cases(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_movements_sku on stock_movements(sku, created_at);

-- 異動 → 結算在庫量
create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into inventory (sku, on_hand, updated_at)
  values (new.sku, new.delta, now())
  on conflict (sku) do update set on_hand = inventory.on_hand + new.delta, updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_apply_stock on stock_movements;
create trigger trg_apply_stock after insert on stock_movements for each row execute function apply_stock_movement();

-- RLS:內部限定
do $$
declare t text;
begin
  foreach t in array array['inventory','stock_movements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_internal', t);
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table inventory, stock_movements;
exception when duplicate_object then null;
end $$;
