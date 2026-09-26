# Backend setup (Supabase + email sign-in)

About 15 minutes, done once by one person. Everyone on the team then uses the same project.

What you end up with:

- A Postgres database with the tables in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
- Access rules: each vet sees only their own requests; each owner sees only their own dogs, bookings and chats
- Live updates: a booking made in the client app appears on the vet's phone without refreshing
- Email + password sign-in for vets and owners (accounts are stored by Supabase)

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign in (GitHub works), and click **New project**.
2. Name it `badgerbuildfest2026`, set a database password (save it somewhere), pick the region closest to Wisconsin (US East or US Central), and create it.
3. When it's ready, open **Project Settings → API Keys** (on older dashboards: **Project Settings → API**). Copy:
   - the **Project URL** (`https://<project-ref>.supabase.co`)
   - the **publishable key** (`sb_publishable_…`). If you only see "anon", that one works too.

   Never use the **secret** / **service_role** key in the apps. It skips every access rule.

## 2. Create the tables

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole contents of `supabase/migrations/0001_init.sql` and click **Run**. It should say "Success. No rows returned".
3. Check **Table Editor**: you should see `vets`, `owners`, `dogs`, `bookings`, `messages`, `cost_estimates`.

Run it only once. To start over (this deletes all app data), run this in the SQL Editor, then run the file again:

```sql
drop table if exists messages, bookings, dogs, owners, vets, cost_estimates cascade;
drop function if exists check_booking_dog, guard_booking_update, set_message_sender cascade;
```

## 3. Turn off email confirmation

By default Supabase emails a confirmation link before a new account can sign in. Turn that off so accounts work immediately:

1. **Authentication → Sign In / Providers → Email**.
2. Make sure **Enable Email provider** is on, turn **Confirm email** off, and click **Save**.

That's all. Accounts and passwords are stored by Supabase Auth (passwords are hashed, never saved in the app's tables). You can see them under **Authentication → Users**, and add one by hand there with **Add user → Create new user** (tick **Auto Confirm User**).

## 4. Connect the vet app

```bash
cd apps/vet
cp .env.example .env
```

Open `apps/vet/.env` and paste the URL and publishable key from step 1. Then restart the dev server (Vite reads `.env` only at start):

```bash
npm install     # picks up @supabase/supabase-js
npm run dev
```

Open http://localhost:8081 → **I'm a vet** → **New here? Create an account** (any email + a password of 6+ characters) → fill in **Set up your practice** (name, clinic, city). That creates your row in `vets`.

`.env` is committed to the repo, so teammates can run the app right after cloning. That's fine for these two values: the publishable key ships to every phone anyway, and the access rules protect the data. Never put the secret / service_role key or an AI API key in `.env`; those go in `.env.local`, which git ignores.

## 5. Try it before the client app exists

Make a fake owner and booking so a request shows up. Open **SQL Editor** and run this, replacing the email with the one you created your vet account with:

```sql
with me as (select id from auth.users where email = 'you@wisc.edu'),
     o as (insert into owners (id, name, phone) select id, 'Test Owner', '608-555-0100' from me
           on conflict (id) do update set name = excluded.name returning id),
     d as (insert into dogs (owner_id, name, breed, age, weight) select id, 'Biscuit', 'Labrador', '4 yrs', '60 lb' from o returning id, owner_id)
insert into bookings (owner_id, dog_id, vet_id, date, start, duration)
select d.owner_id, d.id, (select id from me), current_date + 1, 9.5, 0.5 from d;
```

(For this test, your one account is both the vet and the owner.) The request should pop up on the vet app's **Requests** screen right away, with a "New request" message. Accept it, then open **Chat**.

To test the live chat from the owner side, insert a message in the SQL editor. It shows up in the open chat without refreshing:

```sql
insert into messages (booking_id, sender, text)
select id, 'owner', 'Hi! He threw up twice this morning.' from bookings where status = 'accepted' limit 1;
```

## How the pieces fit

| Who | Signs in with | Their row | Can see |
|---|---|---|---|
| Vet (vet app) | Email + password | `vets` (created on the practice setup screen) | Their own bookings, plus the dogs, owners and messages on them |
| Owner (client app) | Email + password | `owners` (client app creates it, with phone) | Their own dogs, bookings and messages; the list of vets |
| Anyone, not signed in | — | — | `cost_estimates` only |

Rules the database enforces no matter what the app does:

- A booking must be for the owner's own dog, and owners can only create it as `pending`.
- Vets can only move `pending → accepted / declined` and `accepted → completed`, and can't change the time.
- Owners can only cancel, or move a still-pending booking to a new time.
- Chat messages can only be sent while a booking is `accepted`, and `sender` is filled in from who's signed in.

## Client app sign-in (when it's built)

Reuse the vet app's pieces: copy `src/lib/supabase.ts` and `.env`, and adapt `src/store/Auth.tsx` so it reads and writes `owners` instead of `vets` (ask for name and phone on first sign-in). Booking requests are then:

```ts
const { data: dog } = await supabase.from('dogs').insert({ name, breed, age, weight }).select().single();
await supabase.from('bookings').insert({ dog_id: dog.id, vet_id, date, start, duration, triage_summary });
```

`owner_id` fills itself in from the signed-in user.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Backend not connected" screen | `.env` is missing or misnamed, or the dev server wasn't restarted after editing it. |
| "Email not confirmed" or "Account created, but Supabase wants the email confirmed first" | Turn off **Confirm email** (step 3). For an account made before that, confirm it under **Authentication → Users**, or just create a new one. |
| "Invalid login credentials" | Wrong email or password. Passwords can be reset under **Authentication → Users**. |
| "Email rate limit exceeded" | Only happens while Confirm email is on. Turn it off (step 3). |
| Requests don't appear live | Check that `bookings` and `messages` are in the realtime list: **Database → Publications → supabase_realtime**. Switching away from the app and back also reloads everything. |
| "new row violates row-level security policy" | An access rule blocked it, e.g. sending a message before the booking is accepted. Working as intended. |
