# Portfolio v2: Admin & Supabase Setup

This branch extends the existing `admin.html` dashboard without replacing its current certificates, documents, profile images, visitor analytics, messages, legacy projects or Supabase authentication.

## Apply in this order

1. Back up the existing Supabase database, storage settings and policy definitions.
2. If the current site has **not** been initialized, follow `README.md` to run `supabase-setup.sql` and `supabase-admin-role.sql`, then grant your existing Supabase Auth account membership in `public.portfolio_admins`. **Do not rerun destructive policy replacement scripts on an established site without reviewing them.**
3. On your established project, open Supabase **SQL Editor**, paste `supabase-portfolio-v2.sql`, and run it. It is an additive migration with idempotent `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` and bucket `ON CONFLICT DO NOTHING`.
4. Inspect the resulting buckets and their visibility in **Storage**:
   - `portfolio-images`: public, legacy profile/about images
   - `portfolio-certificate-files`: public, existing published certificates
   - `portfolio-documents`: **private**, legacy documents
   - `portfolio-project-media`: public, published project media
   - `portfolio-gallery`: public, published career/graduation photos
   - `portfolio-journal-media`: public, published article illustrations
5. Open the admin page from a local server or deployed site and sign in as your authorized admin user.
6. Select **Storage Health**, then **Check storage & tables**. This checks database reads and storage listing permissions. It **does not** prove insert/update/delete policies work.
7. Open **Project Showcase**, **Photo Gallery**, **Journal** and **Recommendations** to create a draft or publish an entry. Upload media only to published entries because the configured media buckets are public.
8. For project demonstrations, publish a project first, then use **Project screenshots & demonstration videos** to add photographs, short MP4/WebM clips (20 MB limit) or safe YouTube embed URLs.

## Publishing rules

- Unpublished rows are not readable by visitors due to Row Level Security.
- **Public bucket objects themselves are not access-controlled by row publication state.** A draft file uploaded to a public bucket is directly accessible to anyone who knows its URL. Never upload secret/private material to public media buckets. The admin UI blocks new direct media uploads when an entry remains a draft.
- Existing `portfolio-documents` remains private. Public CV downloads use the reviewed, non-sensitive PDF committed to GitHub at `assets/documents/Felix_Daka_CV.pdf`.
- Recommendations must only be published when the referenced person has given permission. The database enforces `permission_confirmed` for published rows.
- Use only an authorized account in the `portfolio_admins` table. Do not enable permissive write policies for anonymous users.
- Storage and database permissions are enforced server-side by Supabase policies, **not** by hidden buttons or JavaScript checks alone.
- Do not upload an NRC, passports, private correspondence, or access credentials.

## Verification checklist

- Log in as admin; save, edit and delete draft entries.
- Confirm non-admin users cannot select drafts or write new entries.
- Confirm anonymous visitors see only published projects, journal articles, gallery images and recommendations.
- Upload an image to each public media bucket as admin, then confirm anonymous downloads are possible.
- Confirm anonymous and non-admin accounts cannot upload, overwrite or delete media.
- Confirm `portfolio-documents` has no anonymous downloads.
- Confirm YouTube embeds, image gallery and published project details work on the GitHub Pages subpath `/daka-felix-portfolio/`.
- Review video storage quotas and optimize media; for longer videos, embed YouTube rather than uploading large files.

## Deployment

This is a review branch. Do not merge into `main` until the SQL has been applied and the checks pass. The admin interface is still static HTML, CSS and JavaScript hosted on GitHub Pages, using Supabase Auth and Row Level Security for secured data mutations.

## Troubleshooting

If **Storage Health** shows `Cannot verify` or `Not ready`, inspect the exact message. Common causes: the migration was not run; the admin user lacks the `portfolio_admins` role; storage policies are missing; or the browser session expired.

A working public bucket URL does **not** prove uploads are authorized or that the bucket's admin listing policy is configured. Test both separately.
