-- ============================================================
-- Phase 6: Instagram 자동 발행
-- 작성: 2026-05-13
-- ============================================================

-- 1. instagram_accounts (사용자당 1개)
create table public.instagram_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ig_user_id text not null,
  ig_username text,
  fb_page_id text not null,
  fb_page_name text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger instagram_accounts_updated_at
  before update on public.instagram_accounts
  for each row execute function public.set_updated_at();

alter table public.instagram_accounts enable row level security;

create policy "own instagram_account" on public.instagram_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. projects 발행 결과 컬럼
alter table public.projects
  add column if not exists published_post_id text,
  add column if not exists published_permalink text,
  add column if not exists published_at timestamptz;
