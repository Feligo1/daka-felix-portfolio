-- Run after supabase-admin-role.sql (or the updated supabase-setup.sql) to enable PDF and Word certificate uploads.
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

drop policy if exists "Public can view certificate files" on storage.objects;
drop policy if exists "Authenticated admins upload certificate files" on storage.objects;
drop policy if exists "Authenticated admins update certificate files" on storage.objects;
drop policy if exists "Authenticated admins delete certificate files" on storage.objects;

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
