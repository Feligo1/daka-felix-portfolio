begin;

create table if not exists public.showcase_projects (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title text not null check (length(trim(title)) between 1 and 160),
    summary text not null check (length(trim(summary)) between 1 and 500),
    category text not null check (length(trim(category)) between 1 and 80),
    status text not null default 'Design' check (status in ('Design', 'In progress', 'Prototype', 'Completed')),
    overview text not null default '',
    problem text not null default '',
    objectives text[] not null default '{}',
    technologies text[] not null default '{}',
    features text[] not null default '{}',
    outcomes text not null default '',
    github_url text check (github_url ~ '^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$'),
    featured boolean not null default false,
    display_order integer not null default 0,
    published_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.showcase_media (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.showcase_projects(id) on delete cascade,
    kind text not null check (kind in ('image', 'video', 'youtube')),
    path text unique,
    youtube_id text,
    description text not null check (length(trim(description)) between 1 and 300),
    display_order integer not null default 0,
    check (
        (kind = 'youtube' and path is null and youtube_id is not null and youtube_id ~ '^[A-Za-z0-9_-]{11}$')
        or (youtube_id is null and path is not null
            and (
                (kind = 'image' and path ~ ('^' || project_id::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$'))
                or (kind = 'video' and path ~ ('^' || project_id::text || '/[0-9a-f-]{36}[.](mp4|webm)$'))
            ))
    )
);

create index if not exists showcase_public_order
    on public.showcase_projects (featured desc, display_order, published_at desc, id)
    where published_at is not null;
create index if not exists showcase_media_project_order
    on public.showcase_media (project_id, display_order, id);

alter table public.showcase_projects enable row level security;
alter table public.showcase_media enable row level security;

grant select on public.showcase_projects, public.showcase_media to anon;
grant select, insert, update, delete on public.showcase_projects, public.showcase_media to authenticated;

create policy "Read published showcase projects" on public.showcase_projects
    for select to anon, authenticated using (published_at <= now());
create policy "Admins manage showcase projects" on public.showcase_projects
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create policy "Read published showcase media" on public.showcase_media
    for select to anon, authenticated using (exists (
        select 1 from public.showcase_projects p where p.id = project_id and p.published_at <= now()
    ));
create policy "Admins manage showcase media" on public.showcase_media
    for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('showcase-media', 'showcase-media', false, 20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);

create policy "Read published showcase files" on storage.objects
    for select to anon, authenticated using (
        bucket_id = 'showcase-media' and exists (
            select 1 from public.showcase_media m
            join public.showcase_projects p on p.id = m.project_id
            where m.path = storage.objects.name and p.published_at <= now()
        )
    );
create policy "Admins read showcase files" on storage.objects
    for select to authenticated using (bucket_id = 'showcase-media' and public.is_portfolio_admin());
create policy "Admins upload showcase files" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'showcase-media' and public.is_portfolio_admin() and exists (
            select 1 from public.showcase_projects p
            where split_part(storage.objects.name, '/', 1) = p.id::text
              and storage.objects.name ~ ('^' || p.id::text || '/[0-9a-f-]{36}[.](jpg|png|webp|mp4|webm)$')
        )
    );
create policy "Admins remove showcase files" on storage.objects
    for delete to authenticated using (bucket_id = 'showcase-media' and public.is_portfolio_admin());

insert into public.showcase_projects
    (slug, title, summary, category, status, overview, problem, objectives, featured, published_at)
values (
    'farmers-market-information-platform',
    'Cloud-Based Market Information Platform for Farmers',
    'A final-year project designed to give Zambian farmers access to commodity market prices and demand forecasts.',
    'Agriculture',
    'Design',
    'The project proposes a cloud-based platform that brings together commodity market information and demand forecasts for Zambian farmers.',
    'Farmers need accessible information about commodity prices and expected demand when deciding what to sell and when.',
    array['Make commodity market prices easier to find.', 'Present demand forecasts to support sales planning.'],
    true,
    now()
);

commit;
