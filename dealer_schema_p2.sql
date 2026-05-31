-- =====================================================================
--  C 入庫代管 · 下單系統  —  第二期 Schema（模組 5 庫存代管 / 6 對帳中心）
--  先跑完 dealer_schema.sql（含 is_admin() / current_dealer_id()）再執行本檔。
--  可重複執行（idempotent）。
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  模組 5：庫存代管
-- ---------------------------------------------------------------------

-- 現有庫存（每位經銷商存放於倉庫的品項與數量）
create table if not exists public.inventory (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  sku        text not null,
  name       text not null,
  spec       text,
  warehouse  text not null default '樹林倉',
  qty        int  not null default 0,
  updated_at timestamptz not null default now(),
  unique(dealer_id, sku, warehouse)
);
create index if not exists idx_inventory_dealer on public.inventory(dealer_id);

-- 庫存異動紀錄（in 入庫 / out 出庫 / adjust 調整）
create table if not exists public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  sku        text,
  name       text,
  warehouse  text not null default '樹林倉',
  type       text not null,                 -- 'in' / 'out' / 'adjust'
  qty        int  not null,                 -- 一律正數，方向看 type
  note       text,
  ref        text,                          -- 關聯單號（出庫單 / 訂單）
  created_at timestamptz not null default now()
);
create index if not exists idx_invmove_dealer on public.inventory_movements(dealer_id);

-- 出庫申請
create table if not exists public.release_requests (
  id          uuid primary key default gen_random_uuid(),
  request_no  text not null unique,
  dealer_id   uuid not null references public.dealers(id) on delete cascade,
  status      text not null default 'pending',  -- pending / approved / rejected / cancelled
  recipient   text,
  phone       text,
  address     text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_release_dealer on public.release_requests(dealer_id);

create table if not exists public.release_request_items (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.release_requests(id) on delete cascade,
  sku        text,
  name       text,
  qty        int not null default 1
);
create index if not exists idx_release_items on public.release_request_items(request_id);

-- ---------------------------------------------------------------------
--  模組 6：對帳中心
-- ---------------------------------------------------------------------

create table if not exists public.statements (
  id           uuid primary key default gen_random_uuid(),
  statement_no text not null unique,
  dealer_id    uuid not null references public.dealers(id) on delete cascade,
  period       text not null,               -- 'YYYY-MM'
  period_start date,
  period_end   date,
  subtotal     numeric not null default 0,
  tax          numeric not null default 0,
  total        numeric not null default 0,
  paid         numeric not null default 0,
  outstanding  numeric not null default 0,
  status       text not null default 'open',-- open 未結 / partial 部分 / paid 已結清
  note         text,
  issued_at    timestamptz not null default now()
);
create index if not exists idx_stmt_dealer on public.statements(dealer_id);

create table if not exists public.statement_items (
  id           uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  ref          text,
  description  text,
  amount       numeric not null default 0,
  order_id     uuid
);
create index if not exists idx_stmt_items on public.statement_items(statement_id);

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  dealer_id    uuid not null references public.dealers(id) on delete cascade,
  amount       numeric not null,
  method       text,
  paid_at      date not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pay_dealer on public.payments(dealer_id);

-- =====================================================================
--  狀態中文輔助（出庫單 / 對帳單）
-- =====================================================================
create or replace function public.release_status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'pending'  then '待處理'
    when 'approved' then '已核准出庫'
    when 'rejected' then '已拒絕'
    when 'cancelled' then '已取消'
    else s end;
$$;

create or replace function public.statement_status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'open'    then '未結'
    when 'partial' then '部分付款'
    when 'paid'    then '已結清'
    else s end;
$$;

-- =====================================================================
--  原子操作 RPC（全部 security definer，內部自行檢查 is_admin）
-- =====================================================================

-- 入庫 / 調整庫存（管理員）：p_qty 正數=入庫、負數=扣減
create or replace function public.inventory_adjust(
  p_dealer uuid, p_sku text, p_name text, p_spec text, p_warehouse text, p_qty int, p_note text)
  returns void language plpgsql security definer set search_path = public as $$
declare wh text := coalesce(nullif(p_warehouse,''), '樹林倉');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  insert into public.inventory(dealer_id, sku, name, spec, warehouse, qty)
    values(p_dealer, p_sku, p_name, p_spec, wh, greatest(p_qty, 0))
  on conflict (dealer_id, sku, warehouse)
    do update set qty = greatest(public.inventory.qty + p_qty, 0), name = excluded.name,
                  spec = coalesce(excluded.spec, public.inventory.spec), updated_at = now();
  insert into public.inventory_movements(dealer_id, sku, name, warehouse, type, qty, note)
    values(p_dealer, p_sku, p_name, wh,
           case when p_qty >= 0 then 'in' else 'out' end, abs(p_qty),
           coalesce(p_note, case when p_qty >= 0 then '入庫' else '庫存調整' end));
end $$;

-- 核准出庫申請（管理員）：扣庫存、記異動、改狀態、通知
create or replace function public.release_request_approve(p_request uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare r public.release_requests; it record;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into r from public.release_requests where id = p_request;
  if r.id is null then raise exception 'request not found'; end if;
  if r.status <> 'pending' then raise exception 'request not pending'; end if;
  for it in select * from public.release_request_items where request_id = p_request loop
    update public.inventory set qty = greatest(qty - it.qty, 0), updated_at = now()
      where dealer_id = r.dealer_id and sku = it.sku;
    insert into public.inventory_movements(dealer_id, sku, name, warehouse, type, qty, note, ref)
      values(r.dealer_id, it.sku, it.name, '樹林倉', 'out', it.qty, '出庫申請核准', r.request_no);
  end loop;
  update public.release_requests set status = 'approved' where id = p_request;
  insert into public.notifications(dealer_id, title, body, link)
    values(r.dealer_id, '出庫申請已核准', '出庫單 ' || r.request_no || ' 已核准出庫', '/inventory');
end $$;

-- 依期間自動產生月結對帳單（管理員）：彙整該月未取消訂單
create or replace function public.statement_generate(
  p_dealer uuid, p_start date, p_end date, p_period text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; sub numeric; tx numeric; tot numeric; sno text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  -- 同期間若已存在則覆蓋（重新產生）
  delete from public.statements where dealer_id = p_dealer and period = p_period;
  select coalesce(sum(subtotal),0), coalesce(sum(tax),0), coalesce(sum(total),0)
    into sub, tx, tot
    from public.orders
    where dealer_id = p_dealer and status <> 'cancelled'
      and created_at >= p_start and created_at < (p_end + 1);
  sno := 'ST-' || replace(p_period,'-','') || '-' || substr(replace(p_dealer::text,'-',''),1,4);
  insert into public.statements(statement_no, dealer_id, period, period_start, period_end,
                                subtotal, tax, total, paid, outstanding, status)
    values(sno, p_dealer, p_period, p_start, p_end, sub, tx, tot, 0, tot,
           case when tot = 0 then 'paid' else 'open' end)
    returning id into sid;
  insert into public.statement_items(statement_id, ref, description, amount, order_id)
    select sid, order_no, '訂單 ' || order_no, total, id
    from public.orders
    where dealer_id = p_dealer and status <> 'cancelled'
      and created_at >= p_start and created_at < (p_end + 1);
  insert into public.notifications(dealer_id, title, body, link)
    values(p_dealer, '月結對帳單已開立',
           '對帳單 ' || sno || '（' || p_period || '）金額 NT$ ' || tot, '/billing');
  return sid;
end $$;

-- 登錄付款（管理員）：寫付款、更新對帳單結清狀態、通知
create or replace function public.payment_add(
  p_statement uuid, p_amount numeric, p_method text, p_paid_at date, p_note text)
  returns void language plpgsql security definer set search_path = public as $$
declare s public.statements; new_paid numeric;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into s from public.statements where id = p_statement;
  if s.id is null then raise exception 'statement not found'; end if;
  insert into public.payments(statement_id, dealer_id, amount, method, paid_at, note)
    values(p_statement, s.dealer_id, p_amount, p_method, coalesce(p_paid_at, current_date), p_note);
  new_paid := s.paid + p_amount;
  update public.statements
    set paid = new_paid, outstanding = greatest(s.total - new_paid, 0),
        status = case when new_paid >= s.total then 'paid' when new_paid > 0 then 'partial' else 'open' end
    where id = p_statement;
  insert into public.notifications(dealer_id, title, body, link)
    values(s.dealer_id, '收到付款',
           '對帳單 ' || s.statement_no || ' 已入帳 NT$ ' || p_amount, '/billing');
end $$;

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.inventory             enable row level security;
alter table public.inventory_movements   enable row level security;
alter table public.release_requests      enable row level security;
alter table public.release_request_items enable row level security;
alter table public.statements            enable row level security;
alter table public.statement_items       enable row level security;
alter table public.payments              enable row level security;

-- 庫存：本人讀自己、管理員可寫
drop policy if exists inv_select on public.inventory;
create policy inv_select on public.inventory for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists inv_admin on public.inventory;
create policy inv_admin on public.inventory for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 異動紀錄：本人讀自己（寫入由 RPC definer 處理）
drop policy if exists invm_select on public.inventory_movements;
create policy invm_select on public.inventory_movements for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());

-- 出庫申請：本人讀自己 + 自己建單 + 自己取消（限 pending→cancelled）；管理員可寫
drop policy if exists rr_select on public.release_requests;
create policy rr_select on public.release_requests for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists rr_insert on public.release_requests;
create policy rr_insert on public.release_requests for insert to authenticated
  with check (dealer_id = public.current_dealer_id());
drop policy if exists rr_cancel on public.release_requests;
create policy rr_cancel on public.release_requests for update to authenticated
  using (dealer_id = public.current_dealer_id() and status = 'pending')
  with check (dealer_id = public.current_dealer_id() and status = 'cancelled');
drop policy if exists rr_admin on public.release_requests;
create policy rr_admin on public.release_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 出庫申請品項：跟著申請單擁有權
drop policy if exists rri_select on public.release_request_items;
create policy rri_select on public.release_request_items for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.release_requests r where r.id = request_id and r.dealer_id = public.current_dealer_id()));
drop policy if exists rri_insert on public.release_request_items;
create policy rri_insert on public.release_request_items for insert to authenticated
  with check (exists (
    select 1 from public.release_requests r where r.id = request_id and r.dealer_id = public.current_dealer_id()));

-- 對帳單 / 明細 / 付款：本人讀自己（寫入由 RPC / 管理員）
drop policy if exists stmt_select on public.statements;
create policy stmt_select on public.statements for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists stmt_admin on public.statements;
create policy stmt_admin on public.statements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists stmti_select on public.statement_items;
create policy stmti_select on public.statement_items for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.statements s where s.id = statement_id and s.dealer_id = public.current_dealer_id()));
drop policy if exists stmti_admin on public.statement_items;
create policy stmti_admin on public.statement_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists pay_select on public.payments;
create policy pay_select on public.payments for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists pay_admin on public.payments;
create policy pay_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
