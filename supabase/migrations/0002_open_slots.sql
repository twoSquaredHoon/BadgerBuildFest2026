-- BadgerBuildFest2026: automatic open appointment slots for every vet.
-- Run once in Supabase: SQL Editor → New query → paste this whole file → Run.
-- (Run 0001_init.sql first. This file is safe to run again.)
--
-- Every vet is open Mon–Fri, 9:00 AM – 5:00 PM, in 30-minute slots (Madison time).
-- A slot is open unless a booking that is `pending` or `accepted` covers it.
-- Nothing is stored per slot: open_slots() works them out from the hours below.

-- ───────────────────────── Working hours (per vet, with defaults) ─────────────────────────

alter table public.vets
  add column if not exists open_days    smallint[] not null default '{1,2,3,4,5}',  -- ISO weekdays: 1 = Mon … 7 = Sun
  add column if not exists open_hour    numeric    not null default 9,              -- 9 = 9:00 AM
  add column if not exists close_hour   numeric    not null default 17,             -- 17 = 5:00 PM (last slot starts 4:30)
  add column if not exists slot_minutes int        not null default 30;

-- ───────────────────────── Clinic list is public ─────────────────────────
-- The owner app shows clinics before anyone signs in.

drop policy if exists "vets: anyone can read" on public.vets;
create policy "vets: anyone can read" on public.vets for select to anon using (true);

-- ───────────────────────── open_slots() ─────────────────────────
-- Open times for one vet (p_vet_id) or all vets (null), from today for p_days days.
-- Past times today are left out. Runs with owner rights so it can see bookings,
-- but only returns vet id + time, never who booked.
--
--   select * from open_slots();                     -- all vets, next 14 days
--   select * from open_slots('<vet id>', null, 7);  -- one vet, next 7 days
-- From the apps: supabase.rpc('open_slots', { p_vet_id, p_days })

create or replace function public.open_slots(p_vet_id uuid default null, p_from date default null, p_days int default 14)
returns table (vet_id uuid, date date, start numeric, duration numeric)
language sql stable security definer set search_path = public as $$
  with clock as (
    select (now() at time zone 'America/Chicago') as local_now
  ),
  days as (
    select g::date as day
    from clock,
         generate_series(coalesce(p_from, clock.local_now::date),
                         coalesce(p_from, clock.local_now::date) + (least(greatest(p_days, 1), 60) - 1),
                         interval '1 day') as g
  ),
  candidates as (
    select v.id as vet_id, d.day, s.start, (v.slot_minutes / 60.0)::numeric as duration
    from vets v
    cross join days d
    cross join lateral generate_series(v.open_hour, v.close_hour - v.slot_minutes / 60.0, v.slot_minutes / 60.0) as s(start)
    where (p_vet_id is null or v.id = p_vet_id)
      and extract(isodow from d.day)::smallint = any (v.open_days)
  )
  select c.vet_id, c.day, round(c.start, 2), round(c.duration, 2)
  from candidates c, clock
  where c.day + make_interval(mins => (c.start * 60)::int) > clock.local_now
    and not exists (
      select 1 from bookings b
      where b.vet_id = c.vet_id
        and b.date = c.day
        and b.status in ('pending', 'accepted')
        and b.start < c.start + c.duration
        and c.start < b.start + b.duration
    )
  order by c.vet_id, c.day, c.start;
$$;

grant execute on function public.open_slots(uuid, date, int) to anon, authenticated;

-- ───────────────────────── No double-booking ─────────────────────────
-- A new or moved booking can't overlap another pending/accepted booking with the same vet.

create or replace function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('pending', 'accepted') and exists (
    select 1 from bookings b
    where b.vet_id = new.vet_id
      and b.id <> new.id
      and b.date = new.date
      and b.status in ('pending', 'accepted')
      and b.start < new.start + new.duration
      and new.start < b.start + b.duration
  ) then
    raise exception 'That time is no longer available. Pick another slot.';
  end if;
  return new;
end $$;

drop trigger if exists bookings_check_slot on public.bookings;
create trigger bookings_check_slot before insert or update of date, start, duration, status, vet_id on public.bookings
  for each row execute function public.check_booking_slot();
