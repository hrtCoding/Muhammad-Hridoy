-- HEART CODING STUDIO / Supabase setup
-- Run once in the Supabase SQL Editor of your own Free project.
begin;
create table if not exists public.hc_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.hc_admins enable row level security;
revoke all on public.hc_admins from anon, authenticated;
grant select on public.hc_admins to authenticated;
drop policy if exists "hc_view_own_admin" on public.hc_admins;
create policy "hc_view_own_admin" on public.hc_admins for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.hc_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.hc_admins where user_id=(select auth.uid())); $$;
revoke all on function public.hc_is_admin() from public;
grant execute on function public.hc_is_admin() to anon, authenticated;

create table if not exists public.hc_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('project','service')),
  title text not null check(char_length(btrim(title)) between 1 and 100),
  description text not null check(char_length(btrim(description)) between 1 and 350),
  tags text[] not null default '{}' check(cardinality(tags)<=12),
  image_url text not null default '',
  image_path text not null default '',
  demo_url text not null default '' check(demo_url='' or demo_url ~ '^https?://'),
  source_url text not null default '' check(source_url='' or source_url ~ '^https?://'),
  status text not null default 'draft' check(status in ('draft','published')),
  sort_order integer not null default 1 check(sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hc_project_cover check(kind<>'project' or char_length(image_url)>0)
);
create index if not exists hc_entries_display on public.hc_entries(status,kind,sort_order);
alter table public.hc_entries enable row level security;
revoke all on public.hc_entries from anon, authenticated;
grant select on public.hc_entries to anon, authenticated;
grant insert,update,delete on public.hc_entries to authenticated;
drop policy if exists "hc_read_published" on public.hc_entries;
create policy "hc_read_published" on public.hc_entries for select to anon, authenticated
using (status='published' or (select public.hc_is_admin()));
drop policy if exists "hc_admin_insert" on public.hc_entries;
create policy "hc_admin_insert" on public.hc_entries for insert to authenticated
with check ((select public.hc_is_admin()));
drop policy if exists "hc_admin_update" on public.hc_entries;
create policy "hc_admin_update" on public.hc_entries for update to authenticated
using ((select public.hc_is_admin())) with check ((select public.hc_is_admin()));
drop policy if exists "hc_admin_delete" on public.hc_entries;
create policy "hc_admin_delete" on public.hc_entries for delete to authenticated
using ((select public.hc_is_admin()));
create or replace function public.hc_set_updated_at() returns trigger
language plpgsql set search_path='' as $$ begin NEW.updated_at=now(); return NEW; end; $$;
drop trigger if exists hc_updated_at on public.hc_entries;
create trigger hc_updated_at before update on public.hc_entries for each row execute function public.hc_set_updated_at();

-- Covers are public assets, including covers attached to draft entries.
-- Draft text is private; do not upload confidential artwork to this bucket.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hc-projects','hc-projects',true,2097152,array['image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/webp'];
drop policy if exists "hc_cover_upload" on storage.objects;
create policy "hc_cover_upload" on storage.objects for insert to authenticated
with check (bucket_id='hc-projects' and (select public.hc_is_admin()));
drop policy if exists "hc_cover_delete" on storage.objects;
create policy "hc_cover_delete" on storage.objects for delete to authenticated
using (bucket_id='hc-projects' and (select public.hc_is_admin()));
drop policy if exists "hc_cover_admin_read" on storage.objects;
create policy "hc_cover_admin_read" on storage.objects for select to authenticated
using (bucket_id='hc-projects' and (select public.hc_is_admin()));

-- Your three existing portfolio projects. No fake services are added.
insert into public.hc_entries (id,kind,title,description,tags,image_url,status,sort_order,demo_url,source_url) values
('11111111-1111-4111-8111-111111111111','project','Portfolio Website','A personal portfolio showcasing my work, built with HTML, CSS, and JavaScript.',array['HTML','CSS','JavaScript'],'src/img/project1.jpg','published',1,'https://moder-porfolio.vercel.app/','https://buymeacoffee.com/hridoycandr/e/379461'),
('22222222-2222-4222-8222-222222222222','project','Admin Dashboard','A responsive admin dashboard design and management panel.',array['HTML','CSS','Bootstrap','jQuery','JavaScript'],'src/img/project2.jpg','published',2,'https://dashboard-5-one.vercel.app/','https://buymeacoffee.com/hridoycandr/e/443817'),
('33333333-3333-4333-8333-333333333333','project','Restaurant Template','A modern restaurant management website template.',array['HTML','CSS','Bootstrap','jQuery','JavaScript'],'src/img/project3.jpg','published',3,'','https://buymeacoffee.com/hridoycandr/e/437427')
on conflict (id) do nothing;
-- Existing Supabase projects: run once before saving categories with this version.
alter table public.hc_entries add column if not exists category text not null default 'Other' check (category in ('Portfolio','Dashboard','Restaurant','E-commerce','Business','Landing Page','Other'));
update public.hc_entries set category=case id
 when '11111111-1111-4111-8111-111111111111'::uuid then 'Portfolio'
 when '22222222-2222-4222-8222-222222222222'::uuid then 'Dashboard'
 when '33333333-3333-4333-8333-333333333333'::uuid then 'Restaurant'
 else category end
where category='Other' and id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333');
NOTIFY pgrst, 'reload schema';

commit;

-- NEXT: Create your email/password user in Authentication > Users.
-- Copy that user's UID, replace YOUR_USER_UID below, then run the command:
-- insert into public.hc_admins(user_id) values ('YOUR_USER_UID') on conflict do nothing;
-- Never use the database password or service-role key as the dashboard password.

-- Run this whole file once in Supabase SQL Editor for an existing installation.
begin;
alter table public.hc_entries add column if not exists category text not null default 'Other';
alter table public.hc_entries drop constraint if exists hc_entries_category_check;
do $$
begin
 if to_regclass('public.hc_categories') is null then
  create table public.hc_categories (
   name text primary key check (char_length(name) between 1 and 40 and name=btrim(name) and lower(name)<>'all' and name !~ '[<>[:cntrl:]]')
  );
  insert into public.hc_categories(name) values ('Portfolio'),('Dashboard'),('Restaurant'),('E-commerce'),('Business'),('Landing Page'),('Other');
 end if;
end $$;
insert into public.hc_categories(name) values ('Other') on conflict do nothing;
insert into public.hc_categories(name) select distinct category from public.hc_entries on conflict do nothing;
create unique index if not exists hc_categories_name_lower on public.hc_categories(lower(name));
alter table public.hc_categories enable row level security;
revoke all on public.hc_categories from anon,authenticated;
grant select on public.hc_categories to anon,authenticated;
grant insert,update,delete on public.hc_categories to authenticated;
drop policy if exists hc_categories_read on public.hc_categories;
create policy hc_categories_read on public.hc_categories for select to anon,authenticated using(true);
drop policy if exists hc_categories_add on public.hc_categories;
create policy hc_categories_add on public.hc_categories for insert to authenticated with check((select public.hc_is_admin()));
drop policy if exists hc_categories_rename on public.hc_categories;
create policy hc_categories_rename on public.hc_categories for update to authenticated using(name<>'Other' and (select public.hc_is_admin())) with check(name<>'Other' and (select public.hc_is_admin()));
drop policy if exists hc_categories_remove on public.hc_categories;
create policy hc_categories_remove on public.hc_categories for delete to authenticated using(name<>'Other' and (select public.hc_is_admin()));
alter table public.hc_entries drop constraint if exists hc_entries_category_fkey;
alter table public.hc_entries add constraint hc_entries_category_fkey foreign key(category) references public.hc_categories(name) on update cascade on delete set default;
NOTIFY pgrst, 'reload schema';
commit;
