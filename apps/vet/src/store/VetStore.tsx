import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { addAppointmentToCalendar } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';
import type { Appointment, BookingRequest, Message, OpenSlot, Patient, Triage } from '@/types';

type VetStore = {
  requests: BookingRequest[];
  appointments: Appointment[]; // sorted by date and time
  patients: Patient[];
  openSlots: OpenSlot[]; // free times (Mon–Fri 9–5, 30 min) with no pending/accepted booking, sorted
  messages: Record<string, Message[]>; // keyed by booking id
  calendarAdded: Record<string, boolean>;
  toast: string | null;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  completeAppointment: (id: string) => void;
  addToCalendar: (id: string) => void;
  sendMessage: (appointmentId: string, text: string) => void;
};

const VetStoreContext = createContext<VetStore | null>(null);

// ── Database rows ──────────────────────────────────────────

type Status = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

type BookingRow = {
  id: string;
  date: string;
  start: number | string;
  duration: number | string;
  status: Status;
  visit_type: string;
  triage_summary: Triage | null;
  dog: { id: string; name: string; breed: string; age: string; weight: string } | null;
  owner: { name: string; phone: string } | null;
};

type MessageRow = { id: string; booking_id: string; sender: 'vet' | 'owner'; text: string; created_at: string };

/** Booking plus its dog and owner, in one request. */
const BOOKING_SELECT =
  'id, date, start, duration, status, visit_type, triage_summary, dog:dogs(id, name, breed, age, weight), owner:owners(name, phone)';

/** Statuses the vet app shows: pending → Requests, accepted → Appointments + Chat, completed → Patients. */
const SHOWN: Status[] = ['pending', 'accepted', 'completed'];

function toRequest(b: BookingRow): BookingRequest {
  return {
    id: b.id,
    dog: { name: b.dog?.name ?? 'Unknown dog', breed: b.dog?.breed ?? '', age: b.dog?.age ?? '', weight: b.dog?.weight ?? '' },
    owner: { name: b.owner?.name ?? 'Unknown owner', phone: b.owner?.phone ?? '' },
    date: b.date,
    start: Number(b.start),
    duration: Number(b.duration),
    triage: b.triage_summary,
  };
}

function toMessage(m: MessageRow): Message {
  return { id: m.id, from: m.sender, text: m.text, sentAt: m.created_at };
}

function byDateAndTime(a: BookingRequest, b: BookingRequest): number {
  return a.date === b.date ? a.start - b.start : a.date.localeCompare(b.date);
}

/** One entry per dog, newest visit first. */
function toPatients(completed: BookingRow[]): Patient[] {
  const byDog = new Map<string, Patient>();
  for (const b of completed) {
    const r = toRequest(b);
    const key = b.dog?.id ?? b.id;
    const p = byDog.get(key) ?? { id: key, dog: r.dog, owner: r.owner, visits: [] };
    p.visits.push({ date: b.date, type: b.visit_type });
    byDog.set(key, p);
  }
  const list = [...byDog.values()];
  for (const p of list) p.visits.sort((a, b) => b.date.localeCompare(a.date));
  return list.sort((a, b) => b.visits[0].date.localeCompare(a.visits[0].date));
}

function addMessage(m: Record<string, Message[]>, bookingId: string, msg: Message): Record<string, Message[]> {
  const thread = m[bookingId] ?? [];
  if (thread.some((x) => x.id === msg.id)) return m; // already have it (our own send + realtime echo)
  return { ...m, [bookingId]: [...thread, msg].sort((a, b) => a.sentAt.localeCompare(b.sentAt)) };
}

// ── Provider ───────────────────────────────────────────────

/**
 * App state for the signed-in vet. Loads their bookings and messages from Supabase,
 * keeps them live with Realtime, and writes every action back to the database.
 */
export function VetStoreProvider({ vetId, children }: { vetId: string; children: ReactNode }) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [calendarAdded, setCalendarAdded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Open slots come from the database function open_slots() (supabase/migrations/0002_open_slots.sql).
  const loadSlots = useCallback(async () => {
    const { data, error } = await supabase.rpc('open_slots', { p_vet_id: vetId, p_days: 60 });
    if (error) return; // older database without 0002: just show no open slots
    setOpenSlots(
      (data as { date: string; start: number | string; duration: number | string }[]).map((r) => ({
        date: r.date,
        start: Number(r.start),
        duration: Number(r.duration),
      })),
    );
  }, [vetId]);

  // Full load: on start, and whenever the phone comes back to the app (realtime can miss events while asleep).
  const loadAll = useCallback(async () => {
    loadSlots();
    const [b, m] = await Promise.all([
      supabase.from('bookings').select(BOOKING_SELECT).eq('vet_id', vetId).in('status', SHOWN),
      supabase.from('messages').select('id, booking_id, sender, text, created_at').order('created_at'),
    ]);
    if (b.error || m.error) {
      showToast(`Couldn't load data: ${(b.error ?? m.error)!.message}`);
      return;
    }
    setBookings(b.data as unknown as BookingRow[]);
    const grouped: Record<string, Message[]> = {};
    for (const row of m.data as MessageRow[]) (grouped[row.booking_id] ??= []).push(toMessage(row));
    setMessages(grouped);
  }, [vetId, showToast, loadSlots]);

  // Re-read one booking (with dog and owner) after a realtime change.
  const refreshBooking = useCallback(
    async (id: string, isNew: boolean) => {
      const { data } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle();
      const row = data as unknown as BookingRow | null;
      loadSlots(); // a new, declined or cancelled booking changes which times are free
      setBookings((list) => {
        const rest = list.filter((b) => b.id !== id);
        return row && SHOWN.includes(row.status) ? [...rest, row] : rest;
      });
      if (isNew && row?.status === 'pending') {
        showToast(`New request: ${row.owner?.name ?? 'An owner'} wants to book ${row.dog?.name ?? 'their dog'}.`);
      }
    },
    [showToast, loadSlots],
  );

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`vet-${vetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `vet_id=eq.${vetId}` }, (payload) => {
        const row = (payload.new ?? {}) as { id?: string };
        if (row.id) refreshBooking(row.id, payload.eventType === 'INSERT');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as MessageRow;
        setMessages((m) => addMessage(m, row.booking_id, toMessage(row)));
      })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [vetId, loadAll, refreshBooking]);

  // ── Derived lists for the screens ──

  const requests = useMemo(
    () => bookings.filter((b) => b.status === 'pending').map(toRequest).sort(byDateAndTime),
    [bookings],
  );
  const appointments = useMemo(
    () => bookings.filter((b) => b.status === 'accepted').map(toRequest).sort(byDateAndTime),
    [bookings],
  );
  const patients = useMemo(() => toPatients(bookings.filter((b) => b.status === 'completed')), [bookings]);

  // ── Actions ──

  /** Change a booking's status: update the screen right away, then save; undo if the save fails. */
  const setStatus = useCallback(
    async (id: string, status: Status, done: string) => {
      const before = bookings;
      setBookings((list) =>
        SHOWN.includes(status) ? list.map((b) => (b.id === id ? { ...b, status } : b)) : list.filter((b) => b.id !== id),
      );
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
      if (error) {
        setBookings(before);
        showToast(`Couldn't save: ${error.message}`);
      } else {
        showToast(done);
        loadSlots();
      }
    },
    [bookings, showToast, loadSlots],
  );

  const acceptRequest = useCallback(
    (id: string) => {
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      setStatus(id, 'accepted', `${req.dog.name}'s visit is booked. ${req.owner.name} got a confirmation.`);
    },
    [requests, setStatus],
  );

  const declineRequest = useCallback(
    (id: string) => {
      const req = requests.find((r) => r.id === id);
      if (!req) return;
      setStatus(id, 'declined', `Declined. ${req.owner.name} was asked to pick another time or clinic.`);
    },
    [requests, setStatus],
  );

  const completeAppointment = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id);
      if (!appt) return;
      setStatus(id, 'completed', `${appt.dog.name} was added to Patients.`);
    },
    [appointments, setStatus],
  );

  const addToCalendar = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id);
      if (!appt) return;
      addAppointmentToCalendar(appt);
      setCalendarAdded((c) => ({ ...c, [id]: true }));
      showToast(`Calendar invite for ${appt.dog.name} downloaded. Open it to add the visit.`);
    },
    [appointments, showToast],
  );

  const sendMessage = useCallback(
    async (bookingId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // `sender` is filled in by the database from who is signed in.
      const { data, error } = await supabase
        .from('messages')
        .insert({ booking_id: bookingId, text: trimmed })
        .select('id, booking_id, sender, text, created_at')
        .single();
      if (error) {
        showToast(`Message not sent: ${error.message}`);
        return;
      }
      setMessages((m) => addMessage(m, bookingId, toMessage(data as MessageRow)));
    },
    [showToast],
  );

  const value: VetStore = {
    requests,
    appointments,
    patients,
    openSlots,
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
