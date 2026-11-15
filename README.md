# Daka Felix Portfolio

Static portfolio with Supabase Postgres for content metadata and Supabase Storage for image and document files.

## Free Supabase setup

1. Open the portfolio project in Supabase and run [`supabase-setup.sql`](supabase-setup.sql) in **SQL Editor**. It creates the private documents bucket and metadata table, configures the public portfolio image bucket, and sets row-level security policies for this site.
2. In **Authentication → Users**, create your admin user with your email and a strong password. Disable public sign-ups in **Authentication → Settings**. The admin page now authenticates through Supabase Auth; it has no hard-coded password.
3. Run [`supabase-admin-role.sql`](supabase-admin-role.sql) in **SQL Editor**. At the bottom of that file, uncomment the `INSERT` statement, replace `YOUR_ADMIN_EMAIL` with the account email, and run it to grant that account the admin role. Only accounts in `portfolio_admins` can use `admin.html` or modify portfolio data.
4. Sign in at `admin.html`. Images are resized and converted to WebP before upload. Documents up to 20 MB are stored privately; only their metadata is in the database.

The SQL setup replaces row-level security policies on the portfolio's `site_settings`, `certificates`, `projects`, `visitors`, and `contact_submissions` tables. It also replaces policies on `storage.objects` so anonymous visitors can read public images but only authenticated admins can upload or delete files. If this Supabase project has other apps or buckets that rely on custom Storage policies, review that section before running it.

Supabase Free includes 1 GB of file storage and a 50 MB upload ceiling; this site limits individual uploads to 20 MB. Keep image uploads optimized and remove files you no longer need to stay within the free quota. [Supabase pricing](https://supabase.com/pricing)

## Certificate file uploads

For an existing Supabase setup, run [`supabase-admin-role.sql`](supabase-admin-role.sql) first, then [`supabase-certificate-files.sql`](supabase-certificate-files.sql) if certificate document storage has not already been configured. This enables PDF, DOC, and DOCX certificates. Certificate files are public so visitors can open them from the Certificates page. In `admin.html`, use the Certificates, Profile Image, and About Image tabs to upload certificate files and replace the site photos.
