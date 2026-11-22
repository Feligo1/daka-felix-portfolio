-- Portfolio newsroom v6: support genuine photo and video highlights in About.
-- Applied to live Supabase project pthcviwhcsluovdekjub on 22 Nov 2026.
-- Existing public.portfolio_gallery records, RLS policies and media are preserved.
ALTER TABLE public.portfolio_gallery
 ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.portfolio_gallery
 DROP CONSTRAINT IF EXISTS portfolio_gallery_media_type_check;
ALTER TABLE public.portfolio_gallery
 ADD CONSTRAINT portfolio_gallery_media_type_check
 CHECK(media_type IN ('image','video','external_video'));
ALTER TABLE public.portfolio_gallery
 DROP CONSTRAINT IF EXISTS portfolio_gallery_published_media_check;
ALTER TABLE public.portfolio_gallery
 ADD CONSTRAINT portfolio_gallery_published_media_check
 CHECK (NOT is_published OR length(trim(media_url)) > 0);
UPDATE storage.buckets
 SET file_size_limit=20971520,
     allowed_mime_types=ARRAY[
       'image/jpeg','image/png','image/webp','image/gif',
       'video/mp4','video/webm'
     ]
 WHERE id='portfolio-gallery';
-- Do not enable anonymous write access. Existing owner-only storage policies remain.
-- Public media buckets should only contain approved, non-private content.
