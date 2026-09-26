# Backend setup (Supabase + Google sign-in)

About 15 minutes, done once by one person. Everyone on the team then uses the same project.

What you end up with:

- A Postgres database with the tables in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
- Access rules: each vet sees only their own requests; each owner sees only their own dogs, bookings and chats
- Live updates: a booking made in the client app appears on the vet's phone without refreshing
- **Continue with Google** sign-in for vets and owners

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

## 3. Set up Google sign-in

### 3a. Google Cloud (makes the "Sign in with Google" screen)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (e.g. `BadgerBuildFest2026`).
2. Open **Google Auth Platform** (on older consoles: **APIs & Services → OAuth consent screen**) and click **Get started**:
   - App name: the app's name. Support email: yours.
   - Audience: **External**.
   - Contact email: yours. Agree and create.
3. **Audience → Publish app.** Otherwise only emails you add as "test users" can sign in, and judges won't be able to. The app only asks for name and email, so Google doesn't need to review it.
4. **Clients → Create client**:
   - Application type: **Web application**
   - **Authorized redirect URIs → Add URI:** `https://<project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows this exact address in step 3b as "Callback URL". Copy it from there.)
   - Create, then copy the **Client ID** and **Client secret**.

### 3b. Supabase (turns Google on)

1. **Authentication → Sign In / Providers → Google**: turn it on, paste the Client ID and Client secret, and save.
2. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:8081`
   - **Redirect URLs → Add URL**, add each of these:
     - `http://localhost:8081/**`
     - `https://*.trycloudflare.com/**`

   The second one is why the tunnel works: a new tunnel address every restart is still allowed, and Google always sends people to Supabase's fixed callback address first.

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

Open http://localhost:8081 → **Continue with Google** → fill in **Set up your practice** (name, clinic, city). That creates your row in `vets`.

`.env` is committed to the repo, so teammates can run the app right after cloning. That's fine for these two values: the publishable key ships to every phone anyway, and the access rules protect the data. Never put the secret / service_role key or an AI API key in `.env`; those go in `.env.local`, which git ignores.

## 5. Try it before the client app exists

Make a fake owner and booking so a request shows up. Open **SQL Editor** and run this, replacing the email with the Google account you signed into the vet app with:

```sql
with me as (select id from auth.users where email = 'you@wisc.edu'),
     o as (insert into owners (id, name, phone) select id, 'Test Owner', '608-555-0100' from me
           on conflict (id) do update set name = excluded.name returning id),
     d as (insert into dogs (owner_id, name, breed, age, weight) select id, 'Biscuit', 'Labrador', '4 yrs', '60 lb' from o returning id, owner_id)
insert into bookings (owner_id, dog_id, vet_id, date, start, duration)
select d.owner_id, d.id, (select id from me), current_date + 1, 9.5, 0.5 from d;
```

(For this test, your one Google account is both the vet and the owner.) The request should pop up on the vet app's **Requests** screen right away, with a "New request" message. Accept it, then open **Chat**.

To test the live chat from the owner side, insert a message in the SQL editor. It shows up in the open chat without refreshing:

```sql
insert into messages (booking_id, sender, text)
select id, 'owner', 'Hi! He threw up twice this morning.' from bookings where status = 'accepted' limit 1;
```

## How the pieces fit

| Who | Signs in with | Their row | Can see |
|---|---|---|---|
| Vet (vet app) | Google | `vets` (created on the practice setup screen) | Their own bookings, plus the dogs, owners and messages on them |
| Owner (client app) | Google | `owners` (client app creates it, with phone) | Their own dogs, bookings and messages; the list of vets |
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
| Google says `redirect_uri_mismatch` | The redirect URI in Google Cloud must be exactly Supabase's callback URL (step 3a.4). |
| After Google, you land on `localhost:3000` or the wrong address | Add the address you opened the app from to **Redirect URLs** (step 3b.2). |
| Google says "Access blocked: app has not completed verification" or only test users can sign in | Publish the app (step 3a.3). |
| Google says `disallowed_useragent` on a phone | The QR code was opened inside another app's browser (Instagram, KakaoTalk…). Open the link in Safari or Chrome. |
| Requests don't appear live | Check that `bookings` and `messages` are in the realtime list: **Database → Publications → supabase_realtime**. Switching away from the app and back also reloads everything. |
| "new row violates row-level security policy" | An access rule blocked it, e.g. sending a message before the booking is accepted. Working as intended. |
