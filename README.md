# Felix Daka Portfolio

Static portfolio with Supabase Postgres for content metadata and Supabase Storage for image and document files.

The audit found duplicated Supabase client configuration, inconsistent branding, URL fields that needed scheme validation, and a legacy policy allowing public reads of document metadata marked public. This update uses a shared client and closes that metadata path. The navigation markup is present in each static route for GitHub Pages, with shared styles and menu behavior. Contact and service requests submit to FormSubmit. The older public visitor tally is approximate and separate from the device analytics shown in Admin.

## Portfolio pages

- `index.html` shows the recruiter summary and up to three published projects, prioritizing featured projects before filling the remaining slots.
- `about.html` contains the placement timeline and education details. `expertise.html` shows practical and academic skills and retains the service request form.
- `projects.html` provides filters and links to `project.html?project=<slug>`. Stable query-string links work on GitHub Pages without server-side rewrites.
- `certificates.html` shows seven course completions. The static course list is a snapshot of the public Supabase certificate records. When Supabase loads, its records drive the searchable list and document viewer.
- `contact.html` handles recruiter inquiries via the existing FormSubmit endpoint. Failed submissions keep the form values available for retry during the visit.
- `portfolio-refresh.css` and `portfolio-nav.js` provide the shared public styles and navigation. The portrait has a compressed WebP fallback while Supabase image overrides remain supported.

The approved PDF is currently missing. To enable downloads on Home, About and Contact, put the reviewed public PDF at `assets/documents/Felix_Daka_CV.pdf` and change `cvApproved` to `true` in `cv-download.js`. The button only appears when the asset responds as a PDF. Keep the NRC, references with private contact details, and other private documents out of the GitHub Pages checkout.

## Local preview and deployment

- Serve the repository over HTTP with Python 3 using `python -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`. ES modules require HTTP. There is no build step.
- For staging, configure the staging project URL and publishable key in `supabase-client.js`. The hosted public site uses relative paths under `/daka-felix-portfolio/`. Never use a service-role key in any static file.
- Back up and review the database and Storage before applying migrations. On a fresh database with the legacy tables, apply the baseline setup and admin role SQL first, then the showcase and About gallery migrations, then [`supabase-editorial-v1.sql`](supabase-editorial-v1.sql). On an established database apply only the missing migrations, in that order.
- Verify the production-bound Pages build in staging with an admin, a signed-in non-admin and a signed-out browser. Check direct article and project query links, signed media and drafts, Auth redirects, CV download, and real FormSubmit delivery. GitHub Actions publishes the repository root when approved changes land on `main`.

## Storage inventory

Run [`supabase-storage-audit.sql`](supabase-storage-audit.sql) in the Supabase SQL Editor before setup and after migrations. It checks six bucket names, visibility, limits, and MIME allowlists, then lists table RLS status and policies for review.

| Bucket | Purpose | Visibility | File limit |
| --- | --- | --- | --- |
| `portfolio-images` | Profile, About portrait and certificate images | Public | 20 MiB |
| `portfolio-certificate-files` | Approved certificate PDFs and Word files | Public | 20 MiB |
| `portfolio-documents` | Admin documents | Private | 20 MiB |
| `showcase-media` | Project photos and videos | Private, signed access for published projects | 20 MiB |
| `about-gallery` | About photo gallery | Private, signed access for published photos | 5 MiB |
| `journal-images` | Journal covers and screenshots | Private, signed access for published articles | 5 MiB |

Folder names within a bucket are object path prefixes. Uploads create them as needed. Recommendations and YouTube embeds require no bucket. The approved public CV is a GitHub Pages asset.

## Journal and recommendations

Use the **Journal** and **Recommendations** tabs in `admin.html` after applying the editorial migration. Journal drafts use stable slugs and support headings, lists, inline and fenced code, bold text and HTTPS references. Attach one cover and multiple screenshots as optimized WebP images. Preview drafts inside the admin. Publishing is manual and records the publication time. Recommendations require confirmation that the author approved public use of the text and attribution. Clearing approval unpublishes the recommendation. Both collections start empty.

The editorial migration also adds project architecture, challenges, lessons, proposed features and live demo fields. It closes anonymous access to legacy document metadata and leaves document records and files in place. Certificates retain their existing public-credential workflow and public certificate bucket. Use that bucket only for certificates approved for public viewing.

**Rollback:** Revert the static changes through a reviewed release first. To immediately hide editorial content while retaining it, set `published_at = null` in `journal_articles` and `recommendations` after exporting those rows if publication dates need to be restored. Existing signed image links may last up to 15 minutes. Keep the additive tables, columns and buckets for recovery. Restore a backup in staging before considering schema removal. Preserve the document privacy change unless an authorized replacement policy has been reviewed.

## About photo gallery setup

1. Run [`supabase-about-gallery.sql`](supabase-about-gallery.sql) once after the baseline Supabase setup and admin role migration. It adds the gallery metadata table and a private `about-gallery` bucket. It uses the existing portfolio admin allowlist. Keep only your account on that allowlist if you want sole publishing access.
2. Sign in at `admin.html` and open **About Gallery**. Upload a real JPEG, PNG or WebP, choose a category, and enter a title and meaningful alt text. Add a date and caption if known. The uploader converts the photo to WebP and caps the longest edge at 1600 pixels. The stored file limit is 5 MiB.
3. Save each photo as a draft, then publish from the photo list. Lower display-order numbers appear first. Use **About Image** to manage the biography portrait separately.
4. Published photos use signed URLs that can remain valid for up to 15 minutes after unpublishing. If storage cleanup fails after deleting a photo record, remove its reported file from the private bucket. A file without a published record cannot be signed by a public visitor.

Test the hosted gallery in staging with an admin, a signed-out visitor and a signed-in non-admin. Confirm that both visitor sessions can see published photos and have no access to drafts or write operations. The gallery starts empty and uses the checked-in portrait only for the hero.

## Project publishing setup

1. Apply [`supabase-showcase.sql`](supabase-showcase.sql) once in the Supabase SQL Editor after the existing setup and admin role scripts. The migration creates separate showcase project and media tables, a private media bucket, and a design-only seed for the farmers' project. The existing `projects` table continues to power Skills.
2. Sign in at `admin.html` with an account granted the existing portfolio admin role. Open **Projects**, fill out the editor, and save a draft. Use **Skills content** for the legacy technical area records.
3. Add descriptions and upload JPEG, PNG, WebP, MP4, or WebM files. The upload cap is 20 MiB per file, subject to your Supabase limits. For larger videos, an embeddable YouTube URL is supported. Use videos with captions when available. The first image by media order is the card cover.
4. Publish from the project list. Featured projects come first, followed by lower display order and newer publication time. Unpublish to remove public access. Already issued file URLs can remain usable for up to 15 minutes. Public YouTube visibility is controlled separately in YouTube.
5. If file cleanup fails after deleting or removing media, delete the unlinked object in **Storage → showcase-media** using the project UUID and file path. Unlinked objects are inaccessible to public visitors under the storage policy.

Verify the migration in a separate Supabase project before using it on production. Check that a signed-out visitor and a signed-in non-admin can read published projects and their signed media, cannot read drafts or sign their files, and cannot write records or upload. With an administrator, verify draft creation, editing, publishing, unpublishing, deletion, and media cleanup. Confirm the stack, implemented features, and any public evidence before adding those details to the farmers' case study.

## Free Supabase setup

1. Open the portfolio project in Supabase and run [`supabase-setup.sql`](supabase-setup.sql) in **SQL Editor**. It creates the private documents bucket and metadata table, configures the public portfolio image bucket, and sets row-level security policies for this site.
2. In **Authentication → Users**, create your admin user with your email and a strong password. Disable public sign-ups in **Authentication → Settings**. The admin page now authenticates through Supabase Auth; it has no hard-coded password.
3. Run [`supabase-admin-role.sql`](supabase-admin-role.sql) in **SQL Editor**. At the bottom of that file, uncomment the `INSERT` statement, replace `YOUR_ADMIN_EMAIL` with the account email, and run it to grant that account the admin role. Only accounts in `portfolio_admins` can use `admin.html` or modify portfolio data.
4. Sign in at `admin.html`. Images are resized and converted to WebP before upload. Documents up to 20 MB are stored privately; only their metadata is in the database.

The baseline setup replaces row-level security policies on the portfolio's `site_settings`, `certificates`, `projects`, `visitors`, and `contact_submissions` tables. It replaces only its named Storage policies and their legacy equivalents. Check other Storage policies separately, particularly permissive rules that allow writes or reads without a bucket condition.

Supabase Free includes 1 GB of file storage and a 50 MB upload ceiling; this site limits individual uploads to 20 MB. Keep image uploads optimized and remove files you no longer need to stay within the free quota. [Supabase pricing](https://supabase.com/pricing)

## Certificate file uploads

For an existing Supabase setup, run [`supabase-admin-role.sql`](supabase-admin-role.sql) first, then [`supabase-certificate-files.sql`](supabase-certificate-files.sql) if certificate document storage has not already been configured. This enables PDF, DOC, and DOCX certificates. Certificate files are public so visitors can open them from the Certificates page. In `admin.html`, use the Certificates, Profile Image, and About Image tabs to upload certificate files and replace the site photos.

## Anonymous visitor devices

For an existing Supabase setup, run [`supabase-device-visits.sql`](supabase-device-visits.sql) in **SQL Editor**. The public pages record one row per page per browser tab session with a random session ID, approximate device category, browser, operating system, and page path. They do not store names, email addresses, IP addresses, or the full browser user-agent string. Admins can view the latest records in the **Visitors** tab.
