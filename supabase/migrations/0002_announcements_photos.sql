-- Migration: Add Announcements & Guest Photos Tables + Storage Configurations

-- 1. Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  type text not null default 'info' check (type in ('info', 'alert', 'food', 'break')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Create guest_photos table
create table if not exists public.guest_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Enable Row Level Security (RLS)
alter table public.announcements enable row level security;
alter table public.guest_photos enable row level security;

-- 4. Create RLS Policies for announcements
create policy "public read announcements" 
  on public.announcements for select using (true);

create policy "admin write announcements" 
  on public.announcements for all
  using (auth.role() = 'authenticated') 
  with check (auth.role() = 'authenticated');

-- 5. Create RLS Policies for guest_photos
create policy "public read guest_photos" 
  on public.guest_photos for select using (true);

create policy "admin write guest_photos" 
  on public.guest_photos for all
  using (auth.role() = 'authenticated') 
  with check (auth.role() = 'authenticated');

-- 6. Setup Supabase Storage Bucket for "photos"
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 7. Storage Bucket Policies
create policy "Public Access to Photos" 
  on storage.objects for select 
  using (bucket_id = 'photos');

create policy "Authenticated Insert to Photos" 
  on storage.objects for insert 
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Authenticated Delete from Photos" 
  on storage.objects for delete 
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

-- 8. Enable Realtime Replication
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.guest_photos;
