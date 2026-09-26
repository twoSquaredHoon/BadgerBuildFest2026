# Vet app

The vet side of BadgerBuildFest2026: a mobile-first web app for solo vets.

- **Requests:** accept or decline booking requests from pet owners
- **Appointments:** month, week and day calendar views; add a visit to Apple Calendar
- **Patients:** dogs that have visited, with their past visits
- **Chat:** talk with owners about their dog's symptoms (accepted appointments only)

## Run

```bash
npm install
npm run dev        # http://localhost:8081, updates live as you edit
```

For a faster demo build: `npm run build` then `npm run serve`.

To open it on a phone with a QR code, see [../../docs/running-and-hosting.md](../../docs/running-and-hosting.md).

## Code

See [../../docs/architecture.md](../../docs/architecture.md) for the folder structure, routes, state and data model.

## Data

The app starts empty. Booking requests, appointments, patients and messages will come from the backend (Supabase, planned) once it is connected. Until then, there's nothing to show on any screen.
