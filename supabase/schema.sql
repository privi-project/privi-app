-- Privi App schema addition — run this once in the Supabase SQL Editor
-- (Project > SQL Editor > New query, paste, Run), AFTER
-- website/supabase/schema.sql and admin-portal/supabase/schema.sql have
-- already been applied to this project.
--
-- This is the SAME Supabase project as website/ and admin-portal/
-- (see ../PRIVI_Backend_Schema_Reference.md). This file only ADDS to that
-- schema — it never touches public.profiles, public.businesses,
-- public.offers, public.categories, public.notifications, or any
-- website/admin-portal-owned table or trigger.

-- Member favourites (Privi_updated.docx / PRIVI_Screen_Rules.docx
-- "Favourites Page": members save businesses they want to find again;
-- also serves as the implicit interest signal in place of a separate
-- interests picker — see PRIVI_Backend_Schema_Reference.md's
-- "No interest tracking" decision). One row per member+business.
--
-- RLS: a member can only see/create/delete their own favourites — no
-- service_role-only pattern needed here since this is purely
-- member-owned data, same shape as public.profiles.
create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, business_id)
);

alter table public.favourites enable row level security;

create policy "Members can view their own favourites"
  on public.favourites for select
  using (auth.uid() = member_id);

create policy "Members can add their own favourites"
  on public.favourites for insert
  with check (auth.uid() = member_id);

create policy "Members can remove their own favourites"
  on public.favourites for delete
  using (auth.uid() = member_id);

create index if not exists favourites_member_id_idx on public.favourites (member_id);
create index if not exists favourites_business_id_idx on public.favourites (business_id);
