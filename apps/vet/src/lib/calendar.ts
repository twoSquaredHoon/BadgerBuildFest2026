import type { Appointment } from '@/types';
import { toDateTime } from '@/lib/dates';

function icsTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Downloads a calendar invite (.ics). On iPhone, Safari opens it with "Add to Calendar",
 * which adds the visit to Apple Calendar.
 */
export function addAppointmentToCalendar(appt: Appointment): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vet Side//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}-${Date.now()}@vetside`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(toDateTime(appt.date, appt.start))}`,
    `DTEND:${icsTime(toDateTime(appt.date, appt.start + appt.duration))}`,
    `SUMMARY:${escape(`Vet visit: ${appt.dog.name}`)}`,
    `DESCRIPTION:${escape(`${appt.dog.breed}, ${appt.dog.age}, ${appt.dog.weight}\nOwner: ${appt.owner.name} ${appt.owner.phone}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${appt.dog.name.toLowerCase()}-vet-visit.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
