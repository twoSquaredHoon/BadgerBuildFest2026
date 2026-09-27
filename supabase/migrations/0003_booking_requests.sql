-- BadgerBuildFest2026: pet owners request a booking from the owner app.
-- Run once in Supabase: SQL Editor → New query → paste this whole file → Run.
-- (Run 0001 and 0002 first. This file is safe to run again.)
--
-- Also turn on: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
-- The owner app signs each phone in quietly (no email or password), so owners only
-- type their name and phone number. Those users count as `authenticated`, so every
-- access rule from 0001 applies to them: they only ever see their own bookings.

-- ───────────────────────── request_booking() ─────────────────────────
-- One call from the owner app does everything, all-or-nothing:
--   saves the owner's name + phone, reuses or adds the dog, and creates a `pending`
--   booking for that vet and time. The vet's Requests screen gets it live.
-- Returns the new booking row. Fails with a readable message if the time was just taken,
-- is outside the clinic's open hours, or has passed.

create or replace function public.request_booking(
  p_vet_id      uuid,
  p_date        date,
  p_start       numeric,
  p_owner_name  text,
  p_owner_phone text,
  p_dog_name    text,
  p_dog_breed   text  default '',
  p_dog_age     text  default '',
  p_dog_weight  text  default '',
  p_triage      jsonb default null
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := auth.uid();
  v      vets;
  dog_id uuid;
  b      bookings;
begin
  if me is null then
    raise exception 'Please sign in first';
  end if;
  if coalesce(trim(p_owner_name), '') = '' then
    raise exception 'Please enter your name';
  end if;

  select * into v from vets where id = p_vet_id;
  if not found then
    raise exception 'That clinic is no longer available';
  end if;

  insert into owners (id, name, phone)
  values (me, trim(p_owner_name), coalesce(trim(p_owner_phone), ''))
  on conflict (id) do update set name = excluded.name, phone = excluded.phone;

  -- Same owner + same dog name → same dog, so the vet's Past patients stays one entry per dog.
  select d.id into dog_id from dogs d
  where d.owner_id = me and lower(d.name) = lower(coalesce(nullif(trim(p_dog_name), ''), 'My dog'))
  order by d.created_at limit 1;

  if dog_id is null then
    insert into dogs (owner_id, name, breed, age, weight)
    values (me, coalesce(nullif(trim(p_dog_name), ''), 'My dog'), coalesce(p_dog_breed, ''), coalesce(p_dog_age, ''), coalesce(p_dog_weight, ''))
    returning id into dog_id;
  else
    update dogs set
      breed  = coalesce(nullif(p_dog_breed, ''), breed),
      age    = coalesce(nullif(p_dog_age, ''), age),
      weight = coalesce(nullif(p_dog_weight, ''), weight)
    where id = dog_id;
  end if;

  insert into bookings (owner_id, dog_id, vet_id, date, start, duration, triage_summary)
  values (me, dog_id, p_vet_id, p_date, p_start, round(v.slot_minutes / 60.0, 2), p_triage)
  returning * into b;

  return b;
end $$;

revoke execute on function public.request_booking(uuid, date, numeric, text, text, text, text, text, text, jsonb) from public, anon;
grant  execute on function public.request_booking(uuid, date, numeric, text, text, text, text, text, text, jsonb) to authenticated;

-- ───────────────────────── Slot checks (replaces the 0002 version) ─────────────────────────
-- Every new booking, or one moved to a new time, must be:
--   • inside the vet's open days and hours, on a slot boundary (9:00, 9:30, …)
--   • in the future (Madison time)
--   • not overlapping another pending/accepted booking with the same vet
-- Accepting / completing an old booking is always allowed.
-- Bookings added from the Supabase dashboard (no signed-in user) skip the hours check,
-- so test data can be made for any time.

create or replace function public.check_booking_slot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v vets;
  time_changed boolean := tg_op = 'INSERT'
    or new.date <> old.date or new.start <> old.start or new.duration <> old.duration or new.vet_id <> old.vet_id;
begin
  if new.status not in ('pending', 'accepted') then
    return new;
  end if;

  if time_changed and auth.uid() is not null then
    select * into v from vets where id = new.vet_id;
    if not (extract(isodow from new.date)::smallint = any (v.open_days)
            and new.start >= v.open_hour
            and new.start + new.duration <= v.close_hour
            and mod(round((new.start - v.open_hour) * 60), v.slot_minutes) = 0) then
      raise exception 'That time is outside the clinic''s open hours. Pick another slot.';
    end if;
    if new.date + make_interval(mins => round(new.start * 60)::int) <= (now() at time zone 'America/Chicago') then
      raise exception 'That time has already passed. Pick another slot.';
    end if;
  end if;

  if exists (
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
