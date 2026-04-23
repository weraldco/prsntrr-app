-- Viewer-submitted questions for a session; accessed via backend service role.

create table public.session_questions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 1 and char_length(body) <= 2000),
  answered boolean default false not null,
  created_at timestamptz default now() not null,
  answered_at timestamptz
);

create index session_questions_session_id_idx on public.session_questions (session_id);
create index session_questions_session_answered_idx on public.session_questions (session_id, answered, created_at);

alter table public.session_questions enable row level security;
