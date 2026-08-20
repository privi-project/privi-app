-- Privi App schema addition #2 — notifications delivery ("middleman" RPC).
-- Run in Supabase SQL Editor after favourites migration (schema.sql).
--
-- public.notifications has zero RLS policies (service_role-only, see
-- admin-portal/supabase/schema.sql) — the app has no direct read access to
-- it. This function is the one sanctioned way in: it runs with elevated
-- privileges internally, but every row it returns is scoped to the calling
-- member's own auth.uid(), so a member can never see another member's
-- eligible notifications.

-- Preferred Area needs stored coordinates (not just postcode text) so this
-- function can do radius math in pure SQL without calling out to an
-- external geocoding API from inside Postgres. Populated by the App's
-- first-launch Preferred Area fallback form (already geocodes via
-- postcodes.io client-side before saving) — additive, nullable, never
-- touches the existing preferred_area text column or its consumers.
alter table public.profiles
  add column if not exists preferred_area_lat double precision,
  add column if not exists preferred_area_lng double precision;

-- Haversine distance in miles between two lat/lng points.
create or replace function public.haversine_miles(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable
as $$
  select 3958.8 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ))
$$;

-- Returns the notifications the CALLING member currently qualifies for,
-- applying the two-tier location rule from PRIVI_Backend_Schema_Reference.md:
--  - members with a stored Preferred Area are matched against it — NEVER
--    live GPS, even if they also have GPS enabled (targeting always uses
--    Preferred Area, per the shared architecture decision).
--  - members with no stored Preferred Area (GPS-only: granted live location
--    and skipped the fallback form) are matched against the live
--    coordinates passed in from the app at call time. Passing null simply
--    skips 'area' notifications for that fetch — no location history is
--    ever persisted for this path, by design.
-- 2026-08-20: adding requires_acknowledgement/document_url/action_label/
-- action_destination to the RETURNS TABLE below changes the function's
-- return type, which Postgres refuses under CREATE OR REPLACE ("cannot
-- change return type of existing function") — the old version has to be
-- dropped first.
drop function if exists public.get_my_notifications(double precision, double precision);

create or replace function public.get_my_notifications(
  live_lat double precision default null,
  live_lng double precision default null
)
returns table (
  id uuid,
  title text,
  body text,
  notification_type text,
  linked_business_id uuid,
  linked_offer_id uuid,
  sent_at timestamptz,
  requires_acknowledgement boolean,
  document_url text,
  action_label text,
  action_destination text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_plan text;
  v_complimentary boolean;
  v_pref_lat double precision;
  v_pref_lng double precision;
  v_notify_new_businesses boolean;
  v_notify_special_offers boolean;
begin
  if v_member_id is null then
    return; -- no session, no rows
  end if;

  select subscription_plan, is_complimentary, preferred_area_lat, preferred_area_lng,
         notify_new_businesses, notify_special_offers
    into v_plan, v_complimentary, v_pref_lat, v_pref_lng,
         v_notify_new_businesses, v_notify_special_offers
  from public.profiles
  where profiles.id = v_member_id;

  return query
  select n.id, n.title, n.body, n.notification_type,
         n.linked_business_id, n.linked_offer_id, n.sent_at,
         n.requires_acknowledgement, n.document_url, n.action_label, n.action_destination
  from public.notifications n
  where n.status = 'sent'
    and (n.expires_at is null or n.expires_at >= now())
    and (
      n.audience_type = 'all'
      or (n.audience_type = 'monthly' and v_plan = 'monthly')
      or (n.audience_type = 'annual' and v_plan = 'annual')
      or (n.audience_type = 'complimentary' and v_complimentary is true)
      or (n.audience_type = 'individual' and n.audience_member_id = v_member_id)
      or (
        n.audience_type = 'area'
        and n.audience_reference_business_id is not null
        and coalesce(v_pref_lat, live_lat) is not null
        and coalesce(v_pref_lng, live_lng) is not null
        and exists (
          select 1
          from public.business_locations bl
          where bl.business_id = n.audience_reference_business_id
            and bl.status = 'active'
            and bl.latitude is not null
            and bl.longitude is not null
            and public.haversine_miles(
                  coalesce(v_pref_lat, live_lat),
                  coalesce(v_pref_lng, live_lng),
                  bl.latitude, bl.longitude
                ) <= coalesce(n.audience_radius_miles, 20)
        )
      )
    )
    -- 2026-08-20: per-category preference enforcement, previously
    -- deliberately deferred (see notification_preferences.sql's own
    -- comment). account_alert/announcement/legacy general are never
    -- filtered — they're the "always delivered" categories by design
    -- (Account Alerts' locked toggle, Announcement's stated intent).
    and (
      n.notification_type in ('account_alert', 'announcement', 'general')
      or (n.notification_type in ('new_business', 'new_location')
          and coalesce(v_notify_new_businesses, true))
      or (n.notification_type in ('new_offer', 'offer_ending_soon')
          and coalesce(v_notify_special_offers, true))
    )
  order by n.sent_at desc;
end;
$$;

revoke all on function public.get_my_notifications(double precision, double precision) from public;
grant execute on function public.get_my_notifications(double precision, double precision) to authenticated;
