# Architecture

## Overview

```
 Pet owner's phone                      Vet's phone
 ┌──────────────────┐                   ┌──────────────────┐
 │  Client web app  │                   │   Vet web app    │
 │  (apps/client)   │                   │   (apps/vet)     │
 └────────┬─────────┘                   └────────┬─────────┘
          │     requests, bookings, messages     │
          └──────────────┐          ┌────────────┘
                         ▼          ▼
                 ┌──────────────────────────┐
                 │   Supabase               │
                 │  Postgres + Realtime     │
 │  Email sign-in (Auth)    │
                 │  Edge Function: triage   │
                 └──────────────────────────┘
```

- Both apps are **client-side rendered**: the phone's browser draws every screen. The backend only stores and sends data.
- A booking request made in the client app appears live on the vet's Requests screen (Supabase Realtime).
- AI triage will run in a Supabase Edge Function so the AI API key never ships to phones.

## Vet app (`apps/vet`)

### Stack

React 19 + TypeScript, built with Vite, routing with React Router. No UI library; styles live in `src/styles.css`.

### Folder structure

```
apps/vet/
├── index.html              HTML shell (phone viewport, title, icon)
├── .env.example          Supabase URL + key (copy to .env)
├── vite.config.ts          Dev/preview server on port 8081; allows *.trycloudflare.com
├── public/favicon.svg
└── src/
    ├── main.tsx            Entry point
    ├── App.tsx             Routes
    ├── styles.css          All styles
    ├── types/index.ts      Data types (Dog, Owner, BookingRequest, Appointment, Patient, Message)
    ├── store/
    │   ├── Auth.tsx        Email sign-in / sign-up, session, vet profile
    │   └── VetStore.tsx    Loads the vet's data from Supabase, live updates, actions
    ├── lib/
    │   ├── supabase.ts     Supabase client
    │   ├── dates.ts        Date/time helpers
    │   └── calendar.ts     "Add to Apple Calendar" (downloads an .ics invite)
    ├── components/
    │   ├── TabLayout.tsx   Header + bottom tab bar for the four main tabs
    │   ├── Toast.tsx       Short confirmation messages
    │   ├── ui.tsx          Shared pieces (Avatar, EmptyState, AppointmentRow, Segmented, DetailHeader…)
    │   └── icons.tsx       Inline SVG icons
    └── pages/
        ├── SignIn.tsx             Email + password (sign in or create account)
        ├── PracticeSetup.tsx      First sign-in: name, clinic, city
        ├── Requests.tsx           Booking requests (accept / decline)
        ├── Appointments.tsx       Calendar: month, week, day
        ├── Patients.tsx           Past patients
        ├── ChatList.tsx           Conversations (accepted appointments only)
        ├── AppointmentDetail.tsx  Dog info, chat, add to calendar, mark complete
        ├── PatientDetail.tsx      Dog info and past visits
        └── ChatThread.tsx         One conversation
```

### Routes

| Path | Screen | Tab bar |
|---|---|---|
| `/` | Booking requests | Yes |
| `/appointments` | Appointments calendar | Yes |
| `/patients` | Past patients | Yes |
| `/chat` | Conversations | Yes |
| `/appointment/:id` | Appointment detail | No (back button) |
| `/patient/:id` | Patient detail | No |
| `/chat/:id` | Conversation | No |

### State

Before any screen, `App.tsx` checks sign-in (`src/store/Auth.tsx`): signed out → **SignIn**, first sign-in → **PracticeSetup** (creates the `vets` row), otherwise the app.

`src/store/VetStore.tsx` loads the signed-in vet's bookings and messages, keeps them live with Supabase Realtime (and reloads when the phone comes back to the app), and exposes actions:

| Action | What it does |
|---|---|
| `acceptRequest(id)` | Sets the booking to `accepted`: it moves to Appointments and Chat opens |
| `declineRequest(id)` | Sets the booking to `declined` |
| `completeAppointment(id)` | Sets the booking to `completed`: it shows under Past patients |
| `addToCalendar(id)` | Downloads an `.ics` invite for Apple Calendar |
| `sendMessage(id, text)` | Inserts a message (the database fills in `sender`) |

Screens update right away and the change is saved in the background; if the save fails, it is undone and a message explains why.

### Data model

Defined in `src/types/index.ts`:

```ts
Dog            { name, breed, age, weight }
Owner          { name, phone }
BookingRequest { id, dog, owner, date (YYYY-MM-DD), start (hour, e.g. 9.5), duration (hours) }
Appointment    = BookingRequest
Patient        { id, dog, owner, visits: Visit[] }
Visit          { date, type }
Message        { id, from: 'vet' | 'owner', text, sentAt (ISO timestamp) }
VetProfile     { id, name, clinic, location }
```

## Client app (`apps/client`) — planned

Same stack as the vet app. Flow (see [prd-client.md](prd-client.md)):

1. Pet info → 2. Emergency check (Level 4 → 24 hr vet) → 3. Questionnaire → 4. AI triage (Level 1–3) → 5. Price estimate + financial aid → 6. Booking → 7. Chat (after the vet accepts)

## Backend (Supabase)

Set up: [backend-setup.md](backend-setup.md). Schema and rules: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

### Sign-in

Vets and owners both sign in with email and password (Supabase Auth; email confirmation turned off). Their row in `vets` or `owners` uses their sign-in id (`auth.uid()`).

### Tables

| Table | Columns |
|---|---|
| `vets` | id (= sign-in id), name, clinic, location |
| `owners` | id (= sign-in id), name, phone |
| `dogs` | id, owner_id, name, breed, age, weight |
| `bookings` | id, owner_id, dog_id, vet_id, date, start, duration, status, visit_type, triage_summary (JSON) |
| `messages` | id, booking_id, sender (`vet` / `owner`, set by the database), text, created_at |
| `cost_estimates` | condition, urgency (1–4), low, high, breakdown |

Past patients have no table of their own: they are the dogs with `completed` bookings, one visit per booking.

`bookings.status` drives the screens:

| Status | Shown on |
|---|---|
| `pending` | Vet: Requests |
| `accepted` | Vet: Appointments, Chat |
| `declined` | Owner is notified |
| `completed` | Vet: Past patients |
| `cancelled` | Owner cancelled |

### Access rules

Row level security: each vet sees only their bookings (and those dogs, owners and messages); each owner sees only their own. Triggers stop invalid changes (e.g. a vet can't change the time, chat only while `accepted`). Details in [backend-setup.md](backend-setup.md#how-the-pieces-fit).

### Realtime

`bookings` and `messages` are published, so new requests and chat messages appear without refreshing.

### Triage function (planned)

A Supabase Edge Function (`supabase/functions/triage/`) takes the questionnaire answers and returns an urgency level and possible causes. Data source: [data.md](data.md).
