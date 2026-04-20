-- Run in Supabase SQL editor or via `supabase db push` after linking a project.
-- Aligns with presentation-app-plan: sessions, slides, profiles, RLS.

create table public.profiles (
  id uuid references auth.users (id) on delete cascade primary key,
  name text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  title text not null,
  status text default 'idle' check (status in ('idle', 'live', 'ended')),
  current_slide int default 0 not null,
  total_slides int default 0 not null,
  presenter_id uuid not null references auth.users (id) on delete cascade,
  control_granted text,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '24 hours') not null
);

create index sessions_presenter_id_idx on public.sessions (presenter_id);

create table public.slides (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  "order" int not null,
  content jsonb not null,
  created_at timestamptz default now() not null,
  unique (session_id, "order")
);

create index slides_session_id_idx on public.slides (session_id);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.slides enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Presenter manages own sessions"
  on public.sessions for all
  using (auth.uid() = presenter_id);

create policy "Anyone can read live sessions"
  on public.sessions for select
  using (status = 'live');

create policy "Presenter manages own slides"
  on public.slides for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = slides.session_id
        and s.presenter_id = auth.uid()
    )
  );

create policy "Anyone can read slides of live sessions"
  on public.slides for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = slides.session_id
        and s.status = 'live'
    )
  );
