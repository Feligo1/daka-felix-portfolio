-- Portfolio 2.0: additive setup for project publishing, gallery, journal and recommendations.
-- Run AFTER supabase-setup.sql and supabase-admin-role.sql in the Supabase SQL Editor.
-- This migration does not remove or replace existing portfolio data.
-- Requires existing public.is_portfolio_admin() from supabase-admin-role.sql.
create extension if not exists pgcrypto;

create table if not exists public.portfolio_projects (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (length(title) between 1 and 160),
 summary text not null default '',
 description text not null default '',
 category text not null default 'Development',
 technologies text[] not null default '{}',
 cover_url text,
 cover_alt text,
 github_url text,
 demo_url text,
 is_featured boolean not null default false,
 is_published boolean not null default false,
 display_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_project_media (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.portfolio_projects(id) on delete cascade,
 media_url text not null,
 media_type text not null check (media_type in ('image','video','external_video')),
 caption text not null default '',
 alt_text text not null default '',
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.portfolio_gallery (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 160),
 category text not null default 'Personal' check(category in ('Graduation','At Work','Personal','Events')),
 media_url text not null,
 alt_text text not null default '',
 caption text not null default '',
 event_date date,
 sort_order integer not null default 0,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_journal (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(title) between 1 and 160),
 summary text not null default '',
 body text not null default '',
 category text not null default 'Technology',
 cover_url text,
 is_published boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_recommendations (
 id uuid primary key default gen_random_uuid(),
 person_name text not null,
 job_title text not null default '',
 organization text not null default '',
 quote text not null check(length(quote) between 1 and 1500),
 permission_confirmed boolean not null default false,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint publish_with_permission check(not is_published or permission_confirmed)
);

create index if not exists portfolio_projects_published_idx on public.portfolio_projects(is_published,display_order);
create index if not exists portfolio_project_media_project_idx on public.portfolio_project_media(project_id,sort_order);
create index if not exists portfolio_gallery_published_idx on public.portfolio_gallery(is_published,sort_order);
create index if not exists portfolio_journal_published_idx on public.portfolio_journal(is_published,published_at desc);
create index if not exists portfolio_recommendations_published_idx on public.portfolio_recommendations(is_published);

alter table public.portfolio_projects enable row level security;
alter table public.portfolio_project_media enable row level security;
alter table public.portfolio_gallery enable row level security;
alter table public.portfolio_journal enable row level security;
alter table public.portfolio_recommendations enable row level security;

drop policy if exists "Published projects visible" on public.portfolio_projects;
create policy "Published projects visible" on public.portfolio_projects for select to anon,authenticated using (is_published);
drop policy if exists "Admin manages portfolio projects" on public.portfolio_projects;
create policy "Admin manages portfolio projects" on public.portfolio_projects for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Published project media visible" on public.portfolio_project_media;
create policy "Published project media visible" on public.portfolio_project_media for select to anon,authenticated
 using (exists(select 1 from public.portfolio_projects p where p.id=project_id and p.is_published));
drop policy if exists "Admin manages project media" on public.portfolio_project_media;
create policy "Admin manages project media" on public.portfolio_project_media for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Published gallery visible" on public.portfolio_gallery;
create policy "Published gallery visible" on public.portfolio_gallery for select to anon,authenticated using (is_published);
drop policy if exists "Admin manages gallery" on public.portfolio_gallery;
create policy "Admin manages gallery" on public.portfolio_gallery for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Published journal visible" on public.portfolio_journal;
create policy "Published journal visible" on public.portfolio_journal for select to anon,authenticated using (is_published);
drop policy if exists "Admin manages journal" on public.portfolio_journal;
create policy "Admin manages journal" on public.portfolio_journal for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Approved recommendations visible" on public.portfolio_recommendations;
create policy "Approved recommendations visible" on public.portfolio_recommendations for select to anon,authenticated using (is_published and permission_confirmed);
drop policy if exists "Admin manages recommendations" on public.portfolio_recommendations;
create policy "Admin manages recommendations" on public.portfolio_recommendations for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

grant select on public.portfolio_projects, public.portfolio_project_media, public.portfolio_gallery, public.portfolio_journal, public.portfolio_recommendations to anon,authenticated;
grant insert,update,delete on public.portfolio_projects, public.portfolio_project_media, public.portfolio_gallery, public.portfolio_journal, public.portfolio_recommendations to authenticated;

-- Public buckets contain ONLY intentionally public images/video. Draft/private uploads must NOT be placed in these buckets:
-- storage permissions do not inherit table publication flags. Keep private work in private portfolio-documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('portfolio-project-media','portfolio-project-media',true,20971520,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
 ('portfolio-gallery','portfolio-gallery',true,10485760,array['image/jpeg','image/png','image/webp','image/gif']),
 ('portfolio-journal-media','portfolio-journal-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "Portfolio v2 admin list media" on storage.objects;
create policy "Portfolio v2 admin list media" on storage.objects for select to authenticated
 using (bucket_id in ('portfolio-project-media','portfolio-gallery','portfolio-journal-media') and public.is_portfolio_admin());

drop policy if exists "Portfolio v2 admin insert media" on storage.objects;
create policy "Portfolio v2 admin insert media" on storage.objects for insert to authenticated
 with check (bucket_id in ('portfolio-project-media','portfolio-gallery','portfolio-journal-media') and public.is_portfolio_admin());
drop policy if exists "Portfolio v2 admin update media" on storage.objects;
create policy "Portfolio v2 admin update media" on storage.objects for update to authenticated
 using (bucket_id in ('portfolio-project-media','portfolio-gallery','portfolio-journal-media') and public.is_portfolio_admin())
 with check (bucket_id in ('portfolio-project-media','portfolio-gallery','portfolio-journal-media') and public.is_portfolio_admin());
drop policy if exists "Portfolio v2 admin delete media" on storage.objects;
create policy "Portfolio v2 admin delete media" on storage.objects for delete to authenticated
 using (bucket_id in ('portfolio-project-media','portfolio-gallery','portfolio-journal-media') and public.is_portfolio_admin());

-- Existing buckets portfolio-images, portfolio-certificate-files and portfolio-documents are retained.
-- Public media can be retrieved directly by URL after upload; do not upload confidential drafts here.

-- One-time, idempotent compatibility import of any original public projects.
-- Imported records become the single Project Showcase data source. Existing records remain untouched.
do $legacy_import$
begin
 if to_regclass('public.projects') is not null then
  insert into public.portfolio_projects
   (slug,title,summary,description,category,is_featured,is_published,display_order)
  select
   coalesce(nullif(trim(both '-' from left(regexp_replace(lower(coalesce(nullif(trim(p.title),''),'project')), '[^a-z0-9]+','-','g'),135)),''),'project')
     || '-' || substr(md5(p.id::text),1,8),
   coalesce(nullif(trim(p.title),''),'Untitled project'),
   left(coalesce(p.description,''),240),
   coalesce(p.description,''),
   'Previous projects',
   false,
   coalesce(p.is_active,false),
   coalesce(p.display_order,0)
  from public.projects p
  on conflict(slug) do nothing;
 end if;
end
$legacy_import$;
