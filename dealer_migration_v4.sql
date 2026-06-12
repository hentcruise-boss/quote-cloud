-- =====================================================================
--  Migration v4：核心會員定制詢價 + 供應商 + 自動補倉
--  跑完 v3 後執行，可重複跑。
-- =====================================================================

-- =====================================================================
--  A. 定制詢價（custom_requests）—— 核心會員專用
-- =====================================================================
create table if not exists public.custom_requests (
  id            uuid primary key default gen_random_uuid(),
  request_no    text not null unique,
  dealer_id     uuid not null references public.dealers(id) on delete cascade,
  title         text not null,
  description   text,
  qty           int not null default 1,
  budget        numeric,                    -- 預算（未稅，可空）
  is_rush       boolean not null default false,
  desired_date  date,                       -- 期望交貨日
  status        text not null default 'submitted',
  -- submitted 待回覆 / quoted 已報價 / confirmed 客戶確認 / rejected 已拒絕 / closed 已結案
  quoted_price  numeric,
  quoted_lead   text,                       -- 例如 '生產 30 天 + 海運 35 天'
  admin_note    text,
  created_at    timestamptz not null default now(),
  quoted_at     timestamptz,
  decided_at    timestamptz
);
create index if not exists idx_cust_dealer on public.custom_requests(dealer_id);

create or replace function public.custom_status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'submitted' then '待回覆'
    when 'quoted'    then '已報價'
    when 'confirmed' then '客戶已確認'
    when 'rejected'  then '客戶拒絕'
    when 'closed'    then '已結案'
    else s end;
$$;

-- 新詢價成立 / 已報價 → 自動通知
create or replace function public.on_custom_request_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(dealer_id, title, body, link)
      values(new.dealer_id, '定制詢價已送出',
             '詢價單 ' || new.request_no || '：' || new.title || ' — 將由專員儘速回覆',
             '/custom');
    return new;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.notifications(dealer_id, title, body, link)
      values(new.dealer_id, '定制詢價狀態更新',
             '詢價單 ' || new.request_no || '：' || public.custom_status_label(new.status),
             '/custom');
  end if;
  return new;
end $$;

drop trigger if exists trg_custom_change on public.custom_requests;
create trigger trg_custom_change after insert or update on public.custom_requests
  for each row execute function public.on_custom_request_change();

-- RLS
alter table public.custom_requests enable row level security;

drop policy if exists cust_select on public.custom_requests;
create policy cust_select on public.custom_requests for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());

drop policy if exists cust_insert on public.custom_requests;
create policy cust_insert on public.custom_requests for insert to authenticated
  with check (dealer_id = public.current_dealer_id());

-- 經銷商可 confirm / reject 自己的（限 status=quoted）；其他更新由 admin
drop policy if exists cust_dealer_decide on public.custom_requests;
create policy cust_dealer_decide on public.custom_requests for update to authenticated
  using (dealer_id = public.current_dealer_id() and status = 'quoted')
  with check (dealer_id = public.current_dealer_id() and status in ('confirmed','rejected'));

drop policy if exists cust_admin on public.custom_requests;
create policy cust_admin on public.custom_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  B. 供應商 + 補倉系統
-- =====================================================================
create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  phone        text,
  email        text,
  note         text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 產品連到主要供應商；補貨門檻與單次補貨量
alter table public.dealer_products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.dealer_products
  add column if not exists reorder_point int not null default 5;
alter table public.dealer_products
  add column if not exists reorder_qty   int not null default 10;

-- 補倉單（一筆 = 一張發給某供應商）
create table if not exists public.replenishment_orders (
  id               uuid primary key default gen_random_uuid(),
  replenishment_no text not null unique,
  supplier_id      uuid references public.suppliers(id) on delete set null,
  status           text not null default 'pending',
  -- pending 已建立 / sent 已發送 / received 已收貨 / cancelled 已取消
  generated_at     timestamptz not null default now(),
  sent_at          timestamptz,
  received_at      timestamptz,
  note             text
);
create index if not exists idx_repl_supplier on public.replenishment_orders(supplier_id);

create table if not exists public.replenishment_items (
  id               uuid primary key default gen_random_uuid(),
  replenishment_id uuid not null references public.replenishment_orders(id) on delete cascade,
  sku              text not null,
  name             text,
  qty              int not null default 1
);
create index if not exists idx_repl_items on public.replenishment_items(replenishment_id);

create or replace function public.replenishment_status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'pending'   then '待發送'
    when 'sent'      then '已發送'
    when 'received'  then '已入庫'
    when 'cancelled' then '已取消'
    else s end;
$$;

-- ----- 核心 RPC：依低庫存自動產生補倉單 ----------------------------------
-- 每跑一次：掃描所有 is_active 且有 supplier_id 且 stock_qty < reorder_point 的產品，
-- 依供應商分組，各建立一張 pending 的補倉單。
-- 回傳這次新建幾張單；可由 admin 點按鈕呼叫，或設成 pg_cron 排程。
create or replace function public.generate_replenishments() returns int
  language plpgsql security definer set search_path = public as $$
declare
  sup_rec  record;
  prod_rec record;
  rep_id   uuid;
  rep_no   text;
  cnt      int := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  for sup_rec in
    select distinct dp.supplier_id
    from public.dealer_products dp
    where dp.is_active = true
      and dp.supplier_id is not null
      and dp.stock_qty < dp.reorder_point
  loop
    rep_no := 'RP-' || to_char(now(), 'YYYYMMDD') || '-' ||
              substr(replace(sup_rec.supplier_id::text, '-', ''), 1, 4);

    insert into public.replenishment_orders(replenishment_no, supplier_id, status)
      values (rep_no, sup_rec.supplier_id, 'pending')
      returning id into rep_id;

    for prod_rec in
      select sku, name, reorder_qty
      from public.dealer_products
      where supplier_id = sup_rec.supplier_id
        and is_active = true
        and stock_qty < reorder_point
    loop
      insert into public.replenishment_items(replenishment_id, sku, name, qty)
        values (rep_id, prod_rec.sku, prod_rec.name, prod_rec.reorder_qty);
    end loop;

    cnt := cnt + 1;
  end loop;

  return cnt;
end $$;

-- 把補倉單標為已收貨：對應品項 stock_qty 加上來、寫 inventory_movements 之類
create or replace function public.replenishment_receive(p_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  for it in
    select * from public.replenishment_items where replenishment_id = p_id
  loop
    update public.dealer_products
      set stock_qty = stock_qty + it.qty
      where sku = it.sku;
  end loop;

  update public.replenishment_orders
    set status = 'received', received_at = now()
    where id = p_id;
end $$;

-- RLS：suppliers / replenishment_* 全部僅 admin
alter table public.suppliers              enable row level security;
alter table public.replenishment_orders   enable row level security;
alter table public.replenishment_items    enable row level security;

drop policy if exists sup_admin on public.suppliers;
create policy sup_admin on public.suppliers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists rep_admin on public.replenishment_orders;
create policy rep_admin on public.replenishment_orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists rep_items_admin on public.replenishment_items;
create policy rep_items_admin on public.replenishment_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
--  Demo：建一個範例供應商，把 demo 產品都掛上去
-- =====================================================================
do $$
declare sid uuid;
begin
  select id into sid from public.suppliers where name = '木美家自有工廠（示範）';
  if sid is null then
    insert into public.suppliers(name, contact_name, phone, email, note)
      values('木美家自有工廠（示範）','林廠長','0900-000-000','factory@mm-demo.com','示範資料，請改為實際供應商')
      returning id into sid;
  end if;
  update public.dealer_products set supplier_id = sid where supplier_id is null;
end $$;

-- =====================================================================
--  （選用）pg_cron 每週自動補倉
--  Supabase 需先在 Dashboard → Database → Extensions 啟用 pg_cron 與 pg_net。
--  之後可在 SQL Editor 跑下面這段（一次性）即可：
-- ---------------------------------------------------------------------
--  select cron.schedule(
--    'weekly-replenishment',
--    '0 9 * * 1',                    -- 每週一早上 09:00 UTC
--    $$ select public.generate_replenishments(); $$
--  );
-- ---------------------------------------------------------------------
--  解除：select cron.unschedule('weekly-replenishment');
-- =====================================================================
