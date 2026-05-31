-- ============================================================
-- 第三階段:各階段深化 — 生產排程 / QC 檢查 / 交貨簽收
-- 在 001 ~ 004 之後執行。可重複執行 (idempotent)。
-- 權限:案件參與者可讀 (含客戶,增加透明度);僅內部可寫。
-- ============================================================

-- 生產排程
create table if not exists production_tasks (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references cases(id) on delete cascade,
  title       text not null,
  status      text not null default 'pending' check (status in ('pending','in_progress','done','blocked')),
  progress    int  not null default 0 check (progress between 0 and 100),
  supplier_id uuid references profiles(id) on delete set null,
  planned_start date,
  planned_end   date,
  actual_end    date,
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_prod_case on production_tasks(case_id, sort_order);

-- QC 檢查項
create table if not exists qc_checks (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  label      text not null,
  result     text not null default 'pending' check (result in ('pending','pass','fail','na')),
  note       text,
  checked_by uuid references profiles(id) on delete set null,
  checked_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_qc_case on qc_checks(case_id, sort_order);

-- 交貨簽收
create table if not exists delivery_records (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid references cases(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','delivered','signed')),
  delivered_at   date,
  recipient_name text,
  note           text,
  signoff_path   text,                 -- Storage 路徑:簽收單/照片
  signed_by      uuid references profiles(id) on delete set null,
  signed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_delivery_case on delivery_records(case_id, created_at);

-- updated_at triggers (touch_updated_at 來自 001)
drop trigger if exists trg_prod_touch on production_tasks;
create trigger trg_prod_touch before update on production_tasks for each row execute function touch_updated_at();
drop trigger if exists trg_delivery_touch on delivery_records;
create trigger trg_delivery_touch before update on delivery_records for each row execute function touch_updated_at();

-- RLS:參與者可讀;僅內部可寫
do $$
declare t text;
begin
  foreach t in array array['production_tasks','qc_checks','delivery_records'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format('create policy %I on %I for select using (can_see_case(case_id))', t || '_select', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_write', t);
  end loop;
end $$;

-- 即時同步
do $$
begin
  alter publication supabase_realtime add table production_tasks, qc_checks, delivery_records;
exception when duplicate_object then null;
end $$;
