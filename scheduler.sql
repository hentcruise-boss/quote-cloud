-- 派工排期資料表（請將本檔全文貼到 Supabase Dashboard → SQL Editor 執行一次；可重複執行、冪等）
-- 建立三張表：orders（成交訂單）、schedule_events（排程事件）、app_settings（排期參數）

create table if not exists orders (
  id text primary key,
  project_id text,                          -- 來源報價專案（無 FK；null＝手動建立）
  client text default '',
  name text default '',
  amount numeric default 0,                 -- 金額 NT$
  volume numeric default 0,                 -- 方數 m³
  doc_confirmation boolean default false,   -- 確認書
  doc_layout boolean default false,         -- 定位圖
  doc_quotation boolean default false,      -- 報價單
  doc_contract boolean default false,       -- 合同
  install_date date,                        -- 預計交裝日（可空）
  status text default '待排期',             -- 待排期 / 排期中 / 已完成
  remark text default '',                   -- 備註（可貼雲端資料連結）
  created_at timestamptz default now()
);

create table if not exists schedule_events (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  type text not null check (type in ('logistics','assembly','container')),
  date date not null,                       -- 單日事件 YYYY-MM-DD
  workers integer,                          -- 組裝：人數
  vehicles integer,                         -- 物流：車次
  volume numeric,                           -- 物流/貨櫃：方數
  note text default '',                     -- 備註；貨櫃用作櫃號/說明
  created_at timestamptz default now()
);
create index if not exists idx_sched_events_date  on schedule_events(date);
create index if not exists idx_sched_events_order on schedule_events(order_id);

create table if not exists app_settings (
  id text primary key,                             -- 單例列 'default'
  daily_output_per_worker numeric default 100000,  -- 每人日產值 NT$（金額÷產值＝需求人天）
  volume_per_vehicle numeric default 10,           -- 每車方數 m³（方數÷每車方數＝需求車次）
  updated_at timestamptz default now()
);
insert into app_settings (id) values ('default') on conflict (id) do nothing;

-- 與既有資料表一致：不啟用 RLS（本系統無登入，全體共用）
alter table orders          disable row level security;
alter table schedule_events disable row level security;
alter table app_settings    disable row level security;

-- 加入 realtime 發佈（已加入時靜默跳過）
do $$ begin alter publication supabase_realtime add table orders;          exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table schedule_events; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table app_settings;    exception when duplicate_object then null; end $$;
