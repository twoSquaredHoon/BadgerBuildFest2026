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
                 │   Supabase (planned)     │
                 │  Postgres + Realtime     │
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
├── vite.config.ts          Dev/preview server on port 8081; allows *.trycloudflare.com
├── public/favicon.svg
└── src/
    ├── main.tsx            Entry point
    ├── App.tsx             Routes
    ├── styles.css          All styles
    ├── types/index.ts      Data types (Dog, Owner, BookingRequest, Appointment, Patient, Message)
    ├── store/VetStore.tsx  App state and actions (React context)
    ├── lib/
    │   ├── dates.ts        Date/time helpers
    │   └── calendar.ts     "Add to Apple Calendar" (downloads an .ics invite)
    ├── components/
    │   ├── TabLayout.tsx   Header + bottom tab bar for the four main tabs
    │   ├── Toast.tsx       Short confirmation messages
    │   ├── ui.tsx          Shared pieces (Avatar, EmptyState, AppointmentRow, Segmented, DetailHeader…)
    │   └── icons.tsx       Inline SVG icons
    └── pages/
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

`src/store/VetStore.tsx` holds everything in React state and exposes actions:

| Action | What it does |
|---|---|
| `acceptRequest(id)` | Moves a request to appointments and opens a chat thread |
| `declineRequest(id)` | Removes the request (owner is told to pick another time or clinic) |
| `completeAppointment(id)` | Removes the appointment and adds a visit to Past patients |
| `addToCalendar(id)` | Downloads an `.ics` invite for Apple Calendar |
| `sendMessage(id, text)` | Adds a vet message to the conversation |

State starts **empty**. When the backend is added, the store loads from Supabase and each action writes to it; the screens don't need to change.

### Data model

Defined in `src/types/index.ts`:

```ts
Dog            { name, breed, age, weight }
Owner          { name, phone }
BookingRequest { id, dog, owner, date (YYYY-MM-DD), start (hour, e.g. 9.5), duration (hours) }
Appointment    = BookingRequest
Patient        { id, dog, owner, visits: Visit[] }
Visit          { date, type }
Message        { from: 'vet' | 'owner', text, sentAt (ISO timestamp) }
```

## Client app (`apps/client`) — planned

Same stack as the vet app. Flow (see [prd-client.md](prd-client.md)):

1. Pet info → 2. Emergency check (Level 4 → 24 hr vet) → 3. Questionnaire → 4. AI triage (Level 1–3) → 5. Price estimate + financial aid → 6. Booking → 7. Chat (after the vet accepts)

## Backend — planned (Supabase)

### Tables

| Table | Columns |
|---|---|
| `vets` | id, name, clinic, location |
| `owners` | id, name, phone |
| `dogs` | id, owner_id, name, breed, age, weight |
| `bookings` | id, dog_id, vet_id, date, start, duration, status, triage_summary |
| `messages` | id, booking_id, sender (`vet` / `owner`), text, created_at |

`bookings.status` drives the vet screens:

| Status | Shown on |
|---|---|
| `pending` | Requests |
| `accepted` | Appointments, Chat |
| `declined` | (owner is notified) |
| `completed` | Past patients |

### Realtime

Subscribe to `bookings` and `messages` so new requests and chat messages appear without refreshing.

### Triage function

A Supabase Edge Function (`supabase/functions/triage/`) takes the questionnaire answers and returns an urgency level and possible causes. Data source: [data.md](data.md).
