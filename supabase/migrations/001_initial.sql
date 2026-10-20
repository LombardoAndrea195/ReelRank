create type public.season_status as enum ('upcoming', 'active', 'closed');
create type public.submission_status as enum ('pending', 'approved', 'hidden');
create type public.content_type as enum ('reel', 'post');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz not null default now()
);
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  instagram_username text unique not null check (instagram_username ~ '^[a-z0-9._]+$'),
  display_name text,
  claimed_by_user_id uuid unique references public.profiles(id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status public.season_status not null default 'upcoming'
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete restrict,
  submitted_by_user_id uuid references public.profiles(id) on delete set null,
  instagram_url text not null check (instagram_url ~ '^https?://(www\.)?instagram\.com/(reel|p)/'),
  content_type public.content_type not null,
  title text check (char_length(title) <= 100),
  status public.submission_status not null default 'pending',
  source text not null default 'web' check (source in ('web', 'telegram')),
  created_at timestamptz not null default now(),
  unique (season_id, instagram_url)
);
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  updated_at timestamptz not null default now(),
  unique (user_id, submission_id)
);
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, username) values (new.id, coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile();

create function public.season_is_open(target_submission uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.submissions s join public.seasons se on se.id = s.season_id where s.id = target_submission and s.status = 'approved' and se.status = 'active' and now() between se.starts_at and se.ends_at)
$$;
create function public.can_vote(target_submission uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.season_is_open(target_submission) and exists(select 1 from public.submissions s join public.creators c on c.id = s.creator_id where s.id = target_submission and s.submitted_by_user_id is distinct from auth.uid() and c.claimed_by_user_id is distinct from auth.uid())
$$;

alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.seasons enable row level security;
alter table public.submissions enable row level security;
alter table public.ratings enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "profiles public" on public.profiles for select using (true);
create policy "creators public" on public.creators for select using (true);
create policy "signed users add creators" on public.creators for insert to authenticated with check (true);
create policy "seasons public" on public.seasons for select using (true);
create policy "approved submissions public" on public.submissions for select using (status = 'approved');
create policy "users submit" on public.submissions for insert to authenticated with check (submitted_by_user_id = auth.uid() and source = 'web');
create policy "ratings readable" on public.ratings for select using (true);
create policy "users vote" on public.ratings for insert to authenticated with check (user_id = auth.uid() and public.can_vote(submission_id));
create policy "users change own vote" on public.ratings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_vote(submission_id));
create policy "likes readable" on public.likes for select using (true);
create policy "users like" on public.likes for insert to authenticated with check (user_id = auth.uid() and public.can_vote(submission_id));
create policy "comments readable" on public.comments for select using (status = 'visible');
create policy "users comment" on public.comments for insert to authenticated with check (user_id = auth.uid() and public.can_vote(submission_id));

insert into public.seasons (name, description, starts_at, ends_at, status)
values ('Stagione 2026', 'I migliori Reel, post e creator dell’anno.', now(), now() + interval '1 year', 'active');
