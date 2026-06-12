-- =====================================================================
--  第二期種子（Demo 庫存）—— 跑完 dealer_schema_p2.sql 後執行。
--  需先建立 dealer-c@mm-demo.com 帳號並完成綁定（見 dealer_seed.sql 說明）。
--  幫「日好生活（C 級）」放幾筆樹林倉的代管庫存。
--
--  註：本檔在 SQL Editor 以 postgres 直寫表（繞過 RLS），
--      不走 inventory_adjust RPC（該 RPC 會檢查 is_admin()，
--      SQL Editor 沒有 auth.uid() 會被擋下）。
-- =====================================================================

do $$
declare
  did uuid;
  row record;
begin
  select id into did from public.dealers where email = 'dealer-c@mm-demo.com';
  if did is null then
    raise notice '找不到 dealer-c@mm-demo.com 的經銷商列，請先建 Auth 帳號 + 跑 dealer_seed.sql 末段綁定 INSERT';
    return;
  end if;

  -- 期初庫存（直寫 inventory + inventory_movements）
  for row in
    select * from (values
      ('MM-SOFA-01','北歐三人布沙發',     'W2000×D900×H850', 8),
      ('MM-CHR-01', '餐椅（單張）',       'W480×D520×H880',  40),
      ('MM-TV-01',  '懸浮電視櫃（1.8m）', 'W1800×D400×H300', 5),
      ('MM-RUG-01', '手工羊毛地毯（2×3m）','200×300 cm',     12)
    ) as t(sku, name, spec, qty)
  loop
    insert into public.inventory(dealer_id, sku, name, spec, warehouse, qty)
      values(did, row.sku, row.name, row.spec, '樹林倉', row.qty)
      on conflict (dealer_id, sku, warehouse)
        do update set qty = excluded.qty, name = excluded.name, spec = excluded.spec, updated_at = now();

    insert into public.inventory_movements(dealer_id, sku, name, warehouse, type, qty, note)
      values(did, row.sku, row.name, '樹林倉', 'in', row.qty, '期初入庫');
  end loop;
end $$;
