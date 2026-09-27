# PetVet

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Vet_App-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Dev_Server-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Owner_App-F7DF1E?logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_Realtime-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RLS_%2B_Triggers-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Price_Matching-8E75B2?logo=googlegemini&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Quick_Tunnel-F38020?logo=cloudflare&logoColor=white)

**Track: Health, Sustainability & Society** · Badger BuildFest 2026 (UW–Madison)

Dog owners see how urgent it is, what it costs nearby, and who can help pay, before the visit. Their vet gets the request with the budget attached.

> *"This is a pet healthcare crisis that requires urgent attention."*
> — Aimee Gilbreath, President, PetSmart Charities ([2025](https://petsmartcharities.org/press-releases/new-study-finds-more-than-half-of-u-s-pet-parents-skip-or-decline-needed-veterinary-care))

<p align="center">
  <img src="docs/demo-qr.png" alt="QR code for the PetVet demo" width="220"><br>
  <b>Scan to try the demo</b><br>
  <a href="https://inflation-players-fellowship-jane.trycloudflare.com/owner/#home">https://inflation-players-fellowship-jane.trycloudflare.com/owner/#home</a>
</p>

## Challenges

- **Cost-of-Care Conversation** — turns sticker shock into a shared decision: the vet sees the owner's budget and aid plan before recommending care.
- **Open Venture** — 52% of U.S. pet owners skip needed care, and nothing else connects the owner, the vet, and financial aid.

---

## 🩺 Diagnosis

Describe the symptoms, get an urgency level from 1 to 4, related conditions, and published prices from clinics near you.

<p align="center">
  <img src="docs/screenshots/home.png" alt="Owner home screen" width="260">
  <img src="docs/screenshots/my-plan.png" alt="My plan: urgency level, related conditions, estimated cost" width="260">
</p>

## 💸 Financial Aid

15 Wisconsin and national programs matched to your county, income, and urgency. Apply before you pay.

<p align="center">
  <img src="docs/screenshots/help-paying.png" alt="Help paying: matched aid programs" width="260">
  <img src="docs/screenshots/emergency-aid.png" alt="Paying for emergency care" width="260">
</p>

## 📅 Appointment Management

Owners request a time. Vets accept it live, see the budget, and manage their calendar, patients, and chat.

<p align="center">
  <img src="docs/screenshots/vet-appointment.png" alt="Vet appointment with urgency and the owner's budget" width="260">
</p>

---

## Run It

```bash
cd apps/vet
npm install
npm run dev        # http://localhost:8081 → Pet owner or Vet
```

First-time setup (Supabase migrations, anonymous sign-ins, `.env`): [docs/backend-setup.md](docs/backend-setup.md). Sharing to phones: [docs/running-and-hosting.md](docs/running-and-hosting.md).

## Tests

```bash
cd apps/client && node --test care.test.js aid.test.js live-prices.test.js
```

## Docs

[Architecture](docs/architecture.md) · [Backend setup](docs/backend-setup.md) · [Running and hosting](docs/running-and-hosting.md) · [Data](docs/data.md) · [PRD: owner app](docs/prd-client.md) · [PRD: vet app](docs/prd-vet.md)

## Team

Built at Badger BuildFest 2026 by:

- slee2238@wisc.edu
- tgraser@wisc.edu
- sheo9@wisc.edu
