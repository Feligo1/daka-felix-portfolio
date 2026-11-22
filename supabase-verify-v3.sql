-- Portfolio v2 deployment checks. Read-only queries for Supabase SQL Editor.
-- This checks actual database state; GitHub alone cannot provision storage.
select id as bucket, public, file_size_limit, array_to_string(allowed_mime_types,', ') as allowed_mime_types
from storage.buckets
where id in ('portfolio-images','portfolio-certificate-files','portfolio-documents','portfolio-project-media','portfolio-gallery','portfolio-journal-media')
order by id;

select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
and c.relname in ('portfolio_admins','portfolio_projects','portfolio_project_media','portfolio_gallery','portfolio_journal','portfolio_recommendations','site_settings','certificates','documents','projects')
order by c.relname;

select schemaname,tablename,policyname,roles,cmd
from pg_policies where
(schemaname='public' and tablename in ('portfolio_projects','portfolio_project_media','portfolio_gallery','portfolio_journal','portfolio_recommendations'))
or (schemaname='storage' and tablename='objects' and policyname like 'Portfolio v2%')
order by schemaname,tablename,policyname;

-- Expected new tables and buckets: projects, project_media, gallery, journal, recommendations;
-- portfolio-project-media, portfolio-gallery, portfolio-journal-media.
-- Verify anonymous users cannot insert/update/delete through the browser.
-- Keep portfolio-documents PRIVATE (public=false). Public buckets must contain approved, non-secret media.
