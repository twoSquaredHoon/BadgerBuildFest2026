-- BadgerBuildFest2026: tables, access rules (row level security) and realtime.
-- Run once in Supabase: Dashboard → SQL Editor → paste this whole file → Run.
--
-- Everyone signs in with Google. A signed-in person becomes a vet (vet app) or an
-- owner (client app) by creating their row in `vets` or `owners`; the row id is
-- their sign-in id (auth.uid()).

-- ───────────────────────── Tables ─────────────────────────

create table public.vets (
  id         uuid primary key default auth.uid() references auth.users on delete cascade,
  name       text not null,
  clinic     text not null,
  location   text not null default '',
  created_at timestamptz not null default now()
);

create table public.owners (
  id         uuid primary key default auth.uid() references auth.users on delete cascade,
  name       text not null,
  phone      text not null default '',
  created_at timestamptz not null default now()
);

create table public.dogs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.owners on delete cascade,
  name       text not null,
  breed      text not null default '',
  age        text not null default '',   -- shown as typed, e.g. "4 yrs"
  weight     text not null default '',   -- e.g. "25 lb"
  created_at timestamptz not null default now()
);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references public.owners on delete cascade,
  dog_id         uuid not null references public.dogs on delete cascade,
  vet_id         uuid not null references public.vets on delete cascade,
  date           date not null,
  start          numeric not null check (start >= 0 and start < 24),   -- hour of day, 9.5 = 9:30 AM
  duration       numeric not null default 0.5 check (duration > 0),   -- hours
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  visit_type     text not null default 'Office visit',
  triage_summary jsonb,          -- pet info, symptoms, urgency level, possible causes
  created_at     timestamptz not null default now()
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete cascade,
  sender     text not null check (sender in ('vet', 'owner')),   -- set automatically, see trigger below
  text       text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- Cost ranges for the price estimate screen (filled in from the triage dataset).
create table public.cost_estimates (
  condition  text primary key,
  urgency    int  not null check (urgency between 1 and 4),
  low        int  not null,
  high       int  not null,
  breakdown  jsonb
);

create index on public.dogs (owner_id);
create index on public.bookings (vet_id, status);
create index on public.bookings (owner_id);
create index on public.messages (booking_id, created_at);

-- ───────────────────────── Rules the database enforces ─────────────────────────

-- A booking must be for the owner's own dog.
create function public.check_booking_dog() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dogs where id = new.dog_id and owner_id = new.owner_id) then
    raise exception 'That dog does not belong to this owner';
  end if;
  return new;
end $$;

create trigger bookings_check_dog before insert or update of dog_id, owner_id on public.bookings
  for each row execute function public.check_booking_dog();

-- Who can change what on a booking:
--   vet:   pending → accepted / declined, accepted → completed. Nothing else.
--   owner: cancel a pending or accepted booking, or move a pending one to a new time.
create function public.guard_booking_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return new;   -- dashboard / service role: allow anything
  end if;

  if new.owner_id <> old.owner_id or new.vet_id <> old.vet_id or new.dog_id <> old.dog_id
     or new.triage_summary is distinct from old.triage_summary or new.created_at <> old.created_at then
    raise exception 'These booking fields cannot be changed';
  end if;

  if me = old.vet_id then
    if new.date <> old.date or new.start <> old.start or new.duration <> old.duration then
      raise exception 'Vets cannot change the booking time';
    end if;
    if not ((old.status = 'pending'  and new.status in ('accepted', 'declined'))
         or (old.status = 'accepted' and new.status = 'completed')
         or  old.status = new.status) then
      raise exception 'Vets cannot change a booking from % to %', old.status, new.status;
    end if;
  elsif me = old.owner_id then
    if new.visit_type <> old.visit_type then
      raise exception 'Owners cannot change the visit type';
    end if;
    if new.status <> old.status and not (old.status in ('pending', 'accepted') and new.status = 'cancelled') then
      raise exception 'Owners can only cancel a booking';
    end if;
    if (new.date <> old.date or new.start <> old.start or new.duration <> old.duration) and old.status <> 'pending' then
      raise exception 'Only pending bookings can be moved to a new time';
    end if;
  else
    raise exception 'Not your booking';
  end if;

  return new;
end $$;

create trigger bookings_guard_update before update on public.bookings
  for each row execute function public.guard_booking_update();

-- Fill in `sender` from who is signed in, so nobody can pretend to be the other side.
create function public.set_message_sender() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
begin
  select * into b from bookings where id = new.booking_id;
  if auth.uid() is null then
    return new;   -- dashboard / service role: keep the sender given
  elsif auth.uid() = b.vet_id then
    new.sender := 'vet';
  elsif auth.uid() = b.owner_id then
    new.sender := 'owner';
  else
    raise exception 'Not your conversation';
  end if;
  return new;
end $$;

create trigger messages_set_sender before insert on public.messages
  for each row execute function public.set_message_sender();

-- ───────────────────────── Access rules (row level security) ─────────────────────────

alter table public.vets           enable row level security;
alter table public.owners         enable row level security;
alter table public.dogs           enable row level security;
alter table public.bookings       enable row level security;
alter table public.messages       enable row level security;
alter table public.cost_estimates enable row level security;

-- vets: any signed-in person can see the clinic list; you edit only your own profile.
create policy "vets: signed-in can read" on public.vets for select to authenticated using (true);
create policy "vets: create own"         on public.vets for insert to authenticated with check (id = auth.uid());
create policy "vets: update own"         on public.vets for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- owners: you see yourself; a vet sees owners who booked with them.
create policy "owners: read own or my clients" on public.owners for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from public.bookings b where b.owner_id = owners.id and b.vet_id = auth.uid())
);
create policy "owners: create own" on public.owners for insert to authenticated with check (id = auth.uid());
create policy "owners: update own" on public.owners for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- dogs: owners manage their dogs; a vet sees dogs booked with them.
create policy "dogs: read own or my patients" on public.dogs for select to authenticated using (
  owner_id = auth.uid()
  or exists (select 1 from public.bookings b where b.dog_id = dogs.id and b.vet_id = auth.uid())
);
create policy "dogs: create own" on public.dogs for insert to authenticated with check (owner_id = auth.uid());
create policy "dogs: update own" on public.dogs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dogs: delete own" on public.dogs for delete to authenticated using (owner_id = auth.uid());

-- bookings: owner and vet on the booking can see it. Owners create pending requests.
-- Updates are allowed to both, and the guard trigger above limits what each side may change.
create policy "bookings: read mine" on public.bookings for select to authenticated using (
  owner_id = auth.uid() or vet_id = auth.uid()
);
create policy "bookings: owner requests" on public.bookings for insert to authenticated with check (
  owner_id = auth.uid() and status = 'pending'
);
create policy "bookings: owner or vet updates" on public.bookings for update to authenticated
  using (owner_id = auth.uid() or vet_id = auth.uid())
  with check (owner_id = auth.uid() or vet_id = auth.uid());

-- messages: only the two people on the booking. New messages only while the booking is accepted.
create policy "messages: read my conversations" on public.messages for select to authenticated using (
  exists (select 1 from public.bookings b
          where b.id = messages.booking_id and (b.owner_id = auth.uid() or b.vet_id = auth.uid()))
);
create policy "messages: send in accepted bookings" on public.messages for insert to authenticated with check (
  exists (select 1 from public.bookings b
          where b.id = messages.booking_id and b.status = 'accepted'
            and (b.owner_id = auth.uid() or b.vet_id = auth.uid()))
);

-- cost_estimates: readable by anyone, even before sign-in.
create policy "cost_estimates: public read" on public.cost_estimates for select to anon, authenticated using (true);

-- ───────────────────────── Realtime ─────────────────────────
-- New requests, status changes and chat messages are pushed to open apps.
-- Realtime respects the access rules above, so each person only gets their own rows.

alter publication supabase_realtime add table public.bookings, public.messages;
