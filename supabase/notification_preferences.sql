-- Privi App schema addition #3 — per-category notification preference
-- toggles for the Support & Settings page. Run in Supabase SQL Editor.
--
-- IMPORTANT: these columns are read/written by the App so the toggle UI
-- persists correctly, but nothing on the delivery side (get_my_notifications
-- in notifications_rpc.sql, or the Admin Portal's send flow) checks them
-- yet — a member switching "Special Offers" off will not yet stop receiving
-- that category. Wiring real enforcement touches both this RPC's WHERE
-- clause and the Admin Portal's audience logic, deliberately left for a
-- separate pass rather than guessed at here.
alter table public.profiles
  add column if not exists notify_new_businesses boolean not null default true,
  add column if not exists notify_special_offers boolean not null default true,
  add column if not exists notify_membership_updates boolean not null default true,
  add column if not exists notify_account_alerts boolean not null default true;
