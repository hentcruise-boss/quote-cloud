-- ============================================================
-- 第一階段資料搬遷: projects → customers / cases / quotes
-- 並把既有 quote_items 改掛到 quote_id。
-- 可重複執行 (以 projects.migrated_case_id 判斷, 只處理未搬遷者)。
-- 既有 projects 與 quote_items.project_id 保留不刪 (回滾用)。
-- ============================================================

-- 暫時的對映欄位 (日後清理遷移時再移除)
alter table projects add column if not exists migrated_case_id uuid;

-- 1) 為每個不重複、非空的 client 建立 customer (尚未存在者)
insert into customers (name)
select distinct trim(p.client)
from projects p
where coalesce(trim(p.client), '') <> ''
  and not exists (select 1 from customers c where c.name = trim(p.client));

-- 2) 每個尚未搬遷的 project → 一筆 case + 一筆 quote, 並改掛 quote_items
do $$
declare
  r record;
  new_case  uuid;
  new_quote uuid;
  cust      uuid;
begin
  for r in select * from projects where migrated_case_id is null loop
    select id into cust from customers
      where name = nullif(trim(r.client), '') limit 1;

    insert into cases (title, customer_id, stage, status, created_at)
    values (coalesce(nullif(trim(r.name), ''), '未命名案件'),
            cust, 'presales', 'active', coalesce(r.created_at, now()))
    returning id into new_case;

    insert into quotes (case_id, name, status)
    values (new_case, coalesce(nullif(trim(r.name), ''), '報價'), 'draft')
    returning id into new_quote;

    update quote_items set quote_id = new_quote where project_id = r.id;

    insert into case_events (case_id, type, summary)
    values (new_case, 'created', '案件由舊報價專案匯入');

    update projects set migrated_case_id = new_case where id = r.id;
  end loop;
end $$;
