-- ============================================================
-- 000:原始「報價工具」基礎表
-- 若你的 Supabase 專案還沒有舊版報價工具的表
-- (products / projects / quote_items / scenes / export_history),
-- 請「先」執行本檔,再跑 001。全部 IF NOT EXISTS,已存在則略過,安全。
-- (出現 ERROR 42P01: relation "quote_items" does not exist 就是少了這步)
-- ============================================================

create table if not exists products (
  sku           text primary key,
  name          text,
  spaces        text[] default '{}',
  spec          text,
  material      text,
  price         numeric default 0,
  cost          numeric default 0,
  vendor        text,
  lead_time     text,
  volume        text,
  weight        text,
  assembly_fee  text,
  logistics_fee text,
  labor_hours   text
);

create table if not exists projects (
  id         text primary key,
  client     text,
  name       text,
  created_at timestamptz default now()
);

create table if not exists quote_items (
  id            text primary key,
  project_id    text,
  floor         text,
  space         text,
  sku           text,
  name          text,
  spec          text,
  material      text,
  price         numeric default 0,
  cost          numeric default 0,
  vendor        text,
  lead_time     text,
  volume        text,
  weight        text,
  assembly_fee  text,
  logistics_fee text,
  labor_hours   text,
  qty           integer default 1,
  remark        text,
  sort_order    integer default 0
);

create table if not exists scenes (
  id         text primary key,
  name       text,
  space_type text,
  items      jsonb default '[]'::jsonb
);

create table if not exists export_history (
  id           text primary key,
  project_id   text,
  client       text,
  project_name text,
  type         text,
  exported_at  timestamptz default now(),
  total_sales  numeric default 0,
  total_cost   numeric default 0,
  items        jsonb default '[]'::jsonb
);

-- 即時同步(原應用使用的表)
do $$
begin
  alter publication supabase_realtime add table products, scenes, quote_items, projects;
exception when duplicate_object then null;
end $$;
