# BadgerBuildFest2026

A two-sided web app for **Badger BuildFest 2026** (UW–Madison), Health, Sustainability & Society track.

- **Pet owners (client app):** describe their dog's symptoms, get an urgency level and a likely cost range *before* the visit, find financial aid, and book a vet.
- **Vets (vet app):** solo vets starting their own practice receive booking requests, manage appointments, keep a list of past patients, and chat with owners.

> One-line pitch: *We turn a scary, surprise vet bill into a planned conversation.*

Both apps are **mobile-first web apps**. Anyone opens them from a link or QR code in their phone's browser, with nothing to install.

## Status

| Part | Status |
|---|---|
| Vet app (`apps/vet`) | Built. Email sign-in, live data from Supabase. |
| Client app (`apps/client`) | Built as PawPlan, a static website. Symptom check, urgency scale, and source-backed Madison prices work in the browser. Booking times are samples and are not sent to a clinic. |
| Backend | Supabase schema, access rules and realtime written ([setup guide](docs/backend-setup.md)). Triage function not started. |

## Project structure

```
BadgerBuildFest2026/
├── apps/
│   ├── vet/        Vet side web app (Vite + React + TypeScript)
│   └── client/     Pet owner website (PawPlan, static HTML/CSS/JS)
├── supabase/
│   └── migrations/0001_init.sql   Tables, access rules, realtime
├── data/
│   └── dog_disease_prediction.xlsx   Symptom → disease sample data for triage
├── docs/
│   ├── architecture.md          How the apps are built and how they connect
│   ├── backend-setup.md         Create the Supabase project and sign-in
│   ├── running-and-hosting.md   Run locally and share with a QR code
│   ├── data.md                  About the triage dataset
│   ├── prd-client.md            Product requirements: pet owner app
│   └── prd-vet.md               Product requirements: vet app
└── README.md
```

## Vet app (`apps/vet`)

The vet side: a mobile-first web app for solo vets.

- **Requests:** accept or decline booking requests from pet owners
- **Appointments:** month, week and day calendar views; add a visit to Apple Calendar
- **Patients:** dogs that have visited, with their past visits
- **Chat:** talk with owners about their dog's symptoms (accepted appointments only)

### Run

Requires **Node.js 20.19 or newer**.

First set up the backend once: [docs/backend-setup.md](docs/backend-setup.md) (Supabase project, sign-in), then copy `apps/vet/.env.example` to `apps/vet/.env` and fill in the two values.

```bash
cd apps/vet
npm install
npm run dev        # http://localhost:8081, updates live as you edit
```

For a faster demo build: `npm run build` then `npm run serve`. To open it on a phone with a QR code, see [docs/running-and-hosting.md](docs/running-and-hosting.md).

### Data

Vets sign in with email and password. Booking requests, appointments, patients and messages come from Supabase and update live.

## Client app (`apps/client`) — PawPlan

The pet-owner website. A dog owner enters a profile, passes an emergency check, reports symptoms, and sees a demo urgency level next to the full 1–4 scale. Madison ZIP codes show published clinic prices with their sources. Other ZIP codes are not given Madison prices. Financial-assistance links are real Madison and Wisconsin programs. Appointment times are samples and are not sent to a clinic.

### Run

Open both sides from the vet app. The start screen has **Pet owner** and **Vet**.

```bash
cd apps/vet
npm install
npm run dev                    # http://localhost:8081
```

Pet owner opens at http://localhost:8081/owner/. **Switch side** returns to the start screen. Live prices use `POST /api/prices` on this same server. Put a Gemini key in `apps/client/.env` (see `.env.example`). The key stays on the server and is not committed. A price is kept only when that exact amount is printed on the clinic page.

```bash
cd apps/client
node --test care.test.js live-prices.test.js
```

Without the key, prices still come from the page text. If the clinic sites cannot be read, the plan shows no dollar amount instead of the stored catalog. Chat with a vet and live booking are still planned.

## Code

See [docs/architecture.md](docs/architecture.md) for the folder structure, routes, state and data model.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Styling:** plain CSS (`apps/vet/src/styles.css`), phone-width layout
- **Hosting (demo):** served from a laptop and shared through a free Cloudflare quick tunnel
- **Backend:** Supabase (Postgres database, email sign-in, realtime updates); AI triage Edge Function planned

## Documentation

- [Architecture](docs/architecture.md)
- [Backend setup](docs/backend-setup.md)
- [Running and hosting](docs/running-and-hosting.md)
- [Triage dataset](docs/data.md)
- [PRD: pet owner app](docs/prd-client.md)
- [PRD: vet app](docs/prd-vet.md)
