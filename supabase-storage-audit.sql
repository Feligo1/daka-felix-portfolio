-- Read-only inventory for the Supabase SQL Editor. Run each result set together.
-- Compare Storage policies with the migration files, including any unscoped policies.
with expected(bucket_id, is_public, max_bytes, mime_types) as (
    values
        ('portfolio-images', true, 20971520, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
        ('portfolio-certificate-files', true, 20971520, array[
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
        ('portfolio-documents', false, 20971520, array[
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv', 'text/markdown', 'application/rtf']),
        ('showcase-media', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
        ('about-gallery', false, 5242880, array['image/webp']),
        ('journal-images', false, 5242880, array['image/webp'])
)
select e.bucket_id,
       case
           when b.id is null then 'missing'
           when b.public is distinct from e.is_public then 'visibility mismatch'
           when b.file_size_limit is distinct from e.max_bytes then 'size limit mismatch'
           when coalesce(cardinality(b.allowed_mime_types), 0) = 0 then 'MIME allowlist missing'
           when not (b.allowed_mime_types @> e.mime_types and b.allowed_mime_types <@ e.mime_types) then 'MIME allowlist mismatch'
           else 'configured'
       end as result,
       b.public as actual_public, e.is_public as expected_public,
       b.file_size_limit as actual_max_bytes, e.max_bytes as expected_max_bytes,
       b.allowed_mime_types, e.mime_types as expected_mime_types
from expected e left join storage.buckets b on b.id = e.bucket_id
order by e.bucket_id;

with expected(table_name) as (
    values ('documents'), ('site_settings'), ('certificates'), ('projects'), ('visitors'),
           ('contact_submissions'), ('device_visits'), ('portfolio_admins'), ('showcase_projects'),
           ('showcase_media'), ('about_gallery'), ('journal_articles'), ('journal_images'), ('recommendations')
)
select e.table_name,
       case when c.oid is null then 'missing'
            when c.relrowsecurity then 'RLS enabled' else 'RLS disabled' end as result
from expected e
left join pg_class c on c.oid = to_regclass(format('public.%I', e.table_name))
order by e.table_name;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'storage' and tablename = 'objects')
   or (schemaname = 'public' and tablename in (
       'documents', 'portfolio_admins', 'showcase_projects', 'showcase_media',
       'about_gallery', 'journal_articles', 'journal_images', 'recommendations'))
order by schemaname, tablename, policyname;
