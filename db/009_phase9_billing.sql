-- ============================================================
-- 第九階段-b:合約 / 請款 (contracts, invoices)
-- 在 001 ~ 008 之後執行。可重複執行。
-- 權限:財務資料,內部限定(讀寫皆 is_internal)。
-- ============================================================

create table if not exists contracts (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references cases(id) on delete cascade,
  amount      numeric not null default 0,
  signed_date date,
  status      text not null default 'draft' check (status in ('draft','signed')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_contracts_case on contracts(case_id);

create table if not exists invoices (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  title      text not null,                 -- 訂金 / 期中款 / 尾款…
  amount     numeric not null default 0,
  due_date   date,
  status     text not null default 'pending' check (status in ('pending','invoiced','paid')),
  paid_at    date,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_case on invoices(case_id, due_date);

drop trigger if exists trg_contracts_touch on contracts;
create trigger trg_contracts_touch before update on contracts for each row execute function touch_updated_at();
drop trigger if exists trg_invoices_touch on invoices;
create trigger trg_invoices_touch before update on invoices for each row execute function touch_updated_at();

-- RLS:內部限定
do $$
declare t text;
begin
  foreach t in array array['contracts','invoices'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_internal', t);
    execute format('create policy %I on %I for all using (is_internal()) with check (is_internal())', t || '_internal', t);
  end loop;
end $$;

do $$
begin
  alter publication supabase_realtime add table contracts, invoices;
exception when duplicate_object then null;
end $$;
