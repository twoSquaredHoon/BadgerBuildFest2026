import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { addAppointmentToCalendar } from '@/lib/calendar';
import type { Appointment, BookingRequest, Message, Patient } from '@/types';

type VetStore = {
  requests: BookingRequest[];
  appointments: Appointment[]; // sorted by date and time
  patients: Patient[];
  messages: Record<string, Message[]>;
  calendarAdded: Record<string, boolean>;
  toast: string | null;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  completeAppointment: (id: string) => void;
  addToCalendar: (id: string) => void;
  sendMessage: (appointmentId: string, text: string) => void;
};

const VetStoreContext = createContext<VetStore | null>(null);

function sortAppointments(list: Appointment[]): Appointment[] {
  return [...list].sort((a, b) => (a.date === b.date ? a.start - b.start : a.date.localeCompare(b.date)));
}

/**
 * App state for the vet side. Everything starts empty: booking requests, appointments,
 * patients and messages will come from the backend once it is connected.
 */
export function VetStoreProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [appointmentList, setAppointmentList] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [calendarAdded, setCalendarAdded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appointments = useMemo(() => sortAppointments(appointmentList), [appointmentList]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const acceptRequest = useCallback(
    (id: string) => {
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      const apptId = `a-${req.id}`;
      setRequests((list) => list.filter((r) => r.id !== id));
      setAppointmentList((list) => [...list, { ...req, id: apptId }]);
      setMessages((m) => (m[apptId] ? m : { ...m, [apptId]: [] }));
      showToast(`${req.dog.name}'s visit is booked. ${req.owner.name} got a confirmation.`);
    },
    [requests, showToast],
  );

  const declineRequest = useCallback(
    (id: string) => {
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      setRequests((list) => list.filter((r) => r.id !== id));
      showToast(`Declined. ${req.owner.name} was asked to pick another time or clinic.`);
    },
    [requests, showToast],
  );

  const completeAppointment = useCallback(
    (id: string) => {
      const appt = appointmentList.find((a) => a.id === id);
      if (!appt) return;
      const visit = { date: appt.date, type: 'Office visit' };
      setAppointmentList((list) => list.filter((a) => a.id !== id));
      setPatients((list) => {
        const i = list.findIndex((p) => p.dog.name === appt.dog.name && p.owner.name === appt.owner.name);
        if (i >= 0) {
          const next = [...list];
          next[i] = { ...next[i], visits: [visit, ...next[i].visits] };
          return next;
        }
        return [{ id: `p-${appt.id}`, dog: appt.dog, owner: appt.owner, visits: [visit] }, ...list];
      });
      showToast(`${appt.dog.name} was added to Patients.`);
    },
    [appointmentList, showToast],
  );

  const addToCalendar = useCallback(
    (id: string) => {
      const appt = appointmentList.find((a) => a.id === id);
      if (!appt) return;
      addAppointmentToCalendar(appt);
      setCalendarAdded((c) => ({ ...c, [id]: true }));
      showToast(`Calendar invite for ${appt.dog.name} downloaded. Open it to add the visit.`);
    },
    [appointmentList, showToast],
  );

  const sendMessage = useCallback((appointmentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => ({
      ...m,
      [appointmentId]: [...(m[appointmentId] ?? []), { from: 'vet', text: trimmed, sentAt: new Date().toISOString() }],
    }));
  }, []);

  const value: VetStore = {
    requests,
    appointments,
    patients,
    messages,
    calendarAdded,
    toast,
    acceptRequest,
    declineRequest,
    completeAppointment,
    addToCalendar,
    sendMessage,
  };

  return <VetStoreContext.Provider value={value}>{children}</VetStoreContext.Provider>;
}

export function useVetStore(): VetStore {
  const store = useContext(VetStoreContext);
  if (!store) throw new Error('useVetStore must be used inside VetStoreProvider');
  return store;
}
