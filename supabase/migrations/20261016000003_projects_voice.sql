-- Voiceovers (generated or uploaded) and projects (the user's inputs + render state).
-- Users read their own rows; all writes happen on the server.
create table public.voiceovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('generated', 'uploaded')),
  script text,
  voice_artist text,
  path text not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  script text,
  voiceover_id uuid not null references public.voiceovers (id),
  logo_path text not null,
  aspect_ratio text not null check (aspect_ratio in ('16:9', '9:16', '1:1')),
  status text not null default 'draft' check (status in ('draft', 'rendering', 'done', 'failed')),
  video_path text,
  error text,
  created_at timestamptz not null default now()
);
create index projects_user_idx on public.projects (user_id, created_at desc);

alter table public.voiceovers enable row level security;
alter table public.projects enable row level security;
create policy "read own voiceovers" on public.voiceovers for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own projects" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.voiceovers, public.projects from anon, authenticated;
grant select on public.voiceovers, public.projects to authenticated;
