begin;

create table public.about_gallery (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(trim(title)) between 1 and 120),
    category text not null check (category in ('Graduation', 'At Work', 'Personal', 'Events')),
    photo_date date,
    description text not null default '' check (length(description) <= 1000),
    alt_text text not null check (length(trim(alt_text)) between 1 and 300),
    display_order integer not null default 0,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    width integer not null check (width between 1 and 1600),
    height integer not null check (height between 1 and 1600)
);

create index about_gallery_public_order on public.about_gallery (display_order, created_at desc, id)
    where published_at is not null;

alter table public.about_gallery enable row level security;
grant select on public.about_gallery to anon;
grant select, insert, update, delete on public.about_gallery to authenticated;

create policy "Read published About photos" on public.about_gallery
    for select to anon, authenticated using (published_at <= now());
create policy "Admins manage About photos" on public.about_gallery
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('about-gallery', 'about-gallery', false, 5242880, array['image/webp']);

create policy "Read published About photo files" on storage.objects
    for select to anon, authenticated using (
        bucket_id = 'about-gallery' and exists (
            select 1 from public.about_gallery g
            where storage.objects.name = g.id::text || '.webp' and g.published_at <= now()
        )
    );
create policy "Admins read About photo files" on storage.objects
    for select to authenticated using (bucket_id = 'about-gallery' and public.is_portfolio_admin());
create policy "Admins upload About photo files" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'about-gallery' and public.is_portfolio_admin()
        and storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
    );
create policy "Admins remove About photo files" on storage.objects
    for delete to authenticated using (bucket_id = 'about-gallery' and public.is_portfolio_admin());

commit;
