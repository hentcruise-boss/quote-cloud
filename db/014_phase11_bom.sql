-- ============================================================
-- 第十一階段-b:生產 BOM 扣料
-- 在 011 之後執行。可重複執行。
-- bom_items 定義「產品 → 組成物料(亦為 SKU)× 單位用量」。
-- 生產任務可指定料號/數量/領料倉,完工時依 BOM 扣對應倉庫存。
-- ============================================================

create table if not exists bom_items (
  id            uuid primary key default gen_random_uuid(),
  product_sku   text references products(sku) on delete cascade,
  component_sku text references products(sku) on delete cascade,
  qty_per       numeric not null default 1,
  unique (product_sku, component_sku)
);
create index if not exists idx_bom_product on bom_items(product_sku);

alter table production_tasks add column if not exists product_sku       text references products(sku) on delete set null;
alter table production_tasks add column if not exists qty               int not null default 1;
alter table production_tasks add column if not exists warehouse_id      uuid references warehouses(id) on delete set null;
alter table production_tasks add column if not exists material_deducted boolean not null default false;

alter table bom_items enable row level security;
drop policy if exists bom_items_internal on bom_items;
create policy bom_items_internal on bom_items for all using (is_internal()) with check (is_internal());

do $$
begin
  alter publication supabase_realtime add table bom_items;
exception when duplicate_object then null;
end $$;
