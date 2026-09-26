# Client app (pet owner side) — not started yet

Requirements: [../../docs/prd-client.md](../../docs/prd-client.md)

Will be a mobile-first web app like `apps/vet` (Vite + React + React Router). Planned screens:

```
src/pages/
  PetInfo.tsx            1. Pet info (species, age, weight)
  EmergencyCheck.tsx     2. Emergency check
  EmergencyVet.tsx          Level 4: connect to a 24 hr vet
  Questionnaire.tsx      3. Symptom questionnaire
  Triage.tsx             4. AI triage result (Level 1–3)
  Estimate.tsx           5. Price estimate + financial aid (with triage summary)
  booking/
    ClinicList.tsx       6. Clinic list
    TimeSlots.tsx           Pick a time slot
    Review.tsx              Review + request booking
    Pending.tsx             Waiting for the vet to accept
    Confirmed.tsx           Confirmation
  Chat.tsx               Chat with the vet (after the booking is accepted)
```
