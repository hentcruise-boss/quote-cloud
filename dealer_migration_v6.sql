-- =====================================================================
--  Migration v6：行銷功能 — 公告 / 促銷價 / 併櫃截單設定
--  跑完 v5 後執行，可重複跑。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 公告 / 行銷 Banner（經銷商首頁顯示）
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  link       text,                          -- 站內路徑（如 /product/MM-CHR-01）或外部網址
  kind       text not null default 'info',  -- info 一般 / promo 促銷 / alert 重要
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.announcements drop constraint if exists announcements_kind_chk;
alter table public.announcements
  add constraint announcements_kind_chk check (kind in ('info','promo','alert'));

alter table public.announcements enable row level security;

-- 經銷商只看到「啟用中且在檔期內」的公告；管理員全可
drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements for select to authenticated
  using (public.is_admin() or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  ));

drop policy if exists ann_admin on public.announcements;
create policy ann_admin on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. 系統設定 app_settings（key-value；目前用於併櫃截單節奏）
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value text
);

alter table public.app_settings enable row level security;

drop policy if exists aset_select on public.app_settings;
create policy aset_select on public.app_settings for select to authenticated using (true);

drop policy if exists aset_admin on public.app_settings;
create policy aset_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 預設：每週四 17:00 截單、截單後約 28 天到台（對應「每周一櫃」節奏）
insert into public.app_settings(key, value) values
  ('container_cutoff_weekday', '4'),
  ('container_cutoff_hour',    '17'),
  ('container_lead_days',      '28')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3. 產品促銷價（限時特價；對「現貨牌價」生效，期貨價不受影響）
-- ---------------------------------------------------------------------
alter table public.dealer_products add column if not exists sale_price numeric;
alter table public.dealer_products add column if not exists sale_until date;

-- ---------------------------------------------------------------------
-- 4. Demo 資料
-- ---------------------------------------------------------------------
update public.dealer_products
  set sale_price = 2880, sale_until = current_date + 21
  where sku = 'MM-CHR-01';

insert into public.announcements (title, body, link, kind, is_active, sort_order)
select '本週櫃併櫃中｜餐椅限時特惠',
       '餐椅 MM-CHR-01 促銷價 NT$2,880（牌價 3,200）。趕上本週櫃，預計四週後到台。',
       '/product/MM-CHR-01', 'promo', true, 10
where not exists (select 1 from public.announcements where title like '本週櫃併櫃中%');
