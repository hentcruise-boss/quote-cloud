-- =====================================================================
--  C 入庫代管 · 網頁下單系統  —  資料庫 Schema
--  在 Supabase SQL Editor 執行（一次性）。可重複執行（idempotent）。
--  與現有「祥鼎報價系統」的資料表（products / scenes / quote_items …）
--  互不影響，本檔只新增 dealer_* 等下單系統用的資料表。
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. 定價等級 pricing_tiers（A / B / C …）
--    price_rate = 牌價乘數，例如 0.75 代表此級看到的價格為牌價 75 折
-- ---------------------------------------------------------------------
create table if not exists public.pricing_tiers (
  id          text primary key,            -- 'A' / 'B' / 'C'
  name        text not null,
  price_rate  numeric not null default 1.0,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. 管理員 admins（後台）
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  name          text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. 經銷商 dealers（每個帳號綁一位 Supabase Auth 使用者）
-- ---------------------------------------------------------------------
create table if not exists public.dealers (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  company         text not null,
  contact_name    text,
  phone           text,
  email           text,
  pricing_tier_id text references public.pricing_tiers(id),
  rep_name        text,                     -- 對應專員姓名（聯絡專員用）
  rep_phone       text,                     -- 專員電話 / LINE
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_dealers_auth on public.dealers(auth_user_id);

-- ---------------------------------------------------------------------
-- 4. 對外品項 dealer_products（與內部 products 分開）
--    base_price / qty_tiers / 選配價皆為「未稅」金額
-- ---------------------------------------------------------------------
create table if not exists public.dealer_products (
  sku         text primary key,
  name        text not null,
  series      text,                         -- 系列
  category    text,                         -- 類型
  description text,
  spec        text,                         -- 規格 / 尺寸
  material    text,
  base_price  numeric not null default 0,   -- 牌價（未稅）
  image_url   text,
  qty_tiers   jsonb not null default '[]',  -- [{"min_qty":10,"rate":0.97}] 數量階梯
  is_active   boolean not null default true,-- 上架 / 下架
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. 產品選配 product_options（顏色 / 尺寸 / 配件 + 加價）
-- ---------------------------------------------------------------------
create table if not exists public.product_options (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null references public.dealer_products(sku) on delete cascade,
  group_name  text not null,                -- '顏色' / '尺寸' / '配件'
  label       text not null,
  price_delta numeric not null default 0,   -- 加價（未稅，可為負）
  is_default  boolean not null default false,
  sort_order  int not null default 0
);
create index if not exists idx_options_sku on public.product_options(sku);

-- ---------------------------------------------------------------------
-- 6. 經銷商專屬覆寫價 dealer_price_overrides（可選，優先於等級計價）
-- ---------------------------------------------------------------------
create table if not exists public.dealer_price_overrides (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  sku        text not null references public.dealer_products(sku) on delete cascade,
  price      numeric not null,              -- 固定單價（未稅）
  unique(dealer_id, sku)
);

-- ---------------------------------------------------------------------
-- 7. 常用清單 / 收藏 favorites
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  sku        text not null references public.dealer_products(sku) on delete cascade,
  created_at timestamptz not null default now(),
  unique(dealer_id, sku)
);

-- ---------------------------------------------------------------------
-- 8. 訂單 orders
--    status: placed / production / shipping / arrived / stored / delivered / cancelled
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_no     text not null unique,
  dealer_id    uuid not null references public.dealers(id) on delete cascade,
  status       text not null default 'placed',
  subtotal     numeric not null default 0,  -- 未稅小計
  tax          numeric not null default 0,  -- 稅額（5%）
  total        numeric not null default 0,  -- 含稅總計
  recipient    text,                        -- 收貨人 / 出庫對象
  phone        text,
  address      text,
  note         text,
  eta          date,                        -- 預計到貨日
  created_at   timestamptz not null default now()
);
create index if not exists idx_orders_dealer on public.orders(dealer_id);

-- ---------------------------------------------------------------------
-- 9. 訂單品項 order_items（下單當下的快照）
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  sku        text,
  name       text,
  spec       text,
  options    jsonb not null default '[]',   -- [{"group":..,"label":..,"price_delta":..}]
  unit_price numeric not null default 0,    -- 未稅單價（含選配）
  qty        int not null default 1,
  subtotal   numeric not null default 0
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ---------------------------------------------------------------------
-- 10. 訂單狀態時間軸 order_status_events（由觸發器自動寫入）
-- ---------------------------------------------------------------------
create table if not exists public.order_status_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  status     text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists idx_status_events_order on public.order_status_events(order_id);

-- ---------------------------------------------------------------------
-- 11. 站內通知 notifications（由觸發器自動寫入）
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_dealer on public.notifications(dealer_id);

-- =====================================================================
--  輔助函式
-- =====================================================================
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.admins where auth_user_id = auth.uid());
$$;

create or replace function public.current_dealer_id() returns uuid
  language sql security definer stable set search_path = public as $$
  select id from public.dealers where auth_user_id = auth.uid();
$$;

create or replace function public.status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'placed'     then '已成立'
    when 'production' then '生產'
    when 'shipping'   then '海運'
    when 'arrived'    then '到台'
    when 'stored'     then '入庫'
    when 'delivered'  then '出庫'
    when 'cancelled'  then '已取消'
    else s end;
$$;

-- =====================================================================
--  觸發器：訂單成立 / 狀態變更 → 自動寫時間軸 + 通知
-- =====================================================================
create or replace function public.on_order_created() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_status_events(order_id, status, note)
    values (new.id, new.status, '訂單成立');
  insert into public.notifications(dealer_id, title, body, link)
    values (new.dealer_id, '下單成功',
            '訂單 ' || new.order_no || ' 已送出，總計 NT$ ' || new.total,
            '/orders/' || new.id);
  return new;
end $$;

drop trigger if exists trg_order_created on public.orders;
create trigger trg_order_created after insert on public.orders
  for each row execute function public.on_order_created();

create or replace function public.on_order_status_changed() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_events(order_id, status)
      values (new.id, new.status);
    insert into public.notifications(dealer_id, title, body, link)
      values (new.dealer_id, '訂單狀態更新',
              '訂單 ' || new.order_no || ' 進度更新為「' || public.status_label(new.status) || '」',
              '/orders/' || new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_order_status on public.orders;
create trigger trg_order_status after update on public.orders
  for each row execute function public.on_order_status_changed();

-- 新建 Auth 使用者時，自動綁定到 email 相符且尚未綁定的經銷商列
-- → 後台只要先建好經銷商資料（含 email），再到 Auth 建同 email 帳號即可登入
create or replace function public.link_auth_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update public.dealers set auth_user_id = new.id
    where auth_user_id is null and lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists trg_link_auth on auth.users;
create trigger trg_link_auth after insert on auth.users
  for each row execute function public.link_auth_user();

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.pricing_tiers          enable row level security;
alter table public.admins                 enable row level security;
alter table public.dealers                enable row level security;
alter table public.dealer_products        enable row level security;
alter table public.product_options        enable row level security;
alter table public.dealer_price_overrides enable row level security;
alter table public.favorites              enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_events    enable row level security;
alter table public.notifications          enable row level security;

-- pricing_tiers：經銷商只看得到「自己等級」那一列；管理員全可
drop policy if exists pt_select on public.pricing_tiers;
create policy pt_select on public.pricing_tiers for select to authenticated
  using (public.is_admin() or id = (select pricing_tier_id from public.dealers where auth_user_id = auth.uid()));
drop policy if exists pt_admin on public.pricing_tiers;
create policy pt_admin on public.pricing_tiers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- admins：僅管理員
drop policy if exists ad_all on public.admins;
create policy ad_all on public.admins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- dealers：本人讀自己、管理員全可
drop policy if exists dl_select on public.dealers;
create policy dl_select on public.dealers for select to authenticated
  using (public.is_admin() or auth_user_id = auth.uid());
drop policy if exists dl_admin on public.dealers;
create policy dl_admin on public.dealers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- dealer_products：上架品項所有登入者可讀；管理員可寫
drop policy if exists dp_select on public.dealer_products;
create policy dp_select on public.dealer_products for select to authenticated
  using (public.is_admin() or is_active);
drop policy if exists dp_admin on public.dealer_products;
create policy dp_admin on public.dealer_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- product_options：登入者可讀；管理員可寫
drop policy if exists po_select on public.product_options;
create policy po_select on public.product_options for select to authenticated using (true);
drop policy if exists po_admin on public.product_options;
create policy po_admin on public.product_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- dealer_price_overrides：本人讀自己、管理員可寫
drop policy if exists dpo_select on public.dealer_price_overrides;
create policy dpo_select on public.dealer_price_overrides for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists dpo_admin on public.dealer_price_overrides;
create policy dpo_admin on public.dealer_price_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- favorites：本人自管
drop policy if exists fav_all on public.favorites;
create policy fav_all on public.favorites for all to authenticated
  using (dealer_id = public.current_dealer_id() or public.is_admin())
  with check (dealer_id = public.current_dealer_id() or public.is_admin());

-- orders：本人讀自己 + 自己建單；狀態更新由管理員
drop policy if exists ord_select on public.orders;
create policy ord_select on public.orders for select to authenticated
  using (public.is_admin() or dealer_id = public.current_dealer_id());
drop policy if exists ord_insert on public.orders;
create policy ord_insert on public.orders for insert to authenticated
  with check (dealer_id = public.current_dealer_id());
drop policy if exists ord_admin on public.orders;
create policy ord_admin on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists ord_delete on public.orders;
create policy ord_delete on public.orders for delete to authenticated
  using (public.is_admin());

-- order_items：跟著訂單的擁有權
drop policy if exists oi_select on public.order_items;
create policy oi_select on public.order_items for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.dealer_id = public.current_dealer_id()));
drop policy if exists oi_insert on public.order_items;
create policy oi_insert on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o where o.id = order_id and o.dealer_id = public.current_dealer_id()));

-- order_status_events：本人讀自己訂單；寫入由觸發器（definer）處理
drop policy if exists ose_select on public.order_status_events;
create policy ose_select on public.order_status_events for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.dealer_id = public.current_dealer_id()));

-- notifications：本人讀 / 標記已讀；寫入由觸發器（definer）處理
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (dealer_id = public.current_dealer_id() or public.is_admin());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (dealer_id = public.current_dealer_id())
  with check (dealer_id = public.current_dealer_id());
