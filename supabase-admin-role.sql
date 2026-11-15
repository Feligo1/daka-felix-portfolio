-- Run in Supabase SQL Editor after creating the auth account that should be an admin.
-- Then run the commented INSERT at the bottom with that account's email.

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
alter table public.documents enable row level security;
drop policy if exists "Public can read public documents" on public.documents;
create policy "Public can read public documents" on public.documents
    for select to anon, authenticated using (is_public = true);
grant select on public.documents to anon, authenticated;
grant all on public.documents to authenticated;

create table if not exists public.portfolio_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.portfolio_admins enable row level security;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.portfolio_admins
        where user_id = (select auth.uid())
    );
$$;
revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;
grant select on public.portfolio_admins to authenticated;
drop policy if exists "Admins can verify own role" on public.portfolio_admins;
create policy "Admins can verify own role" on public.portfolio_admins
    for select to authenticated using (user_id = (select auth.uid()));

-- Public content remains readable. Only users in portfolio_admins can change it.
drop policy if exists "Authenticated admins manage site settings" on public.site_settings;
drop policy if exists "Portfolio admins manage site settings" on public.site_settings;
create policy "Portfolio admins manage site settings" on public.site_settings
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Authenticated admins manage certificates" on public.certificates;
drop policy if exists "Portfolio admins manage certificates" on public.certificates;
create policy "Portfolio admins manage certificates" on public.certificates
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Authenticated admins manage projects" on public.projects;
drop policy if exists "Portfolio admins manage projects" on public.projects;
create policy "Portfolio admins manage projects" on public.projects
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Authenticated admins manage documents" on public.documents;
drop policy if exists "Portfolio admins manage documents" on public.documents;
create policy "Portfolio admins manage documents" on public.documents
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Authenticated admins manage contact submissions" on public.contact_submissions;
drop policy if exists "Portfolio admins manage contact submissions" on public.contact_submissions;
create policy "Portfolio admins manage contact submissions" on public.contact_submissions
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

drop policy if exists "Authenticated admins manage visitors" on public.visitors;
drop policy if exists "Portfolio admins manage visitors" on public.visitors;
create policy "Portfolio admins manage visitors" on public.visitors
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

-- Visitors may still increment and read the public counter under its existing policies.
drop policy if exists "Authenticated admins upload portfolio images" on storage.objects;
drop policy if exists "Authenticated admins update portfolio images" on storage.objects;
drop policy if exists "Authenticated admins delete portfolio images" on storage.objects;
drop policy if exists "Authenticated admins manage portfolio documents" on storage.objects;
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

create policy "Portfolio admins upload portfolio images" on storage.objects
    for insert to authenticated with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Portfolio admins update portfolio images" on storage.objects
    for update to authenticated using (bucket_id = 'portfolio-images' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Portfolio admins delete portfolio images" on storage.objects
    for delete to authenticated using (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
create policy "Portfolio admins manage portfolio documents" on storage.objects
    for all to authenticated using (bucket_id = 'portfolio-documents' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-documents' and public.is_portfolio_admin());
create policy "Portfolio admins upload certificate files" on storage.objects
    for insert to authenticated with check (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());
create policy "Portfolio admins update certificate files" on storage.objects
    for update to authenticated using (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin())
    with check (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());
create policy "Portfolio admins delete certificate files" on storage.objects
    for delete to authenticated using (bucket_id = 'portfolio-certificate-files' and public.is_portfolio_admin());

-- After running this script, uncomment and run this statement with your account email.
-- It should insert exactly one row. The account must already exist under Authentication -> Users.
-- insert into public.portfolio_admins (user_id)
-- select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL')
-- on conflict (user_id) do nothing;
