# PRD: Vet Side (working name TBD)

**Event:** Badger BuildFest 2026 (UW–Madison)
**Status:** Draft v1, Sat Sept 26
**Related:** Client-side PRD (pet owner app). Booking requests from the client app arrive here.

---

## 1. Problem

Vets starting their own one-person practice have no established client base. They struggle to get new clients in the door and to keep them coming back, and managing booking requests and patient history on their own takes time away from care.

## 2. One-line pitch

We help one-person vets starting their own business get new clients and turn them into regulars.

## 3. Target users

- Solo vets starting their own practice in Wisconsin.

## 4. Goals

- Bring new clients to the vet through booking requests from the app.
- Make it quick to accept or decline requests.
- Keep all upcoming appointments in one place.
- Keep a list of past patients so owners come back as regulars.

## 5. Workflow

1. Owner requests a booking in the client app.
2. Request appears on the vet's **Booking requests** screen.
3. Vet **accepts** or **declines**.
   - Accept → appointment moves to the **Appointments** screen; owner gets a confirmation.
   - Decline → owner is notified to pick another time or clinic.
4. After the visit, the pet is added to **Past patients**.
5. Once a request is accepted, vet and client can talk about the pet's symptoms on the **Chat** screen.

## 6. Screens and requirements

### 6.1 Booking requests
- List of incoming booking requests.
- Each request shows: pet info, owner, and requested time.
- **Accept** and **Decline** buttons on each request.

### 6.2 Appointments
- Calendar with **month, week, and day** views of accepted appointments.
- Tap an appointment to see the pet's info.
- Add appointments to Apple Calendar.

### 6.3 Past patients
- List of pets that have visited in the past.
- Tap a pet to see its info and past visits.

### 6.4 Chat
- Chat screen where the vet and clients can talk about the pet's symptoms.
- Only available for accepted requests.
