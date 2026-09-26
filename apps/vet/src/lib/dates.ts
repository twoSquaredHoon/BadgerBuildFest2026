export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatRange(start: number, duration: number): string {
  return `${formatTime(start)} – ${formatTime(start + duration)}`;
}

export function formatDuration(duration: number): string {
  const mins = Math.round(duration * 60);
  return mins >= 60 ? `${mins / 60} hr` : `${mins} min`;
}

export function hourLabel(h: number): string {
  return `${((h + 11) % 12) + 1} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "Monday, September 28" */
export function dayLong(iso: string): string {
  const d = parseDate(iso);
  return `${DOW_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** "Mon, Sep 28" */
export function dayShort(iso: string): string {
  const d = parseDate(iso);
  return `${DOW_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Sep 28, 2026" */
export function dateShort(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function toDateTime(iso: string, hour: number): Date {
  const d = parseDate(iso);
  const h = Math.floor(hour);
  d.setHours(h, Math.round((hour - h) * 60), 0, 0);
  return d;
}

/** Message timestamp: "Just now", "3:22 PM" today, or "Mon, Sep 28, 3:22 PM". */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return 'Just now';
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return toISO(d) === todayISO() ? time : `${dayShort(toISO(d))}, ${time}`;
}
