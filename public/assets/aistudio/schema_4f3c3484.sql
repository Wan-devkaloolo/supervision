-- STHC Site Ops: run this once in Supabase -> SQL Editor

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'supervisor' check (role in ('ceo','supervisor')),
  created_at timestamptz default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  address text,
  service text,
  quoted_days int default 1,
  start_date date default current_date,
  status text not null default 'active' check (status in ('active','completed')),
  supervisor_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  done_at timestamptz,
  sort int default 0
);

create table if not exists site_logs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  supervisor_id uuid references profiles(id),
  type text not null check (type in ('checkin','checkout','update','issue')),
  note text,
  severity text check (severity in ('low','high')),
  photo_url text,
  resolved boolean not null default false,
  created_at timestamptz default now()
);

-- auto-create a profile whenever a user is added
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_ceo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'ceo');
$$;

alter table profiles enable row level security;
alter table sites enable row level security;
alter table checklist_items enable row level security;
alter table site_logs enable row level security;

create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles ceo write" on profiles for all to authenticated using (is_ceo()) with check (is_ceo());

create policy "sites ceo all" on sites for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "sites supervisor read" on sites for select to authenticated using (supervisor_id = auth.uid());

create policy "items ceo all" on checklist_items for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "items supervisor read" on checklist_items for select to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));
create policy "items supervisor update" on checklist_items for update to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));

create policy "logs ceo all" on site_logs for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "logs supervisor read" on site_logs for select to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));
create policy "logs supervisor insert" on site_logs for insert to authenticated
  with check (supervisor_id = auth.uid() and exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));

-- real-time sync
alter publication supabase_realtime add table sites, checklist_items, site_logs;

-- photo storage
insert into storage.buckets (id, name, public) values ('site-photos','site-photos', true) on conflict do nothing;
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'site-photos');
create policy "photos read" on storage.objects for select using (bucket_id = 'site-photos');

-- AFTER you create your own login (see README), make yourself CEO:
-- update profiles set role = 'ceo' where id = (select id from auth.users where email = 'YOUR_EMAIL');
