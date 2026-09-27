/**
 * PawPlan ↔ Supabase. Plain fetch calls to the Supabase REST and Auth APIs (no library needed).
 * The URL and publishable key come from /owner/config.js, which the vet app's dev server
 * generates from apps/vet/.env (see apps/vet/vite.config.ts).
 *
 * Owners don't make an account: the first time they request a booking, this phone gets a
 * quiet "anonymous" Supabase sign-in, kept in localStorage. That's how the database knows
 * which bookings are theirs. (Needs "Allow anonymous sign-ins" on in Supabase.)
 */

const SESSION_KEY = "pawplan.session.v1";
let configPromise = null;

function config() {
  configPromise ??= import("./config.js")
    .then((mod) => ({ url: mod.SUPABASE_URL, key: mod.SUPABASE_KEY }))
    .catch(() => ({ url: "", key: "" }));
  return configPromise;
}

/** False when the app is opened without the dev server (no config.js) or .env is empty. */
export async function backendReady() {
  const { url, key } = await config();
  return Boolean(url && key);
}

async function readError(response) {
  let message = `${response.status} ${response.statusText}`;
  try {
    const body = await response.json();
    message = body.message || body.msg || body.error_description || body.error || message;
  } catch { /* keep status text */ }
  return message;
}

// ── Sign-in (anonymous, per phone) ─────────────────────────

function savedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

function keepSession(data) {
  const session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    userId: data.user?.id
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* private mode: works for this visit */ }
  return session;
}

async function auth(path, body) {
  const { url, key } = await config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await readError(response);
    if (/anonymous/i.test(message)) {
      throw new Error("Booking is switched off: turn on \"Allow anonymous sign-ins\" in Supabase (Authentication → Sign In / Providers).");
    }
    throw new Error(message);
  }
  return response.json();
}

/** A valid session for this phone: reuse, refresh if it expired, or create one. */
async function ensureSession() {
  const saved = savedSession();
  const now = Math.floor(Date.now() / 1000);
  if (saved?.accessToken && saved.expiresAt - 60 > now) return saved;
  if (saved?.refreshToken) {
    try { return keepSession(await auth("token?grant_type=refresh_token", { refresh_token: saved.refreshToken })); } catch { /* fall through to a new sign-in */ }
  }
  return keepSession(await auth("signup", {}));
}

// ── REST ───────────────────────────────────────────────────

async function request(path, options = {}, { signedIn = false } = {}) {
  const { url, key } = await config();
  if (!url || !key) throw new Error("Backend not connected. Start the app with npm run dev in apps/vet.");
  const token = signedIn ? (await ensureSession()).accessToken : key;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(await readError(response));
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Clinics that signed up in the vet app, each with its open times (Mon–Fri 9–5, 30 min,
 * minus anything already requested or booked), soonest first.
 * Returns [{ id, name, clinic, location, slots: [{ date: "YYYY-MM-DD", start: 9.5, duration: 0.5 }] }]
 */
export async function loadClinicsWithSlots(days = 14) {
  const [vets, slots] = await Promise.all([
    request("vets?select=id,name,clinic,location&order=clinic"),
    request("rpc/open_slots", { method: "POST", body: JSON.stringify({ p_days: days }) })
  ]);
  const byVet = new Map(vets.map((vet) => [vet.id, { ...vet, slots: [] }]));
  for (const slot of slots) {
    byVet.get(slot.vet_id)?.slots.push({ date: slot.date, start: Number(slot.start), duration: Number(slot.duration) });
  }
  return [...byVet.values()];
}

/**
 * Sends a booking request to the vet (database function request_booking, 0003_booking_requests.sql).
 * It shows up live on the vet's Requests screen. Returns { id, status, date, start, duration }.
 */
export async function requestBooking({ vetId, date, start, ownerName, ownerPhone, dog, triage }) {
  const row = await request("rpc/request_booking", {
    method: "POST",
    body: JSON.stringify({
      p_vet_id: vetId,
      p_date: date,
      p_start: start,
      p_owner_name: ownerName,
      p_owner_phone: ownerPhone,
      p_dog_name: dog.name || "",
      p_dog_breed: dog.breed || "",
      p_dog_age: dog.age || "",
      p_dog_weight: dog.weight || "",
      p_triage: triage || null
    })
  }, { signedIn: true });
  return { id: row.id, status: row.status, date: row.date, start: Number(row.start), duration: Number(row.duration) };
}

/** Current status of one of this phone's bookings: pending, accepted, declined, completed or cancelled. */
export async function bookingStatus(id) {
  const rows = await request(`bookings?id=eq.${encodeURIComponent(id)}&select=id,status,date,start,duration`, {}, { signedIn: true });
  return rows?.[0] ? { ...rows[0], start: Number(rows[0].start), duration: Number(rows[0].duration) } : null;
}

/** Owner cancels a pending or accepted booking. The time opens up again for others. */
export async function cancelBooking(id) {
  await request(`bookings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "cancelled" })
  }, { signedIn: true });
}
