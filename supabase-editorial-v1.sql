begin;

drop policy if exists "Public can read public documents" on public.documents;
revoke select on public.documents from anon;

alter table public.showcase_projects
    add column architecture text not null default '',
    add column challenges text not null default '',
    add column lessons text not null default '',
    add column proposed_features text[] not null default '{}',
    add column live_url text check (live_url ~ '^https://[^[:space:]]+$');

create table public.journal_articles (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title text not null check (length(trim(title)) between 1 and 160),
    summary text not null check (length(trim(summary)) between 1 and 500),
    topic text not null check (topic in ('Networking','Cybersecurity','Programming','Cloud','IT Support','Project Updates')),
    body text not null check (length(trim(body)) between 1 and 60000),
    reading_minutes integer generated always as (greatest(1,
        (cardinality(regexp_split_to_array(btrim(body), '[[:space:]]+')) + 199) / 200
    )) stored,
    tags text[] not null default '{}',
    published_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.journal_images (
    id uuid primary key default gen_random_uuid(),
    article_id uuid not null references public.journal_articles(id) on delete cascade,
    alt_text text not null check (length(trim(alt_text)) between 1 and 300),
    is_cover boolean not null default false,
    created_at timestamptz not null default now()
);

create unique index journal_one_cover on public.journal_images(article_id) where is_cover;
create index journal_image_article on public.journal_images(article_id, created_at, id);
create index journal_recent_public on public.journal_articles(published_at desc, id) where published_at is not null;

create table public.recommendations (
    id uuid primary key default gen_random_uuid(),
    person text not null check (length(trim(person)) between 1 and 120),
    role text not null check (length(trim(role)) between 1 and 120),
    organization text not null default '' check (length(organization) <= 160),
    quote text not null check (length(trim(quote)) between 1 and 3000),
    permission_confirmed boolean not null default false,
    display_order integer not null default 0,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    check (published_at is null or permission_confirmed)
);

alter table public.journal_articles enable row level security;
alter table public.journal_images enable row level security;
alter table public.recommendations enable row level security;

grant select on public.journal_articles, public.journal_images, public.recommendations to anon;
grant select, insert, update, delete on public.journal_articles, public.journal_images, public.recommendations to authenticated;

create policy "Read published journal articles" on public.journal_articles
    for select to anon, authenticated using (published_at <= now());
create policy "Administer journal articles" on public.journal_articles
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "Read published journal image metadata" on public.journal_images
    for select to anon, authenticated using (exists (
        select 1 from public.journal_articles a where a.id = article_id and a.published_at <= now()
    ));
create policy "Administer journal image metadata" on public.journal_images
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "Read approved recommendations" on public.recommendations
    for select to anon, authenticated using (permission_confirmed and published_at <= now());
create policy "Administer recommendations" on public.recommendations
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-images', 'journal-images', false, 5242880, array['image/webp']);

create policy "Read published journal files" on storage.objects
    for select to anon, authenticated using (
        bucket_id = 'journal-images' and exists (
            select 1 from public.journal_images i join public.journal_articles a on a.id = i.article_id
            where storage.objects.name = i.id::text || '.webp' and a.published_at <= now()
        )
    );
create policy "Admins read journal files" on storage.objects
    for select to authenticated using (bucket_id = 'journal-images' and public.is_portfolio_admin());
create policy "Admins upload journal files" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'journal-images' and public.is_portfolio_admin()
        and storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
    );
create policy "Admins remove journal files" on storage.objects
    for delete to authenticated using (bucket_id = 'journal-images' and public.is_portfolio_admin());

commit;
