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

export type BookingRequest = {
  id: string; // booking id in the database
  dog: Dog;
  owner: Owner;
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
