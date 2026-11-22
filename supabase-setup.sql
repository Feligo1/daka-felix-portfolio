-- Run this in Supabase SQL Editor for the portfolio project.
-- Files live in Storage; Postgres stores their metadata and paths.

create table if not exists public.portfolio_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.portfolio_admins enable row level security;
drop policy if exists "Admins can verify own role" on public.portfolio_admins;
create policy "Admins can verify own role" on public.portfolio_admins
    for select to authenticated using (user_id = (select auth.uid()));
grant select on public.portfolio_admins to authenticated;

create or replace function public.is_portfolio_admin()
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.portfolio_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null default '',
    file_name text not null,
    file_path text not null unique,
    mime_type text not null,
    file_size bigint not null check (file_size > 0),
    is_public boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.device_visits (
    id bigint generated always as identity primary key,
    session_id text not null check (char_length(session_id) between 1 and 100),
    page_path text not null check (char_length(page_path) between 1 and 500),
    device_type text not null check (device_type in ('Phone', 'Tablet', 'Desktop')),
    browser text not null check (char_length(browser) <= 40),
    operating_system text not null check (char_length(operating_system) <= 40),
    visited_at timestamptz not null default now(),
    unique (session_id, page_path)
);
create index if not exists device_visits_visited_at_idx
    on public.device_visits (visited_at desc);

alter table public.documents enable row level security;
drop policy if exists "Public can read public documents" on public.documents;
drop policy if exists "Authenticated admins manage documents" on public.documents;
create policy "Authenticated admins manage documents"
    on public.documents for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

-- Certificate records can link to a public PDF or Word file as well as an image.
alter table public.certificates add column if not exists document_url text;
alter table public.certificates add column if not exists document_path text;
alter table public.certificates add column if not exists document_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-certificate-files', 'portfolio-certificate-files', true, 20971520,
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The images bucket is public for portfolio display. Writes require an admin login.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 20971520,
    array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Private documents can only be opened from the authenticated admin session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-documents', 'portfolio-documents', false, 20971520,
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'text/markdown',
        'application/rtf'
    ])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Replace only this baseline's known policies, including legacy admin-role names.
-- Review unfamiliar policies separately, especially rules without a bucket restriction.
drop policy if exists "Public can view portfolio images" on storage.objects;
drop policy if exists "Authenticated admins upload portfolio images" on storage.objects;
drop policy if exists "Authenticated admins update portfolio images" on storage.objects;
drop policy if exists "Authenticated admins delete portfolio images" on storage.objects;
drop policy if exists "Authenticated admins manage portfolio documents" on storage.objects;
drop policy if exists "Public can view certificate files" on storage.objects;
drop policy if exists "Authenticated admins upload certificate files" on storage.objects;
drop policy if exists "Authenticated admins update certificate files" on storage.objects;
drop policy if exists "Authenticated admins delete certificate files" on storage.objects;
drop policy if exists "Portfolio admins upload portfolio images" on storage.objects;
drop policy if exists "Portfolio admins update portfolio images" on storage.objects;
drop policy if exists "Portfolio admins delete portfolio images" on storage.objects;
drop policy if exists "Portfolio admins manage portfolio documents" on storage.objects;
drop policy if exists "Portfolio admins upload certificate files" on storage.objects;
drop policy if exists "Portfolio admins update certificate files" on storage.objects;
drop policy if exists "Portfolio admins delete certificate files" on storage.objects;

create policy "Public can view portfolio images"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'portfolio-images');
create policy "Authenticated admins upload portfolio images"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Authenticated admins update portfolio images"
    on storage.objects for update to authenticated
    using (bucket_id = 'portfolio-images' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Authenticated admins delete portfolio images"
    on storage.objects for delete to authenticated
    using (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Authenticated admins manage portfolio documents"
    on storage.objects for all to authenticated
    using (bucket_id = 'portfolio-documents' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-documents' and public.is_portfolio_admin());
create policy "Public can view certificate files"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'portfolio-certificate-files');
create policy "Authenticated admins upload certificate files"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());
create policy "Authenticated admins update certificate files"
    on storage.objects for update to authenticated
    using (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());
create policy "Authenticated admins delete certificate files"
    on storage.objects for delete to authenticated
    using (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());

-- Public pages can read portfolio content. Writes to content require Supabase Auth.
do $$
declare
    target_table text;
    policy_row record;
begin
    foreach target_table in array array['site_settings', 'certificates', 'projects', 'visitors', 'contact_submissions', 'device_visits'] loop
        for policy_row in
            select p.policyname from pg_policies as p
            where p.schemaname = 'public' and p.tablename = target_table
        loop
            execute format('drop policy %I on public.%I', policy_row.policyname, target_table);
        end loop;
        execute format('alter table public.%I enable row level security', target_table);
    end loop;
end $$;

create policy "Public reads site settings" on public.site_settings
    for select to anon, authenticated using (true);
create policy "Authenticated admins manage site settings" on public.site_settings
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Public reads certificates" on public.certificates
    for select to anon, authenticated using (true);
create policy "Authenticated admins manage certificates" on public.certificates
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Public reads projects" on public.projects
    for select to anon, authenticated using (true);
create policy "Authenticated admins manage projects" on public.projects
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Visitors can read counts" on public.visitors
    for select to anon, authenticated using (true);
create policy "Visitors can add counts" on public.visitors
    for insert to anon, authenticated with check (true);
create policy "Visitors can update counts" on public.visitors
    for update to anon, authenticated using (true) with check (true);
create policy "Authenticated admins manage visitors" on public.visitors
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Authenticated admins manage contact submissions" on public.contact_submissions
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Public can record device visits" on public.device_visits
    for insert to anon, authenticated with check (true);
create policy "Portfolio admins can view device visits" on public.device_visits
    for select to authenticated using (public.is_portfolio_admin());

grant select on public.site_settings, public.certificates, public.projects to anon, authenticated;
grant select, insert, update on public.visitors to anon, authenticated;
grant all on public.site_settings, public.certificates, public.projects,
    public.documents, public.contact_submissions to authenticated;
revoke select on public.documents from anon;
grant insert on public.device_visits to anon, authenticated;
grant select on public.device_visits to authenticated;
grant usage, select on sequence public.device_visits_id_seq to anon, authenticated;
