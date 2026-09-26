# PRD: Pet Vet Cost Helper (working name TBD)

**Event:** Badger BuildFest 2026 (UW–Madison)
**Track:** Health, Sustainability & Society
**Also targeting:** Cost-of-Care Conversation challenge
**Status:** Draft v1, Sat Sept 26

---

## 1. Problem

Pet owners don't know how serious their pet's symptoms are or what care will cost until they're at the clinic. Many delay or skip care because of cost, and clinics lose money when owners decline treatment or can't pay. Owners with low incomes have the fewest options and the least information.

## 2. One-line pitch

We turn a scary, surprise vet bill into a planned conversation.

## 3. Goals

- Tell owners how urgent their pet's problem is, in plain language.
- Show a realistic cost range before the visit.
- Point cost-worried owners to financial aid and affordable care.
- Make it easy to book the right kind of visit.

**Non-goals (for the hackathon):** cats and other animals, real clinic integrations, payments, user accounts.

## 4. Target users

- **Primary:** Dog owners in Wisconsin worried about symptoms and cost, especially students and low-income owners.
- **Secondary:** Solo vets starting their own practice who want to bring in new clients and turn them into regulars (see the vet-side PRD).

## 5. User flow

1. Pet info
2. Emergency check
   - Emergency → connect to a 24 hr vet (Level 4)
   - Not an emergency → questionnaire
3. Questionnaire → AI triage (Level 1–3)
4. Price estimate + financial aid (with triage summary)
5. Booking

## 6. Urgency levels

| Level | Meaning | How it's set | What the app does |
|---|---|---|---|
| **4 – Emergency** | Go now | Emergency check | Connect to a 24 hr vet right away |
| **3 – Go soon** | Needs a vet, but not this minute | AI triage | Recommend a visit soon; show cost + booking |
| **2 – Within a few days** | Should be seen in the next few days | AI triage | Recommend booking in the next few days |
| **1 – Monitor at home** | Can likely wait / ignore | AI triage | Home care tips + signs to watch for |

## 7. Screens and requirements

### 7.1 Pet info
- Dogs only.
- Inputs: species, age, weight.
- Required before continuing.

### 7.2 Emergency check
- Asks whether the pet shows any emergency signs (starting with: is it breathing normally?).
- If yes → Level 4 → connect to 24 hr vet screen (nearest emergency clinic, call button).
- If no → go to questionnaire.

### 7.3 Questionnaire
- Free-text description of the problem plus tappable symptom chips (vomiting, limping, not eating, lethargic, etc.).
- 2–4 follow-up questions chosen based on the symptoms (e.g. "How many times?", "Any blood?"), answered with buttons.

### 7.4 AI triage
- Outputs an urgency level (1–3) and 2–3 plain-language possible causes.

### 7.5 Price estimate + financial aid
- **Top of screen: triage summary** printed out from the run:
  - Pet info
  - Symptoms reported
  - Urgency level (1–4)
  - Possible causes
- Estimated cost range for the likely visit (e.g. exam + tests), with a breakdown.
- Financial aid: placeholder for now (details TBD).
- Option to print / save the summary to bring to the vet.

### 7.6 Booking
- Pick a clinic and time from a sample list.
- Confirmation screen.
- Full scenarios in section 9.

### 7.7 Chat
- Chat screen where the owner and the vet can talk about the pet's symptoms.
- Only available once the vet accepts the booking request.

## 8. Demo scope (build vs. fake)

| Build | Fake / hard-code |
|---|---|
| Pet info, emergency check, questionnaire | Cost ranges for ~10 common issues |
| AI triage with urgency levels | Wisconsin clinic list; financial aid placeholder |
| Price estimate screen with triage summary | Booking (sample clinics, fake confirmation) |

## 9. Booking process

### 9.1 Main booking flow (Levels 2–3)

1. **Price estimate screen → "Book a visit."**
2. **Clinic list:** Wisconsin clinics near the owner, filtered to those with openings inside the urgency window (Level 3: soonest openings; Level 2: next few days). Each clinic shows distance, next available time, and estimated cost for this visit. Sort by soonest, closest, or cheapest.
3. **Pick a clinic.**
4. **Pick a time slot** within the urgency window.
5. **Review:** pet info, triage summary, estimated cost, clinic, and time.
6. **Request booking** → the request, with the triage summary attached, is sent to the vet (see the vet-side PRD).
7. **Pending:** "Request sent, waiting for the clinic to respond."
8. **Vet accepts → confirmation screen:** clinic address, time, estimated cost, what to bring (printed summary), and add-to-calendar.
9. **Reminder** before the appointment.

### 9.2 Scenarios by urgency level

| Level | Booking behavior |
|---|---|
| **4 – Emergency** | No appointment booking. Show the nearest 24 hr emergency clinic with **Call** and **Directions** buttons. Triage summary is sent to the clinic so they know what's coming. |
| **3 – Go soon** | Booking opens straight to clinics with same-day or next-day openings. |
| **2 – Within a few days** | Booking shows clinics with openings over the next few days; owner can pick a cheaper or more convenient clinic. |
| **1 – Monitor at home** | No booking prompt by default. Shows home care tips and signs to watch for, plus an optional "Book anyway" button and a "Symptoms got worse" button that restarts the check. |

### 9.3 Other scenarios

| Scenario | What happens |
|---|---|
| **Vet declines the request** | Owner is notified and can pick another time or another clinic. |
| **Owner already has a regular vet** | Owner can pick "My vet" from the list (or enter it) and book there first. |
| **Owner has no vet** | Show the full clinic list for their area. |
| **No openings inside the urgency window** | Show other nearby clinics with openings; if still none, offer a waitlist or suggest an urgent care / emergency clinic. |
| **Estimated cost is over the owner's budget** | Sort clinics by cheapest; link to financial aid (placeholder). |
| **Symptoms get worse before the appointment** | "Symptoms got worse" button reruns the emergency check. If it's now an emergency, jump to the Level 4 flow. |
| **Owner needs to reschedule** | Pick a new time at the same clinic, still inside the urgency window. |
| **Owner cancels** | Cancel the booking; if the level was 2 or 3, remind them the dog still needs to be seen and offer to rebook. |
| **Owner closes the app before booking** | Save the triage summary so they can come back and book without redoing the questionnaire. |
