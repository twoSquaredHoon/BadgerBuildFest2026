import {
  SYMPTOMS, detailQuestion, emergencyPlan, evaluate, petIsValid,
  summaryDocument, urgencyInfo
} from "./care.js";
import { bookingStatus, cancelBooking, loadClinicsWithSlots, requestBooking } from "./backend.js";
import { AID_ORGS, BUDGET_OPTIONS, INCOME_OPTIONS, aidChecklist, aidOrg, clinicWarnings, estimateHigh, matchAid, optionLabel } from "./aid.js";
import { WI_COUNTIES, countyForZip } from "./zip-counties.js";

const KEY = "pawplan.web.v1";
const EMERGENCY_CHECKS = [
  ["Breathing", "Trouble breathing, choking, or blue / very pale gums?"],
  ["Alertness and injury", "Collapse, a seizure, major injury, or uncontrolled bleeding?"],
  ["Other urgent signs", "Possible poisoning, a swollen painful belly, or straining without passing urine?"]
];

const TAB_TITLES = { home: "Home", plan: "My plan", resources: "Resources", emergency: "Emergency" };
const FLOW_TITLES = { check: "Symptom check", aid: "Help paying", booking: "Book a visit" };

const svg = (size, paths) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  back: svg(22, '<path d="M15 18l-6-6 6-6"/>'),
  chevron: svg(18, '<path d="M9 18l6-6-6-6"/>'),
  home: svg(24, '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  plan: svg(24, '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>'),
  resources: svg(24, '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
  emergency: svg(24, '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>')
};

const state = load();
const app = document.querySelector("#app");

// Clinics and their open times come from the database (backend.js), not from hard-coded lists.
state.clinicData = { status: "idle", list: [], error: "" };
state.chosenClinic = null;
state.chosenSlot = null;

async function loadClinics() {
  if (state.clinicData.status === "idle" || state.clinicData.status === "error") {
    state.clinicData = { ...state.clinicData, status: "loading" };
    if (state.view === "booking") render();
  }
  try {
    const list = await loadClinicsWithSlots(14);
    state.clinicData = { status: "ready", list, error: "" };
    // A time someone else just took disappears from the list, so drop it from the selection too.
    const clinic = list.find((item) => item.id === state.chosenClinic);
    if (state.chosenSlot && !clinic?.slots.some((slot) => slotKey(slot) === state.chosenSlot)) state.chosenSlot = null;
  } catch (error) {
    state.clinicData = { status: "error", list: state.clinicData.list, error: error.message };
  }
  if (state.view === "booking") render();
}

state.requesting = false;
state.requestError = "";
state.confirmCancel = false;

/** The booking this phone asked for, while it still matters (waiting or confirmed). */
function activeBooking() {
  const booking = state.plan?.booking;
  return booking && ["pending", "accepted"].includes(booking.status) ? booking : null;
}

// Check the clinic's answer: pending → accepted / declined. Runs on the plan and booking screens.
async function refreshBookingStatus() {
  const booking = activeBooking();
  if (!booking || !booking.id) return;
  try {
    const latest = await bookingStatus(booking.id);
    if (latest && latest.status !== booking.status) {
      state.plan.booking = { ...booking, status: latest.status };
      save();
      if (state.view === "booking" || state.view === "plan") render();
    }
  } catch { /* offline for a moment: try again on the next tick */ }
}
setInterval(() => {
  if ((state.view === "booking" || state.view === "plan") && document.visibilityState === "visible") refreshBookingStatus();
}, 8000);

// Keep open times fresh while the booking screen is showing.
setInterval(() => { if (state.view === "booking" && document.visibilityState === "visible") loadClinics(); }, 30000);
document.addEventListener("visibilitychange", () => { if (state.view === "booking" && document.visibilityState === "visible") loadClinics(); });

document.body.addEventListener("click", (event) => {
  const go = event.target.closest("[data-go]");
  if (go) {
    event.preventDefault();
    show(go.dataset.go);
  }
});

app.addEventListener("click", onClick);
app.addEventListener("input", onInput);

show(location.hash.replace("#", "") || "home");
window.addEventListener("hashchange", () => show(location.hash.replace("#", "") || "home"));

function show(view) {
  state.view = view || "home";
  if (state.view === "check" && !state.step) state.step = "pet";
  history.replaceState(null, "", `#${state.view}`);
  if (state.view === "booking") loadClinics();
  if (state.view === "booking" || state.view === "plan") refreshBookingStatus();
  render();
  window.scrollTo(0, 0);
}

/** Same page frame as the vet side: tab screens get a large header and a bottom tab bar; step-by-step screens get a back header. */
function render() {
  const views = { home, check, plan: planView, aid: aidView, emergency: emergencyView, booking, resources };
  const view = views[state.view] ? state.view : "home";
  const body = views[view]();
  if (FLOW_TITLES[view]) {
    app.innerHTML = `
      <header class="detail-header">
        <button type="button" class="back" data-action="nav-back" aria-label="Back">${ICONS.back}<span>Back</span></button>
        <div class="detail-title">${FLOW_TITLES[view]}</div>
        <div style="width: 72px"></div>
      </header>
      <main class="page">${body}</main>`;
    return;
  }
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  app.innerHTML = `
    <header class="tab-header">
      <div>
        <div class="small muted">${today}</div>
        <h1>${TAB_TITLES[view]}</h1>
      </div>
      <a class="signout" href="/">Switch side</a>
    </header>
    <main class="tab-main">${body}</main>
    ${tabbar(view)}`;
}

function tabbar(view) {
  const tabs = [["home", "Home", ICONS.home], ["plan", "My plan", ICONS.plan], ["resources", "Resources", ICONS.resources], ["emergency", "Emergency", ICONS.emergency]];
  return `<nav class="tabbar" aria-label="Main">${tabs.map(([id, label, icon]) => `<a href="#${id}" data-go="${id}" class="tab${view === id ? " active" : ""}"${view === id ? ' aria-current="page"' : ""}>${icon}<span>${label}</span></a>`).join("")}</nav>`;
}


function onInput(event) {
  const field = event.target;
  if (field.id === "petName") state.pet.name = field.value;
  if (field.id === "petAge") state.pet.age = field.value;
  if (field.id === "petWeight") state.pet.weight = field.value;
  if (field.id === "petZip") state.pet.zipCode = field.value;
  if (field.id === "notes") state.answers.notes = field.value.slice(0, 1500);
  if (field.id === "ownerName") { state.contact.name = field.value; save(); }
  if (field.id === "ownerPhone") { state.contact.phone = field.value; save(); }
  if (field.id === "aidCounty" && state.plan) { aidState().county = field.value; save(); render(); return; }
  const requestButton = app.querySelector("#requestBooking");
  if (requestButton) requestButton.disabled = state.requesting || !state.contact.name.trim();
  const button = app.querySelector("#continuePet");
  if (button) button.disabled = !petReady();
  const notesButton = app.querySelector("#continueSymptoms");
  if (notesButton) notesButton.disabled = !symptomsReady();
  const count = app.querySelector("#noteCount");
  if (count) count.textContent = `${state.answers.notes.length} / 1,500`;
}

function onClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  let action = button.dataset.action;
  if (action === "nav-back") {
    if (state.view === "check") {
      const order = ["pet", "emergency", "symptoms", "questions"];
      const index = order.indexOf(state.step);
      if (index > 0) { state.step = order[index - 1]; render(); window.scrollTo(0, 0); } else show("home");
      return;
    }
    if (state.view === "booking" && state.chosenClinic) { state.chosenClinic = null; state.chosenSlot = null; render(); window.scrollTo(0, 0); return; }
    show(state.view === "booking" || state.view === "aid" ? "plan" : "home");
    return;
  }
  if (action === "start") { state.step = "pet"; show("check"); return; }
  if (action === "emergency-now") return finishEmergency("Emergency help requested before completing the check.");
  if (action === "continue-pet" && petReady()) { state.step = "emergency"; state.emergency = {}; render(); return; }
  if (action === "emergency-no") {
    state.emergency[button.dataset.index] = false;
    render();
    return;
  }
  if (action === "emergency-yes") return finishEmergency(`Emergency check: ${EMERGENCY_CHECKS[button.dataset.index][1]} Answer: yes or unsure.`);
  if (action === "continue-safety" && Object.keys(state.emergency).length === 3) { state.step = "symptoms"; render(); return; }
  if (action === "symptom") {
    const name = button.dataset.symptom;
    const selected = new Set(state.answers.symptoms);
    if (selected.has(name)) selected.delete(name); else selected.add(name);
    state.answers.symptoms = SYMPTOMS.filter((item) => selected.has(item));
    state.answers.detail = null;
    render();
    return;
  }
  if (action === "continue-symptoms" && symptomsReady()) { state.step = "questions"; render(); return; }
  if (action === "answer") {
    state.answers[button.dataset.field] = button.dataset.value;
    if (button.dataset.value === "severe") return finishEmergency("Very weak or collapsing was reported.");
    if (button.dataset.value === "unable") return finishEmergency("Unable to keep water down was reported. Call for immediate veterinary guidance.");
    if (button.dataset.value === "redFlag") return finishEmergency("Blood or severe pain was reported. Call for immediate veterinary guidance.");
    render();
    return;
  }
  if (action === "create-plan" && answersComplete() && !state.checking) {
    beginPlan();
    return;
  }
  if (action === "book") { state.chosenClinic = null; state.chosenSlot = null; show("booking"); return; }
  if (action === "pick-clinic") { state.chosenClinic = button.dataset.clinic; state.chosenSlot = null; render(); window.scrollTo(0, 0); return; }
  if (action === "pick-slot") {
    state.chosenSlot = state.chosenSlot === button.dataset.slot ? null : button.dataset.slot;
    state.requestError = "";
    render();
    app.querySelector("#requestCard")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (action === "retry-clinics") { loadClinics(); return; }
  if (action === "cover") {
    aidState().cover = button.dataset.value;
    save();
    if (button.dataset.value === "yes") render(); else show("aid");
    return;
  }
  if (action === "aid-income") { aidState().income = button.dataset.value; save(); render(); return; }
  if (action === "aid-budget") { aidState().budget = button.dataset.value; save(); render(); return; }
  if (action === "aid-toggle") {
    const aid = aidState();
    const id = button.dataset.id;
    aid.shortlist = aid.shortlist.includes(id) ? aid.shortlist.filter((item) => item !== id) : [...aid.shortlist, id];
    save();
    render();
    return;
  }
  if (action === "aid-check") {
    const aid = aidState();
    const doc = button.dataset.doc;
    aid.checked = aid.checked.includes(doc) ? aid.checked.filter((item) => item !== doc) : [...aid.checked, doc];
    save();
    render();
    return;
  }
  if (action === "request-booking") { sendRequest(); return; }
  if (action === "cancel-booking") { state.confirmCancel = true; render(); return; }
  if (action === "keep-booking") { state.confirmCancel = false; render(); return; }
  if (action === "confirm-cancel") { cancelRequest(); return; }
  if (action === "rebook") { state.plan.booking = null; state.confirmCancel = false; save(); state.chosenClinic = null; state.chosenSlot = null; loadClinics(); render(); window.scrollTo(0, 0); return; }
  if (action === "print") { printSummary(); return; }
  if (action === "clear") { localStorage.removeItem(KEY); state.plan = null; state.pet = blankPet(); show("home"); }
}

function home() {
  const saved = state.plan ? `<a class="card" href="#plan" data-go="plan"><strong>${esc(displayName(state.plan.pet))}’s saved plan</strong></a>` : "";
  return `
    <section class="stack">
      <p class="muted">Check your dog’s symptoms and get a care plan.</p>
      <div class="hero-actions">
        <button class="primary" data-action="start" id="startCheck">Check my dog’s symptoms</button>
        <button class="ghost" data-go="emergency">Emergency help</button>
      </div>
      ${saved}
    </section>`;
}


function check() {
  if (state.checking) {
    return `<section class="stack"><h1>Reading clinic websites</h1><p class="muted">Each dollar has to appear on the clinic’s page. If it does not, that price stays unavailable.</p></section>`;
  }
  const stepIndex = ["pet", "emergency", "symptoms", "questions"].indexOf(state.step);
  const steps = `<div class="steps" aria-label="Step ${stepIndex + 1} of 4">${[0, 1, 2, 3].map((index) => `<i class="${index <= stepIndex ? "on" : ""}"></i>`).join("")}</div>`;
  const body = { pet: petStep, emergency: emergencyStep, symptoms: symptomStep, questions: questionStep }[state.step]();
  return `<section class="stack">${steps}${body}</section>`;
}

function petStep() {
  return `
    <h1>Your dog</h1>
    <div class="card">
      ${field("Name", "petName", state.pet.name, "Optional")}
      ${field("Age in years", "petAge", state.pet.age, "e.g. 3 or 0.5", "decimal")}
      ${field("Weight in pounds", "petWeight", state.pet.weight, "e.g. 25", "decimal")}
      ${field("ZIP code", "petZip", state.pet.zipCode, "e.g. 53703", "text")}
    </div>
    <p class="note">Age 0–30 years, weight up to 350 lb.</p>
    <button class="primary" id="continuePet" data-action="continue-pet" ${petReady() ? "" : "disabled"}>Continue</button>
    <button class="ghost" data-action="emergency-now">Emergency help now</button>`;
}


function emergencyStep() {
  const cards = EMERGENCY_CHECKS.map((item, index) => `
    <article class="card">
      <h2>${esc(item[0])}</h2>
      <p>${esc(item[1])}</p>
      <div class="choices">
        <button class="choice" data-action="emergency-no" data-index="${index}" id="emergencyNo${index}" aria-pressed="${state.emergency[index] === false}">No</button>
        <button class="choice" data-action="emergency-yes" data-index="${index}" id="emergencyYes${index}">Yes / unsure</button>
      </div>
    </article>`).join("");
  const ready = Object.keys(state.emergency).length === 3;
  return `
    <h1>Any of these right now?</h1>
    ${cards}
    <button class="primary" id="continueSafety" data-action="continue-safety" ${ready ? "" : "disabled"}>None of these — continue</button>
    <p class="note">Not sure? Call a vet now.</p>`;
}


function symptomStep() {
  const selected = new Set(state.answers.symptoms);
  const chips = SYMPTOMS.map((symptom) => `<button class="chip" data-action="symptom" data-symptom="${esc(symptom)}" id="symptom_${esc(symptom)}" aria-pressed="${selected.has(symptom)}">${esc(symptom)}</button>`).join("");
  return `
    <h1>What have you noticed?</h1>
    <div class="chips">${chips}</div>
    <label class="card field"><span>Anything else?</span><textarea id="notes" maxlength="1500">${esc(state.answers.notes)}</textarea><small id="noteCount" class="note">${state.answers.notes.length} / 1,500</small></label>
    <button class="primary" id="continueSymptoms" data-action="continue-symptoms" ${symptomsReady() ? "" : "disabled"}>Continue</button>`;
}


function questionStep() {
  return `
    <h1>A few details</h1>
    ${choiceCard("When did it start?", "duration", [["recent", "Today"], ["yesterday", "1–2 days"], ["longer", "3+ days"]])}
    ${choiceCard("How is their energy?", "energy", [["normal", "Like usual"], ["reduced", "Quieter than usual"], ["severe", "Very weak / collapsing"]])}
    ${choiceCard("Are they eating and drinking?", "intake", [["normal", "Eating & drinking"], ["reduced", "Eating or drinking less"], ["unable", "Cannot keep water down"]])}
    ${choiceCard(detailQuestion(state.answers.symptoms), "detail", [["mild", "Mild / occasional"], ["repeated", "Repeated / worsening"], ["redFlag", "Blood or severe pain"]])}
    <button class="primary" id="createPlan" data-action="create-plan" ${answersComplete() ? "" : "disabled"}>See my care plan</button>`;
}


function planView() {
  if (!state.plan) {
    return `<section class="stack"><p class="muted">No plan yet.</p><button class="primary" data-action="start">Start a symptom check</button></section>`;
  }
  if (state.plan.urgency === "emergency") return emergencyView();
  const plan = state.plan;
  const info = urgencyInfo(plan.urgency);
  return `
    <section class="stack">
      <article class="card compact">
        <div class="result">
          <span class="level-dot ${plan.urgency}">${info.level}</span>
          <div>
            <h2>${esc(info.title)}</h2>
            <p class="note">${esc(info.timing)}</p>
          </div>
        </div>
        <div class="review">
          <p><strong>${esc(displayName(plan.pet))}</strong> <span class="muted">· ${esc(plan.pet.age)} yrs · ${esc(plan.pet.weight)} lb</span></p>
          <p>${esc(plan.answers.symptoms.join(", ") || plan.answers.notes)}</p>
        </div>
        ${relatedMarkup(plan.samples)}
      </article>
      <article class="card compact" id="costCard">
        <p class="eyebrow">Estimated cost</p>
        ${costMarkup(plan.estimate)}
      </article>
      ${coverCard(plan)}
      ${activeBooking()
        ? `<button class="primary" id="bookVisit" data-go="booking">${activeBooking().status === "accepted" ? "Visit confirmed · see details" : "Request sent · see status"}</button>`
        : `<button class="primary" id="bookVisit" data-action="book">Book a visit</button>`}
      ${plan.urgency === "monitor" ? `<button class="ghost" data-action="start">Symptoms got worse — check again</button>` : ""}
      <button class="ghost" data-action="print">Print or save summary</button>
    </section>`;
}



/** Published Wisconsin prices closest to the owner's ZIP (care.js estimateCost). */
function costMarkup(estimate) {
  if (!estimate) return `<p class="muted">Start a new check to see prices.</p>`;
  const note = estimate.liveNote ? `<p class="note">${esc(estimate.liveNote)}</p>` : "";
  const lines = estimate.priceLines || [];
  if (!estimate.expectedPriceLabel || !lines.length) {
    return `${note}<p class="muted">${esc(estimate.isSupportedRegion ? estimate.startingStatement : estimate.regionBanner)}</p>`;
  }
  const miles = (line) => line.milesText.replace(" miles", " mi");
  const caption = lines.length === 1
    ? `${lines[0].clinicName} · ${miles(lines[0])}`
    : `${lines.length} clinics · ${miles(lines[0]).replace(" mi", "")}–${miles(lines[lines.length - 1])}`;
  return `
    ${note}
    <details id="howWeEstimated" class="cost-details">
      <summary class="cost-row"><span class="price">${esc(estimate.expectedPriceLabel)}</span><span class="note">${esc(caption)} · <span class="link">Sources</span></span></summary>
      <div class="provenance">${lines.map((line) => `<p><a href="${esc(line.sourceURL)}">${esc(line.clinicName)}</a> · ${esc(line.milesText)} · ${esc(line.priceLabel)}</p>`).join("")}</div>
    </details>`;
}

/** "May relate to" tags from the health-record match (care.js sampleLabels). */
function relatedMarkup(samples) {
  const area = samples?.areaPhrase ? samples.areaPhrase.replace(/^an? /, "") : "";
  const items = [...(area ? [area.charAt(0).toUpperCase() + area.slice(1)] : []), ...(samples?.conditions || [])];
  if (!items.length) return "";
  return `<div class="related" id="sampleLabels"><p class="eyebrow">May relate to</p><div class="tags">${items.map((name) => `<span class="badge">${esc(name)}</span>`).join("")}</div></div>`;
}

function booking() {
  if (!state.plan || state.plan.urgency === "emergency") return emergencyView();
  if (state.plan.booking) return bookingStatusView(state.plan.booking);
  const { status, list, error } = state.clinicData;
  if (status === "loading" || status === "idle") return `<section class="stack"><p class="muted">Loading clinics…</p></section>`;
  if (status === "error" && !list.length) {
    return `
      <section class="stack">
        <div class="empty"><div class="empty-title">Couldn’t load clinics</div><p>${esc(error)}</p></div>
        <button class="ghost" data-action="retry-clinics">Try again</button>
      </section>`;
  }
  if (!list.length) {
    return `
      <section class="stack">
        <div class="empty"><div class="empty-title">No clinics yet</div><p>Clinics will show here once vets join.</p></div>
      </section>`;
  }
  const clinic = list.find((item) => item.id === state.chosenClinic);
  return clinic ? clinicTimes(clinic) : clinicList(list);
}

/** Every clinic from the database, soonest opening first. */
function clinicList(list) {
  const sorted = [...list].sort((a, b) => (a.slots[0] ? slotKey(a.slots[0]) : "~").localeCompare(b.slots[0] ? slotKey(b.slots[0]) : "~") || a.clinic.localeCompare(b.clinic));
  return `
    <section class="stack">
      <p class="muted">Open times for the next two weeks. Times that are already requested or booked are hidden.</p>
      ${sorted.map((item) => `
        <button class="card" data-action="pick-clinic" data-clinic="${esc(item.id)}" id="clinic_${esc(item.id)}">
          <strong>${esc(item.clinic)}</strong>
          <p class="muted">${esc([item.name, item.location].filter(Boolean).join(" · "))}</p>
          <p>${item.slots.length ? `Next open: ${esc(formatDay(item.slots[0].date))} · ${esc(formatHour(item.slots[0].start))}` : "No open times in the next two weeks"}</p>
          ${warningLines(item.clinic)}
        </button>`).join("")}
    </section>`;
}

/** One clinic's open times, grouped by day. */
function clinicTimes(clinic) {
  const days = [];
  for (const slot of clinic.slots) {
    if (days[days.length - 1]?.date !== slot.date) days.push({ date: slot.date, slots: [] });
    days[days.length - 1].slots.push(slot);
  }
  const chosen = clinic.slots.find((slot) => slotKey(slot) === state.chosenSlot);
  return `
    <section class="stack">
      <div>
        <h1>${esc(clinic.clinic)}</h1>
        <p class="muted">${esc([clinic.name, clinic.location].filter(Boolean).join(" · "))}</p>
      </div>
      ${warningLines(clinic.clinic)}
      ${days.length ? days.map((day) => `
        <article class="card">
          <h2>${esc(formatDay(day.date))}</h2>
          <div class="slots">
            ${day.slots.map((slot) => `<button class="slot" data-action="pick-slot" data-slot="${esc(slotKey(slot))}" aria-pressed="${slotKey(slot) === state.chosenSlot}">${esc(formatHour(slot.start))}</button>`).join("")}
          </div>
        </article>
        ${chosen && chosen.date === day.date ? requestForm(clinic, chosen) : ""}`).join("") : `<div class="empty"><div class="empty-title">Fully booked</div><p>No open times in the next two weeks.</p></div>`}
    </section>`;
}

function slotKey(slot) {
  return `${slot.date}T${String(Math.round(slot.start * 100)).padStart(4, "0")}`; // 9.5 → "…T0950", sorts by time
}

/** "2026-09-28" → "Mon, Sep 28" (read as a calendar date, not shifted by time zone). */
function formatDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Name + phone, then send. The clinic gets the request with the dog's check summary. */
function requestForm(clinic, slot) {
  return `
    <article class="card" id="requestCard">
      <h2>Request ${esc(formatDay(slot.date))} at ${esc(formatHour(slot.start))}</h2>
      <p class="note">${esc(clinic.clinic)} will see ${esc(displayName(state.plan.pet))}’s check summary and confirm or suggest another time.</p>
      ${aidForVetLine()}
      <label class="field"><span>Your name</span><input id="ownerName" value="${esc(state.contact.name)}" autocomplete="name" placeholder="First and last name"></label>
      <label class="field"><span>Phone</span><input id="ownerPhone" value="${esc(state.contact.phone)}" autocomplete="tel" inputmode="tel" placeholder="So the clinic can reach you"></label>
      ${state.requestError ? `<p class="error" role="alert">${esc(state.requestError)}</p>` : ""}
      <button class="primary" id="requestBooking" data-action="request-booking" ${state.requesting || !state.contact.name.trim() ? "disabled" : ""}>${state.requesting ? "Sending…" : "Request this time"}</button>
    </article>`;
}

async function sendRequest() {
  const clinic = state.clinicData.list.find((item) => item.id === state.chosenClinic);
  const slot = clinic?.slots.find((item) => slotKey(item) === state.chosenSlot);
  if (!clinic || !slot || state.requesting) return;
  state.requesting = true;
  state.requestError = "";
  render();
  try {
    const pet = state.plan.pet;
    const saved = await requestBooking({
      vetId: clinic.id,
      date: slot.date,
      start: slot.start,
      ownerName: state.contact.name.trim(),
      ownerPhone: state.contact.phone.trim(),
      dog: { name: displayName(pet), age: pet.age ? `${pet.age} yrs` : "", weight: pet.weight ? `${pet.weight} lb` : "" },
      triage: triageSummary(state.plan)
    });
    state.plan.booking = { ...saved, vetId: clinic.id, clinicName: clinic.clinic, vetName: clinic.name, location: clinic.location };
    state.chosenClinic = null;
    state.chosenSlot = null;
    save();
  } catch (error) {
    state.requestError = error.message;
    loadClinics(); // the time may have just been taken
  }
  state.requesting = false;
  render();
  window.scrollTo(0, 0);
}

async function cancelRequest() {
  const booking = state.plan?.booking;
  if (!booking) return;
  try {
    await cancelBooking(booking.id);
    state.plan.booking = { ...booking, status: "cancelled" };
    save();
  } catch (error) {
    state.requestError = error.message;
  }
  state.confirmCancel = false;
  render();
}

/** What the vet sees on the request: urgency, symptoms and the dog's basics. */
function triageSummary(plan) {
  const info = urgencyInfo(plan.urgency);
  return {
    level: info.level,
    urgency: plan.urgency,
    title: info.title,
    timing: info.timing,
    symptoms: plan.answers?.symptoms || [],
    notes: plan.answers?.notes || "",
    related: plan.samples?.conditions || [],
    pet: { name: displayName(plan.pet), age: plan.pet?.age ?? "", weight: plan.pet?.weight ?? "" },
    ...(aidForVet(plan) ? { aid: aidForVet(plan) } : {})
  };
}

/** After sending: waiting → confirmed / declined / cancelled. Updates by itself (refreshBookingStatus). */
function bookingStatusView(booking) {
  const when = `${formatDay(booking.date)} · ${formatHour(booking.start)}`;
  const where = [booking.vetName, booking.location].filter(Boolean).join(" · ");
  const header = (badge, cls = "") => `
    <p class="badge ${cls}">${badge}</p>
    <h2>${esc(booking.clinicName)}</h2>
    <p><strong>${esc(when)}</strong></p>
    ${where ? `<p class="muted">${esc(where)}</p>` : ""}`;
  const cancelButtons = state.confirmCancel
    ? `<p class="note">Cancel this visit? The time opens up for other owners.</p>
       <button class="primary emergency" data-action="confirm-cancel">Yes, cancel</button>
       <button class="ghost" data-action="keep-booking">Keep it</button>`
    : `<button class="ghost" data-action="cancel-booking">Cancel ${booking.status === "accepted" ? "visit" : "request"}</button>`;
  const error = state.requestError ? `<p class="error" role="alert">${esc(state.requestError)}</p>` : "";

  if (booking.status === "pending") {
    return `
      <section class="stack" id="bookingStatus">
        <article class="card">${header("Request sent")}
          <p class="note">Waiting for the clinic to confirm. They can see ${esc(displayName(state.plan.pet))}’s check summary. This page updates by itself.</p>
        </article>
        ${aidPlanCard(booking)}
        ${error}${cancelButtons}
      </section>`;
  }
  if (booking.status === "accepted") {
    return `
      <section class="stack" id="bookingStatus">
        <article class="card">${header("Confirmed", "ok")}
          <p class="note">Bring your printed summary to the visit.</p>
        </article>
        ${aidPlanCard(booking)}
        <button class="primary" data-action="print">Print or save summary</button>
        ${error}${cancelButtons}
      </section>`;
  }
  const ended = {
    declined: ["Not available", "The clinic couldn’t take this time. Pick another time or another clinic."],
    cancelled: ["Cancelled", "This visit was cancelled."],
    completed: ["Visit done", "This visit is complete."]
  }[booking.status] || ["Closed", ""];
  return `
    <section class="stack" id="bookingStatus">
      <article class="card">${header(ended[0], "warn")}<p class="note">${esc(ended[1])}</p></article>
      <button class="primary" data-action="rebook">${booking.status === "completed" ? "Book another visit" : "Pick another time"}</button>
    </section>`;
}

/** 9.5 → "9:30 AM" */
function formatHour(hour) {
  const h = Math.floor(hour);
  const min = Math.round((hour - h) * 60);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}









/* ─────────────── Help paying (financial aid) ───────────────
 * Most grants need the vet's diagnosis + written estimate, pay the clinic directly, and never refund
 * bills already paid. So: plan before the visit (shortlist), apply after the estimate, before paying.
 * State lives on the plan: plan.aid = { cover, county, income, budget, shortlist[], checked[] }.
 */
function aidState() {
  const plan = state.plan;
  if (!plan.aid) plan.aid = {};
  const aid = plan.aid;
  if (aid.county === undefined) aid.county = countyForZip(plan.pet?.zipCode) || "";
  aid.shortlist ??= [];
  aid.checked ??= [];
  return aid;
}

function aidMatches(plan, level = urgencyInfo(plan.urgency).level) {
  const aid = plan.aid || {};
  const county = aid.county ?? countyForZip(plan.pet?.zipCode);
  return matchAid({ level, county: county || null, inWisconsin: Boolean(county), income: aid.income || "skip", estimateHigh: estimateHigh(plan.estimate) });
}

/** My plan: "Can you cover about $X?" → Aid, or the saved aid plan. */
function coverCard(plan) {
  const aid = plan.aid || {};
  const names = (aid.shortlist || []).map((id) => aidOrg(id)?.name).filter(Boolean);
  if (names.length) {
    return `
      <article class="card compact aid" id="coverCard">
        <div class="row"><p class="eyebrow">Help paying</p><a class="small" href="#aid" data-go="aid">Edit</a></div>
        ${names.map((name) => `<div class="aid-row"><span>${esc(name)}</span></div>`).join("")}
        <p class="note">Apply after the vet’s estimate, before you pay.</p>
      </article>`;
  }
  if (aid.cover === "yes") {
    return `
      <article class="card compact aid" id="coverCard">
        <div class="row"><p class="eyebrow">Help paying</p><a class="small" href="#aid" data-go="aid">See options</a></div>
        <p class="note">You said you can cover this visit.</p>
      </article>`;
  }
  const price = plan.estimate?.expectedPriceLabel;
  return `
    <article class="card compact" id="coverCard">
      <p class="eyebrow">Paying for the visit</p>
      <h2>${price ? `Can you cover about ${esc(price)}?` : "Is paying for this visit a worry?"}</h2>
      ${price ? `<p class="note">That’s the exam price. Tests or treatment can add to it.</p>` : ""}
      <div class="cover-choices">
        ${[["yes", price ? "Yes" : "No, I’m fine"], ["unsure", "Not sure"], ["no", price ? "No" : "Yes"]].map(([value, label]) => `<button class="choice" data-action="cover" data-value="${value}" aria-pressed="${aid.cover === value}">${label}</button>`).join("")}
      </div>
    </article>`;
}

function aidView() {
  if (!state.plan || state.plan.urgency === "emergency") return emergencyView();
  const plan = state.plan;
  const aid = aidState();
  const info = urgencyInfo(plan.urgency);
  const answered = aid.income && aid.budget;
  const result = answered ? aidMatches(plan) : null;
  const saved = aid.shortlist.length;
  const choiceRow = (action, options, value) => `<div class="choices">${options.map(([key, label]) => `<button class="choice" data-action="${action}" data-value="${key}" aria-pressed="${value === key}">${esc(label)}</button>`).join("")}</div>`;
  const covered = answered && aid.budget === "over300" && (estimateHigh(plan.estimate) ?? Infinity) <= 300;
  return `
    <section class="stack" id="aidView">
      <div>
        <h1>Help paying for ${esc(displayName(plan.pet))}’s care</h1>
        <p class="muted">Level ${info.level} · ${esc(info.title)}${plan.estimate?.expectedPriceLabel ? ` · exam about ${esc(plan.estimate.expectedPriceLabel)}` : ""}</p>
      </div>
      <p class="aid-banner"><strong>Apply before you pay.</strong> Most programs pay the clinic directly and won’t refund a bill you’ve already paid.</p>

      <article class="card">
        <h2>Where do you live?</h2>
        <label class="field"><span>County</span>
          <select id="aidCounty">
            ${WI_COUNTIES.map((county) => `<option value="${esc(county)}"${aid.county === county ? " selected" : ""}>${esc(county)} County, WI</option>`).join("")}
            <option value=""${aid.county ? "" : " selected"}>Outside Wisconsin</option>
          </select>
        </label>
      </article>
      <article class="card"><h2>Household income</h2>${choiceRow("aid-income", INCOME_OPTIONS, aid.income)}<p class="note">Only used to match programs. It stays on this phone.</p></article>
      <article class="card"><h2>What can you spend on this visit?</h2>${choiceRow("aid-budget", BUDGET_OPTIONS, aid.budget)}</article>

      ${!answered ? `<p class="note">Answer both to see programs that fit.</p>` : `
        ${covered ? `<p class="note">Your budget likely covers the exam. These can help if the vet finds more.</p>` : ""}
        <div class="aid-section">
          <p class="eyebrow">Use now · before or at the visit</p>
          ${result.now.length ? result.now.map(aidMatchCard).join("") : `<p class="note">Nothing for your area yet. Ask the clinic about a payment plan.</p>`}
        </div>
        <div class="aid-section">
          <p class="eyebrow">Apply after the vet’s estimate</p>
          <p class="note">These need the vet’s diagnosis and written estimate. Save the ones you’ll use: we’ll tell you what to ask for at the visit.</p>
          ${result.after.length ? result.after.map(aidMatchCard).join("") : `<p class="note">No grants match these answers.</p>`}
        </div>
        ${result.notForThis.length ? `
          <details class="not-for-this">
            <summary>Not for this case (${result.notForThis.length})</summary>
            ${result.notForThis.map(({ org, why }) => `<p><strong>${esc(org.name)}</strong><br><span class="note">${esc(why)}</span></p>`).join("")}
          </details>` : ""}
      `}

      <button class="primary" id="aidContinue" data-action="book">${saved ? `Continue to booking · ${saved} saved` : "Continue to booking"}</button>
    </section>`;
}

function aidMatchCard({ org, fit, reasons, area }) {
  const saved = (state.plan.aid?.shortlist || []).includes(org.id);
  const fitLabel = { likely: "Likely fits", check: "Check fit", paused: "Paused" }[fit];
  return `
    <article class="card aid-card ${fit}" id="aid_${esc(org.id)}">
      <div class="aid-head">
        <div>
          <h3>${esc(org.name)}</h3>
          <div class="pills"><span class="pill ${fit}">${fitLabel}</span><span class="pill">${esc(area)}</span></div>
        </div>
        <button class="save-toggle" data-action="aid-toggle" data-id="${esc(org.id)}" aria-pressed="${saved}">${saved ? "Saved" : "Save"}</button>
      </div>
      <p><strong>${esc(org.amount)}</strong> <span class="note">· ${esc(org.timing)}</span></p>
      <ul class="reasons">${reasons.map((reason) => `<li>${esc(reason)}</li>`).join("")}</ul>
      ${org.note ? `<p class="note">${esc(org.note)}</p>` : ""}
      <p class="note">${esc(org.apply)} · <a href="${esc(org.url)}" target="_blank" rel="noopener">Program site</a></p>
    </article>`;
}

/** Booking screens: warn when a saved program won't pay this clinic. */
function warningLines(clinicName) {
  const warnings = clinicWarnings(state.plan?.aid?.shortlist, clinicName);
  return warnings.map((text) => `<p class="warn-line">Heads up: ${esc(text)}</p>`).join("");
}

/** What the vet sees about paying (sent inside the booking's triage summary). */
function aidForVet(plan) {
  const aid = plan.aid;
  if (!aid || (!aid.budget && !aid.shortlist?.length && !aid.cover)) return null;
  const programs = (aid.shortlist || []).map((id) => aidOrg(id)?.name).filter(Boolean);
  return {
    cover: aid.cover || "",
    budget: optionLabel(BUDGET_OPTIONS, aid.budget) || (aid.cover === "yes" ? "Can cover the exam" : ""),
    programs,
    fromVet: aidChecklist(aid.shortlist).fromVet
  };
}

function aidForVetLine() {
  const aid = aidForVet(state.plan);
  if (!aid || (!aid.budget && !aid.programs.length)) return "";
  return `<p class="note">They’ll also see: ${esc([aid.budget && `budget ${aid.budget}`, aid.programs.length && `planning to apply to ${aid.programs.join(", ")}`].filter(Boolean).join(" · "))}.</p>`;
}

/** Booking status: what to ask the vet for, what to gather, and where to apply. */
function aidPlanCard(booking) {
  const aid = state.plan?.aid;
  if (!aid?.shortlist?.length) return "";
  const { fromVet, fromOwner } = aidChecklist(aid.shortlist);
  const item = (doc) => `<button class="check-item" data-action="aid-check" data-doc="${esc(doc)}" aria-pressed="${(aid.checked || []).includes(doc)}"><span class="box"></span><span>${esc(doc)}</span></button>`;
  const visited = booking.status === "completed";
  return `
    <article class="card" id="aidPlan">
      <div class="row"><h2>Your aid plan</h2><a class="small" href="#aid" data-go="aid">Edit</a></div>
      <p class="aid-banner"><strong>${visited ? "Apply now, before you pay the bill." : "Apply after the visit, before you pay."}</strong> These programs pay the clinic directly.</p>
      ${fromVet.length ? `<p class="eyebrow">Ask the vet for at the visit</p><div class="checklist">${fromVet.map(item).join("")}</div>` : ""}
      ${fromOwner.length ? `<p class="eyebrow">Gather yourself</p><div class="checklist">${fromOwner.map(item).join("")}</div>` : ""}
      <p class="eyebrow">Apply</p>
      ${aid.shortlist.map((id) => aidOrg(id)).filter(Boolean).map((org) => `<a class="aid-row" href="${esc(org.url)}" target="_blank" rel="noopener"><span>${esc(org.name)}<br><span class="note">${esc(org.apply)}</span></span>${ICONS.chevron}</a>`).join("")}
    </article>`;
}

/** Emergency screen: the programs built for emergencies, plus financing. */
function emergencyAidCard() {
  const county = countyForZip(state.plan?.pet?.zipCode || state.pet?.zipCode);
  const result = matchAid({ level: 4, county, inWisconsin: Boolean(county), income: "skip" });
  const list = [...result.now.filter((item) => item.org.kind !== "referral"), ...result.after].filter((item) => item.fit !== "paused");
  return `
    <article class="card" id="emergencyAid">
      <h2>Paying for emergency care</h2>
      <p class="aid-banner"><strong>Ask the ER for a written estimate, then apply before you pay.</strong> Grants pay the hospital and won’t refund a paid bill.</p>
      ${list.map(({ org }) => `<a class="aid-row" href="${esc(org.url)}" target="_blank" rel="noopener"><span>${esc(org.name)}<br><span class="note">${esc(org.amount)}</span></span>${ICONS.chevron}</a>`).join("")}
    </article>`;
}

function resourceGroup(title, orgs) {
  return `
    <article class="card">
      <h2>${esc(title)}</h2>
      ${orgs.map((org) => `
        <hr>
        <div class="row"><h3>${esc(org.name)}</h3>${org.status === "paused" ? `<span class="pill paused">Paused</span>` : ""}</div>
        <p class="note">${esc(org.area === "national" ? "National" : org.area === "wisconsin" ? "Wisconsin" : org.areaNote || `${org.area.join(", ")} ${org.area.length > 1 ? "counties" : "County"}`)} · ${esc(org.amount)}</p>
        <p class="muted">${esc(org.pays)}</p>
        <p><a href="${esc(org.url)}" target="_blank" rel="noopener">Program site</a></p>`).join("")}
    </article>`;
}

function emergencyView() {
  const reason = state.plan?.urgency === "emergency" ? `<p class="muted">${esc(state.plan.reason)}</p>` : "";
  return `
    <section class="stack">
      <h1>Call an emergency vet now</h1>
      ${reason}
      <a class="primary emergency" href="https://www.google.com/maps/search/emergency+vet+near+me">Find emergency vets near me</a>
      ${emergencyAidCard()}
      ${state.plan?.urgency === "emergency" ? `<button class="ghost" data-action="print">Print or save summary</button><button class="ghost" data-action="start">Start a new check</button>` : ""}
    </section>`;
}




function resources() {
  return `
    <section class="stack">
      <article class="card">
        <h2>Ask about cost</h2>
        <ul>
          <li>What does my dog need today, and what can wait?</li>
          <li>What could change the estimate?</li>
          <li>Are there lower-cost options or payment plans?</li>
        </ul>
      </article>
      ${state.plan && state.plan.urgency !== "emergency" ? `<button class="primary" data-go="aid">Find help for ${esc(displayName(state.plan.pet))}’s visit</button>` : ""}
      ${resourceGroup("Wisconsin", AID_ORGS.filter((org) => org.area !== "national"))}
      ${resourceGroup("National", AID_ORGS.filter((org) => org.area === "national"))}
      <button class="ghost" data-action="clear">Delete saved data</button>
    </section>`;
}

async function beginPlan() {
  state.checking = true;
  render();
  let result = { ok: false, records: [], note: "Clinic websites could not be read just now, so no price is shown." };
  try {
    const response = await fetch("/api/prices", { method: "POST" });
    if (response.ok) result = await response.json();
  } catch {
    result = { ok: false, records: [], note: "Clinic websites could not be read just now, so no price is shown." };
  }
  state.checking = false;
  const plan = evaluate(normalizedPet(), state.answers, new Date(), { records: result.ok ? result.records : [] });
  plan.estimate.liveNote = result.note || "";
  if (plan.estimate.liveNote) plan.estimate.summaryText = `${plan.estimate.summaryText}\n${plan.estimate.liveNote}`;
  state.plan = plan;
  save();
  show("plan");
}

function finishEmergency(reason) {
  state.plan = emergencyPlan(normalizedPet(), state.answers, reason);
  save();
  show("emergency");
}


function printSummary() {
  const text = summaryDocument(state.plan);
  const frame = window.open("", "_blank");
  if (!frame) return;
  frame.document.write(`<!DOCTYPE html><title>PawPlan summary</title><pre style="font: 16px/1.5 Georgia, serif; white-space: pre-wrap; max-width: 680px; margin: 32px auto;">${esc(text)}</pre>`);
  frame.document.close();
  frame.focus();
  frame.print();
}


function choiceCard(title, field, options) {
  return `<article class="card"><h2>${esc(title)}</h2><div class="choices">${options.map(([value, label]) => `<button class="choice" data-action="answer" data-field="${field}" data-value="${value}" aria-pressed="${state.answers[field] === value}">${esc(label)}</button>`).join("")}</div></article>`;
}

function field(label, id, value, placeholder, type = "text") {
  return `<label class="field"><span>${label}</span><input id="${id}" value="${esc(value)}" placeholder="${esc(placeholder)}" inputmode="${type === "decimal" ? "decimal" : "text"}"></label>`;
}

function petReady() {
  return petIsValid(normalizedPet()) && String(state.pet.zipCode).replace(/\D/g, "").length >= 5;
}
function symptomsReady() {
  return state.answers.symptoms.length > 0 || state.answers.notes.trim() !== "";
}
function answersComplete() {
  return symptomsReady() && state.answers.duration && state.answers.energy && state.answers.intake && state.answers.detail;
}
function normalizedPet() {
  return {
    name: state.pet.name,
    age: Number(String(state.pet.age).replace(",", ".")),
    weight: Number(String(state.pet.weight).replace(",", ".")),
    zipCode: state.pet.zipCode
  };
}
function displayName(pet) {
  return (pet?.name || "").trim() || "Your dog";
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function blankPet() { return { name: "", age: "", weight: "", zipCode: "" }; }
function blankAnswers() { return { symptoms: [], notes: "", duration: null, energy: null, intake: null, detail: null }; }
function load() {
  const fresh = { view: "home", step: "pet", pet: blankPet(), answers: blankAnswers(), emergency: {}, plan: null, contact: { name: "", phone: "" } };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.plan) fresh.plan = saved.plan;
    if (saved?.pet) fresh.pet = { ...fresh.pet, ...saved.pet };
    if (saved?.contact) fresh.contact = { ...fresh.contact, ...saved.contact };
  } catch { /* ignore broken local data */ }
  return fresh;
}
function save() {
  localStorage.setItem(KEY, JSON.stringify({ pet: state.pet, plan: state.plan, contact: state.contact }));
}
