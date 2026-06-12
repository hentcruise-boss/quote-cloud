-- =====================================================================
--  Migration v3：新增「現貨 30% 鎖單」+ 收款 / 提貨流程的訂單狀態
--  跑完 v2 後執行，可重複跑。
-- =====================================================================

-- 1. 放寬 order_mode：新增 'lock30'（現貨 30% 鎖單）
alter table public.orders drop constraint if exists orders_order_mode_chk;
alter table public.orders
  add constraint orders_order_mode_chk
  check (order_mode in ('cash','lock10','lock30','futures30'));

-- 2. 新增收款 / 提貨流程相關欄位
alter table public.orders add column if not exists payment_proof text;
alter table public.orders add column if not exists payment_received_at timestamptz;

-- 3. 更新中文狀態標籤（加入待收款 / 已收款 / 待提貨）
create or replace function public.status_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'awaiting_payment' then '待收款'
    when 'paid'             then '已收款'
    when 'ready_pickup'     then '待提貨'
    when 'placed'           then '已成立'
    when 'production'       then '生產'
    when 'shipping'         then '海運'
    when 'arrived'          then '到台'
    when 'stored'           then '入庫'
    when 'delivered'        then '已交付/出庫'
    when 'cancelled'        then '已取消'
    else s end;
$$;

-- 4. 訂單方式中文標籤補上 lock30
create or replace function public.order_mode_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'cash'      then '現金提貨'
    when 'lock10'    then '10% 鎖單'
    when 'lock30'    then '現貨 30% 鎖單'
    when 'futures30' then '期貨 30% 鎖單'
    else s end;
$$;
