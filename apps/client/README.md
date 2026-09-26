# Client app (pet owner side)

PawPlan is the pet-owner website. A dog owner enters a profile, passes an emergency check, reports symptoms, and sees a demo urgency level next to the full 1–4 scale. Madison ZIP codes show published clinic prices with their sources. Other ZIP codes are not given Madison prices. Financial-assistance links are real Madison and Wisconsin programs. Appointment times are samples and are not sent to a clinic.

## Run

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765.

```bash
node --test care.test.js
```

This is a static site (HTML, CSS, and JavaScript modules). It does not use the Vite setup in `apps/vet`, and it does not connect to a backend. Chat with a vet and live booking are still planned.
