export type Dog = {
  name: string;
  breed: string;
  age: string;
  weight: string;
};

export type Owner = {
  name: string;
  phone: string;
};

/** The owner's symptom check, sent with the booking request (bookings.triage_summary). */
export type Triage = {
  level: number; // 1 monitor … 4 emergency
  title: string; // e.g. "Call a vet today"
  timing?: string;
  symptoms: string[];
  notes?: string;
  related?: string[]; // "may relate to" conditions from the health-record match
};

export type BookingRequest = {
  id: string; // booking id in the database
  dog: Dog;
  owner: Owner;
  triage?: Triage | null;
  date: string; // YYYY-MM-DD
  start: number; // hour of day, e.g. 9.5 = 9:30 AM
  duration: number; // hours
};

export type Appointment = BookingRequest;

export type Visit = {
  date: string; // YYYY-MM-DD
  type: string;
};

export type Patient = {
  id: string; // dog id in the database
  dog: Dog;
  owner: Owner;
  visits: Visit[];
};

export type Message = {
  id: string;
  from: 'vet' | 'owner';
  text: string;
  sentAt: string; // ISO timestamp
};

/** The signed-in vet's practice, stored in the `vets` table. */
export type VetProfile = {
  id: string;
  name: string;
  clinic: string;
  location: string;
};

/** A free appointment time, from the database function open_slots(). */
export type OpenSlot = {
  date: string; // YYYY-MM-DD
  start: number; // hour of day, e.g. 9.5 = 9:30 AM
  duration: number; // hours
};
