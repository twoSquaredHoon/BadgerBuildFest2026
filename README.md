# BadgerBuildFest2026

A two-sided web app for **Badger BuildFest 2026** (UW–Madison), Health, Sustainability & Society track.

- **Pet owners (client app):** describe their dog's symptoms, get an urgency level and a likely cost range *before* the visit, find financial aid, and book a vet.
- **Vets (vet app):** solo vets starting their own practice receive booking requests, manage appointments, keep a list of past patients, and chat with owners.

> One-line pitch: *We turn a scary, surprise vet bill into a planned conversation.*

Both apps are **mobile-first web apps**. Anyone opens them from a link or QR code in their phone's browser, with nothing to install.

## Status

| Part | Status |
|---|---|
| Vet app (`apps/vet`) | Built. All screens work. Starts empty until the backend is connected. |
| Client app (`apps/client`) | Built as PawPlan, a static website. Symptom check, urgency scale, and source-backed Madison prices work in the browser. Booking times are samples and are not sent to a clinic. |
| Backend | Planned (Supabase). Not started. |

## Project structure

```
BadgerBuildFest2026/
├── apps/
│   ├── vet/        Vet side web app (Vite + React + TypeScript)
│   └── client/     Pet owner website (PawPlan, static HTML/CSS/JS)
├── data/
│   └── dog_disease_prediction.xlsx   Symptom → disease sample data for triage
├── docs/
│   ├── architecture.md          How the apps are built and how they connect
│   ├── running-and-hosting.md   Run locally and share with a QR code
│   ├── data.md                  About the triage dataset
│   ├── prd-client.md            Product requirements: pet owner app
│   └── prd-vet.md               Product requirements: vet app
└── README.md
```

## Quick start (vet app)

Requires **Node.js 20.19 or newer**.

```bash
cd apps/vet
npm install
npm run dev
```

Open http://localhost:8081. To open it on a phone from anywhere, see [docs/running-and-hosting.md](docs/running-and-hosting.md).

## Quick start (client app)

```bash
cd apps/client
python3 -m http.server 8765
```

Open http://127.0.0.1:8765. Tests: `node --test care.test.js`.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Styling:** plain CSS (`apps/vet/src/styles.css`), phone-width layout
- **Hosting (demo):** served from a laptop and shared through a free Cloudflare quick tunnel
- **Backend (planned):** Supabase (Postgres database, realtime updates, and an Edge Function for AI triage)

## Documentation

- [Architecture](docs/architecture.md)
- [Running and hosting](docs/running-and-hosting.md)
- [Triage dataset](docs/data.md)
- [PRD: pet owner app](docs/prd-client.md)
- [PRD: vet app](docs/prd-vet.md)
