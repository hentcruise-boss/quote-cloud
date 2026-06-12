-- =====================================================================
--  Migration v2：下單方式 + 配送服務 + 會員類型 + 期貨價 / 現貨庫存
--  跑完 dealer_schema.sql 之後執行，可重複跑。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 會員類型（distribution 經銷 / core 核心）
-- ---------------------------------------------------------------------
alter table public.dealers
  add column if not exists member_type text not null default 'distribution';

alter table public.dealers
  drop constraint if exists dealers_member_type_chk;
alter table public.dealers
  add constraint dealers_member_type_chk check (member_type in ('distribution','core'));

-- ---------------------------------------------------------------------
-- 2. 產品：現貨庫存量 + 期貨價（牌價）
--    stock_qty   現貨倉庫存（>0 才能用現金/鎖單下單）
--    futures_price 期貨牌價（非 NULL 才能用期貨 30% 鎖單）
-- ---------------------------------------------------------------------
alter table public.dealer_products
  add column if not exists stock_qty int not null default 0;

alter table public.dealer_products
  add column if not exists futures_price numeric;

-- ---------------------------------------------------------------------
-- 3. 訂單：下單方式 / 配送服務 / 組配費 / 定金 / 尾款
--    order_mode      cash 現金 / lock10 10%鎖單 / futures30 期貨30%鎖單
--    delivery_service self 自運 / assembly 預約組配
--    assembly_fee    組配費（自動算：訂單未稅 < 60000 時 = 3000，否則 0）
--    deposit_amount  定金（含稅）
--    balance_amount  尾款（含稅）
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists order_mode text not null default 'cash';
alter table public.orders
  drop constraint if exists orders_order_mode_chk;
alter table public.orders
  add constraint orders_order_mode_chk check (order_mode in ('cash','lock10','futures30'));

alter table public.orders
  add column if not exists delivery_service text not null default 'self';
alter table public.orders
  drop constraint if exists orders_delivery_chk;
alter table public.orders
  add constraint orders_delivery_chk check (delivery_service in ('self','assembly'));

alter table public.orders add column if not exists assembly_fee   numeric not null default 0;
alter table public.orders add column if not exists deposit_amount numeric not null default 0;
alter table public.orders add column if not exists balance_amount numeric not null default 0;

-- ---------------------------------------------------------------------
-- 4. 中文輔助函式
-- ---------------------------------------------------------------------
create or replace function public.order_mode_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'cash'      then '現金提貨'
    when 'lock10'    then '10% 鎖單'
    when 'futures30' then '期貨 30% 鎖單'
    else s end;
$$;

create or replace function public.delivery_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'self'     then '自行運輸安裝'
    when 'assembly' then '預約組配服務'
    else s end;
$$;

create or replace function public.member_type_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'distribution' then '經銷會員'
    when 'core'         then '核心會員'
    else s end;
$$;

-- ---------------------------------------------------------------------
-- 5. Demo 資料：給每個產品設現貨庫存與期貨價，方便看到分流效果
-- ---------------------------------------------------------------------
-- 期貨價 = 牌價 × 0.85（範例）
update public.dealer_products set futures_price = round(base_price * 0.85)
  where futures_price is null;

-- 一部分有現貨、一部分純期貨（沒現貨）
update public.dealer_products set stock_qty = 20 where sku in ('MM-SOFA-01','MM-CHR-01','MM-TV-01','MM-DESK-01','MM-SHELF-01','MM-RUG-01');
update public.dealer_products set stock_qty = 0  where sku in ('MM-SOFA-02','MM-TBL-01','MM-BED-01','MM-WRD-01');

-- demo 經銷商先全部設為經銷會員；其中一個提升為核心會員
update public.dealers set member_type = 'distribution';
update public.dealers set member_type = 'core' where email = 'dealer-a@mm-demo.com';
