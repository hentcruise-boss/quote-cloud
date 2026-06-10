-- ============================================================
-- 祥鼎案件平臺 — 第一階段資料結構 (Phase 1 schema)
-- 在 Supabase SQL Editor 依序執行: 001 → 002 → 003
-- 本檔可重複執行 (idempotent)。
-- ============================================================

create extension if not exists pgcrypto;

-- ── profiles (對應 auth.users) ──────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'staff'
             check (role in ('admin','staff','customer','supplier','field')),
  company    text,
  created_at timestamptz not null default now()
);

-- 新使用者註冊時自動建立 profile (內部預設 staff)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── customers (把原本 projects.client 文字升級成實體) ────────
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  phone        text,
  email        text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── cases (案件主軸) ────────────────────────────────────────
create table if not exists cases (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  title       text not null,
  customer_id uuid references customers(id) on delete set null,
  stage       text not null default 'presales'
              check (stage in ('initiation','presales','contract','production',
                               'delivery','inspection','aftersales','closed','lost')),
  status      text not null default 'active'
              check (status in ('active','on_hold','closed','lost')),
  owner_id    uuid references profiles(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 自動產生案件編號 C-YYYY-NNN
create or replace function set_case_code()
returns trigger language plpgsql as $$
declare seq int;
begin
  if new.code is null then
    select count(*) + 1 into seq from cases
      where date_part('year', created_at) = date_part('year', now());
    new.code := 'C-' || to_char(now(),'YYYY') || '-' || lpad(seq::text, 3, '0');
  end if;
  return new;
end; $$;

drop trigger if exists trg_case_code on cases;
create trigger trg_case_code before insert on cases
  for each row execute function set_case_code();

-- 維護 updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_cases_touch on cases;
create trigger trg_cases_touch before update on cases
  for each row execute function touch_updated_at();

-- ── case_participants (第二階段對外存取用, 先建表預留) ───────
create table if not exists case_participants (
  case_id    uuid references cases(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  relation   text check (relation in ('customer','supplier','field','watcher')),
  primary key (case_id, profile_id)
);

-- ── quotes (取代 projects 當 quote_items 父層) ──────────────
create table if not exists quotes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  name       text,
  status     text not null default 'draft'
             check (status in ('draft','sent','accepted','rejected')),
  created_at timestamptz not null default now()
);

-- ── quote_items: 新增 quote_id (其餘欄位完全不變) ───────────
alter table quote_items add column if not exists quote_id uuid references quotes(id) on delete cascade;
create index if not exists idx_quote_items_quote on quote_items(quote_id);

-- ── case_events (時間軸 / 活動流) ───────────────────────────
create table if not exists case_events (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  type       text not null,
  summary    text,
  meta       jsonb not null default '{}',
  visibility text not null default 'all' check (visibility in ('all','internal')),
  created_at timestamptz not null default now()
);
create index if not exists idx_case_events_case on case_events(case_id, created_at);

-- ── comments ────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null,
  visibility text not null default 'all' check (visibility in ('all','internal')),
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_case on comments(case_id, created_at);

-- ── attachments (中繼資料; 檔案 bytes 放 Storage) ───────────
create table if not exists attachments (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references cases(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  bucket      text not null default 'case-files',
  path        text not null,
  filename    text,
  mime_type   text,
  size_bytes  bigint,
  kind        text not null default 'file' check (kind in ('file','photo','document','signoff')),
  visibility  text not null default 'all' check (visibility in ('all','internal')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_attachments_case on attachments(case_id, created_at);

-- ── export_history: 新增 case_id (保留 project_id 相容) ──────
alter table export_history add column if not exists case_id uuid references cases(id) on delete set null;
-- 改用 case 後 project_id 可為空
alter table export_history alter column project_id drop not null;

-- ── 即時同步: 把新表加入 realtime publication ───────────────
do $$
begin
  alter publication supabase_realtime add table cases, case_events, comments, attachments, quotes;
exception when duplicate_object then null;
end $$;
