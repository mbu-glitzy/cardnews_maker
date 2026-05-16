-- ============================================================
-- 카드뉴스 메이커 초기 스키마
-- 작성: 2026-05-13
-- ============================================================

-- ============================================================
-- 1. 공통 헬퍼
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. brand_profiles
-- ============================================================

create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  logo_url text,
  color_primary text not null default '#6366f1',
  color_secondary text not null default '#a5b4fc',
  color_text text not null default '#ffffff',
  font_primary text not null default 'Pretendard',
  font_secondary text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brand_profiles_user_id_idx on public.brand_profiles(user_id);
create unique index brand_profiles_default_unique
  on public.brand_profiles(user_id)
  where is_default = true;

create trigger brand_profiles_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. projects
-- ============================================================

create type project_status as enum (
  'draft', 'researching', 'planning', 'copywriting', 'imaging', 'completed'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  tone text not null default 'informative',
  card_count int not null default 6 check (card_count between 5 and 8),
  brand_profile_id uuid references public.brand_profiles(id) on delete set null,
  brand_override jsonb,
  status project_status not null default 'draft',
  caption text,
  hashtags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);
create index projects_created_at_idx on public.projects(created_at desc);
create index projects_status_idx on public.projects(status);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. research_reports
-- ============================================================

create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  content jsonb not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index research_reports_project_id_idx on public.research_reports(project_id);

-- ============================================================
-- 5. plans
-- ============================================================

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  target_persona text not null,
  key_message text not null,
  card_outline jsonb not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index plans_project_id_idx on public.plans(project_id);

-- ============================================================
-- 6. cards
-- ============================================================

create type card_role as enum (
  'hook', 'problem', 'solution', 'proof', 'cta', 'detail', 'cover'
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  "order" int not null,
  role card_role not null,
  headline text not null default '',
  body text not null default '',
  cta text,
  image_prompt text,
  image_url text,
  rendered_url text,
  engine text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, "order")
);

create index cards_project_id_idx on public.cards(project_id);

create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ============================================================
-- 7. usage_logs
-- ============================================================

create type ai_operation as enum (
  'research', 'plan', 'copy', 'image', 'metadata', 'misc'
);

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  model text not null,
  operation ai_operation not null,
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  image_count int,
  image_quality text,
  cost_usd numeric(12, 6) not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index usage_logs_user_id_idx on public.usage_logs(user_id);
create index usage_logs_project_id_idx on public.usage_logs(project_id);
create index usage_logs_created_at_idx on public.usage_logs(created_at desc);
create index usage_logs_model_idx on public.usage_logs(model);

-- ============================================================
-- 8. api_credentials (사용자 개인 API 키, 암호화 저장)
-- ============================================================

create table public.api_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anthropic_key_encrypted text,
  google_ai_key_encrypted text,
  openai_key_encrypted text,
  monthly_budget_usd numeric(10, 2),
  default_engine text not null default 'nano-banana-pro',
  default_tone text not null default 'informative',
  default_card_count int not null default 6 check (default_card_count between 5 and 8),
  updated_at timestamptz not null default now()
);

create trigger api_credentials_updated_at
  before update on public.api_credentials
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. RLS 활성화 + 정책
-- ============================================================

alter table public.brand_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.research_reports enable row level security;
alter table public.plans enable row level security;
alter table public.cards enable row level security;
alter table public.usage_logs enable row level security;
alter table public.api_credentials enable row level security;

-- brand_profiles
create policy "own brand_profiles" on public.brand_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- projects
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- research_reports (project를 통해 user 확인)
create policy "own research_reports" on public.research_reports
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = research_reports.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = research_reports.project_id and p.user_id = auth.uid()
    )
  );

-- plans
create policy "own plans" on public.plans
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = plans.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = plans.project_id and p.user_id = auth.uid()
    )
  );

-- cards
create policy "own cards" on public.cards
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = cards.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = cards.project_id and p.user_id = auth.uid()
    )
  );

-- usage_logs (사용자 본인만 조회. 쓰기는 서비스 롤에서만)
create policy "own usage_logs read" on public.usage_logs
  for select using (auth.uid() = user_id);

-- api_credentials
create policy "own api_credentials" on public.api_credentials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 10. Storage 버킷
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('brand-logos', 'brand-logos', true),
  ('card-images', 'card-images', true),
  ('rendered-cards', 'rendered-cards', true)
on conflict (id) do nothing;

-- Storage RLS: 사용자별 폴더 ({user_id}/...) 만 접근
create policy "own brand-logos"
  on storage.objects for all
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own card-images"
  on storage.objects for all
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own rendered-cards"
  on storage.objects for all
  using (
    bucket_id = 'rendered-cards'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'rendered-cards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기 (인스타 게시 후 외부에서 미리보기 가능하도록)
create policy "public read brand-logos"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

create policy "public read card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');

create policy "public read rendered-cards"
  on storage.objects for select
  using (bucket_id = 'rendered-cards');

-- ============================================================
-- 11. 신규 회원 가입 시 기본 api_credentials 행 자동 생성
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.api_credentials (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
