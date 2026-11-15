-- Run once in Supabase SQL Editor to store anonymous device visit records.
create table if not exists public.device_visits (
    id bigint generated always as identity primary key,
    session_id text not null check (char_length(session_id) between 1 and 100),
    page_path text not null check (char_length(page_path) between 1 and 500),
    device_type text not null check (device_type in ('Phone', 'Tablet', 'Desktop')),
    browser text not null check (char_length(browser) <= 40),
    operating_system text not null check (char_length(operating_system) <= 40),
    visited_at timestamptz not null default now(),
    unique (session_id, page_path)
);

create index if not exists device_visits_visited_at_idx
    on public.device_visits (visited_at desc);

alter table public.device_visits enable row level security;
drop policy if exists "Public can record device visits" on public.device_visits;
drop policy if exists "Portfolio admins can view device visits" on public.device_visits;
create policy "Public can record device visits" on public.device_visits
    for insert to anon, authenticated with check (true);
create policy "Portfolio admins can view device visits" on public.device_visits
    for select to authenticated using (public.is_portfolio_admin());

grant insert on public.device_visits to anon, authenticated;
grant select on public.device_visits to authenticated;
grant usage, select on sequence public.device_visits_id_seq to anon, authenticated;
