-- =====================================================================
--  Migration：產品加上「交期」與「場景」欄位（可重複執行）
--  跑完 dealer_schema.sql 後可隨時執行；不影響既有資料。
--    lead_time_type  text  : 'stock' 現貨 / 'fast' 快速交付 / 'normal' 正常交期
--    scenes          text[]: 場景多選（客廳 / 餐廳 / 臥室 …）
-- =====================================================================

alter table public.dealer_products
  add column if not exists lead_time_type text not null default 'normal';

alter table public.dealer_products
  add column if not exists scenes text[] not null default '{}';

alter table public.dealer_products
  drop constraint if exists dealer_products_lead_time_type_chk;
alter table public.dealer_products
  add constraint dealer_products_lead_time_type_chk
  check (lead_time_type in ('stock','fast','normal'));

-- GIN 索引：場景陣列搜尋（@> 或 && 都會用到）
create index if not exists idx_dealer_products_scenes on public.dealer_products using gin (scenes);

-- 交期狀態中文（給後台 / 報表用）
create or replace function public.lead_time_label(s text) returns text
  language sql immutable as $$
  select case s
    when 'stock'  then '現貨'
    when 'fast'   then '快速交付'
    when 'normal' then '正常交期'
    else s end;
$$;

-- ---- Demo 資料補上交期與場景（讓篩選有東西可篩） ---------------------
update public.dealer_products set lead_time_type = 'stock',  scenes = array['客廳']         where sku = 'MM-SOFA-01';
update public.dealer_products set lead_time_type = 'normal', scenes = array['客廳']         where sku = 'MM-SOFA-02';
update public.dealer_products set lead_time_type = 'fast',   scenes = array['餐廳']         where sku = 'MM-TBL-01';
update public.dealer_products set lead_time_type = 'stock',  scenes = array['餐廳','公共區'] where sku = 'MM-CHR-01';
update public.dealer_products set lead_time_type = 'normal', scenes = array['臥室']         where sku = 'MM-BED-01';
update public.dealer_products set lead_time_type = 'normal', scenes = array['臥室']         where sku = 'MM-WRD-01';
update public.dealer_products set lead_time_type = 'fast',   scenes = array['客廳']         where sku = 'MM-TV-01';
update public.dealer_products set lead_time_type = 'stock',  scenes = array['兒童房']       where sku = 'MM-DESK-01';
update public.dealer_products set lead_time_type = 'stock',  scenes = array['書房','收納']   where sku = 'MM-SHELF-01';
update public.dealer_products set lead_time_type = 'stock',  scenes = array['客廳','臥室']   where sku = 'MM-RUG-01';
