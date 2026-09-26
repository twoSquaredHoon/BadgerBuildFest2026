import {
  SYMPTOMS, assistance, clinics, detailQuestion, emergencyPlan, evaluate, petIsValid,
  slotsFor, summaryDocument, urgencyInfo, urgencyScale
} from "./care.js";

const KEY = "pawplan.web.v1";
const EMERGENCY_CHECKS = [
  ["Breathing", "Trouble breathing, choking, or blue / very pale gums?"],
  ["Alertness and injury", "Collapse, a seizure, major injury, or uncontrolled bleeding?"],
  ["Other urgent signs", "Possible poisoning, a swollen painful belly, or straining without passing urine?"]
];

const TAB_TITLES = { home: "Home", plan: "My plan", resources: "Resources", emergency: "Emergency" };
const FLOW_TITLES = { check: "Symptom check", booking: "Book a visit" };

const svg = (size, paths) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  back: svg(22, '<path d="M15 18l-6-6 6-6"/>'),
  home: svg(24, '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  plan: svg(24, '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>'),
  resources: svg(24, '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
  emergency: svg(24, '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>')
};

const state = load();
const app = document.querySelector("#app");

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
  render();
  window.scrollTo(0, 0);
}

/** Same page frame as the vet side: tab screens get a large header and a bottom tab bar; step-by-step screens get a back header. */
function render() {
  const views = { home, check, plan: planView, emergency: emergencyView, booking, resources };
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
  if (field.id === "regularVet") state.regularVet = field.value;
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
    if (state.view === "booking") action = state.bookingStep === "done" ? "done-booking" : "back-booking";
    else { show("home"); return; }
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
  if (action === "create-plan" && answersComplete()) {
    state.plan = evaluate(normalizedPet(), state.answers);
    save();
    show("plan");
    return;
  }
  if (action === "book") { state.bookingStep = "clinics"; state.chosenClinic = null; state.chosenSlot = null; show("booking"); return; }
  if (action === "sort") { state.sort = button.dataset.sort; render(); return; }
  if (action === "pick-clinic") { state.chosenClinic = button.dataset.clinic; state.bookingStep = "time"; render(); return; }
  if (action === "pick-slot") { state.chosenSlot = button.dataset.slot; render(); return; }
  if (action === "review-booking") { state.bookingStep = "review"; render(); return; }
  if (action === "confirm-booking") return confirmBooking();
  if (action === "back-booking") {
    if (state.bookingStep === "review") state.bookingStep = "time";
    else if (state.bookingStep === "time") { state.bookingStep = "clinics"; state.chosenSlot = null; }
    else show("plan");
    render();
    return;
  }
  if (action === "done-booking") show("plan");
  if (action === "cancel-booking") { state.plan.booking = null; save(); show("plan"); return; }
  if (action === "print") { printSummary(); return; }
  if (action === "clear") { localStorage.removeItem(KEY); state.plan = null; state.pet = blankPet(); show("home"); }
}

function home() {
  const saved = state.plan ? `<a class="card sage" href="#plan" data-go="plan"><strong>${esc(displayName(state.plan.pet))}’s saved plan</strong><p class="muted">Pick up where you left off</p></a>` : "";
  return `
    <section class="stack">
      <p class="eyebrow">A little less worry. A clear next step.</p>
      <h1>Big love.<br>Fewer unknowns.</h1>
      <p class="muted">When your dog isn’t quite themselves, see what a visit may involve and which published Madison prices apply.</p>
      <div class="hero-actions">
        <button class="primary" data-action="start" id="startCheck">Check my dog’s symptoms</button>
        <button class="ghost" data-go="emergency">Something feels urgent? Find emergency help</button>
      </div>
      ${saved}
      <p class="note">Urgency guidance and booking times are demonstrations, not a diagnosis or a clinic reservation. Dollar amounts appear only when a published source is on file.</p>
    </section>`;
}

function check() {
  const stepIndex = ["pet", "emergency", "symptoms", "questions"].indexOf(state.step);
  const steps = `<div class="steps" aria-label="Step ${stepIndex + 1} of 4">${[0, 1, 2, 3].map((index) => `<i class="${index <= stepIndex ? "on" : ""}"></i>`).join("")}</div>`;
  const body = { pet: petStep, emergency: emergencyStep, symptoms: symptomStep, questions: questionStep }[state.step]();
  return `<section class="stack">${steps}${body}</section>`;
}

function petStep() {
  return `
    <p class="eyebrow">01 / Meet your dog</p>
    <h1>Who’s your little sidekick?</h1>
    <div class="card">
      <p>Dogs only, for now.</p>
      ${field("Name", "petName", state.pet.name, "Your dog’s name (optional)")}
      ${field("Age in years", "petAge", state.pet.age, "e.g. 3 or 0.5", "decimal")}
      ${field("Weight in pounds", "petWeight", state.pet.weight, "e.g. 25", "decimal")}
      ${field("ZIP code", "petZip", state.pet.zipCode, "e.g. 53703", "text")}
    </div>
    <p class="note">Enter an age from 0–30 years and a weight above 0 and up to 350 lb. Madison ZIP codes use published local prices. Other ZIP codes are not given Madison prices.</p>
    <button class="primary" id="continuePet" data-action="continue-pet" ${petReady() ? "" : "disabled"}>Continue to safety check</button>
    <button class="ghost" data-action="emergency-now">Get emergency help now</button>`;
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
    <p class="eyebrow">02 / Safety first</p>
    <h1>First, let’s check the urgent things.</h1>
    <p class="muted">Is ${esc(displayName(state.pet))} showing any of these signs right now?</p>
    ${cards}
    <button class="primary" id="continueSafety" data-action="continue-safety" ${ready ? "" : "disabled"}>None of these — continue</button>
    <p class="note">This list cannot cover every emergency. If you’re concerned, call a veterinarian now.</p>`;
}

function symptomStep() {
  const selected = new Set(state.answers.symptoms);
  const chips = SYMPTOMS.map((symptom) => `<button class="chip" data-action="symptom" data-symptom="${esc(symptom)}" id="symptom_${esc(symptom)}" aria-pressed="${selected.has(symptom)}">${esc(symptom)}</button>`).join("");
  return `
    <p class="eyebrow">03 / What’s going on?</p>
    <h1>What have you noticed?</h1>
    <div class="chips">${chips}</div>
    <label class="card field"><span>Anything else?</span><textarea id="notes" maxlength="1500">${esc(state.answers.notes)}</textarea><small id="noteCount" class="note">${state.answers.notes.length} / 1,500</small></label>
    <button class="primary" id="continueSymptoms" data-action="continue-symptoms" ${symptomsReady() ? "" : "disabled"}>A few quick questions</button>`;
}

function questionStep() {
  return `
    <p class="eyebrow">04 / The little details</p>
    <h1>Help us see the full picture.</h1>
    ${choiceCard("When did it start?", "duration", [["recent", "Today"], ["yesterday", "1–2 days"], ["longer", "3+ days"]])}
    ${choiceCard("How is their energy?", "energy", [["normal", "Like usual"], ["reduced", "Quieter than usual"], ["severe", "Very weak / collapsing"]])}
    ${choiceCard("Are they eating and drinking?", "intake", [["normal", "Eating & drinking"], ["reduced", "Eating or drinking less"], ["unable", "Cannot keep water down"]])}
    ${choiceCard(detailQuestion(state.answers.symptoms), "detail", [["mild", "Mild / occasional"], ["repeated", "Repeated / worsening"], ["redFlag", "Blood or severe pain"]])}
    <p class="note">Urgency uses fixed demo rules, not a clinical AI. Dollar amounts appear only when a published source is on file.</p>
    <button class="primary" id="createPlan" data-action="create-plan" ${answersComplete() ? "" : "disabled"}>See my care plan</button>`;
}

function planView() {
  if (!state.plan) {
    return `<section class="stack"><h1>A little clarity goes a long way.</h1><p class="muted">Start a check to save your dog’s care summary.</p><button class="primary" data-action="start">Start a symptom check</button></section>`;
  }
  if (state.plan.urgency === "emergency") return emergencyView();
  const plan = state.plan;
  const info = urgencyInfo(plan.urgency);
  const estimate = plan.estimate;
  const booking = plan.booking ? `<article class="card"><p class="badge">Demo appointment saved</p><h2>${esc(plan.booking.clinicName)}</h2><p>${esc(formatWhen(plan.booking.when))}</p><p class="muted">${esc(plan.booking.address)}</p><p>${esc(clinicNote(plan, plan.booking.clinicId))}</p><p class="note">This is a practice booking. No clinic has received it.</p><button class="ghost" data-action="book">Reschedule</button><button class="ghost" data-action="cancel-booking">Cancel demo appointment</button></article>` : "";
  const possible = estimate.possibleLines.length ? `<hr><h2>Possible additional services</h2><p class="note">These are not assumed to be part of the visit.</p>${estimate.possibleLines.map((line) => `<div class="row"><div><strong>${esc(line.name)}</strong>${line.confidenceLabel ? `<div class="confidence">${esc(line.confidenceLabel)}</div>` : ""}</div><span>${esc(line.priceLabel)}</span></div>`).join("")}` : "";
  const price = estimate.expectedPriceLabel ? `<p class="price">${esc(estimate.expectedPriceLabel)}</p><p class="note">${esc(estimate.expectedCaption || "")}</p>` : "";
  const starting = estimate.startingStatement === estimate.regionBanner ? "" : `<p>${esc(estimate.startingStatement)}</p>`;
  return `
    <section class="stack">
      <p class="eyebrow">A plan for ${esc(displayName(plan.pet))}</p>
      <article class="card">
        <p class="badge ${plan.urgency}">Level ${info.level} · ${esc(info.title)}</p>
        <h2>${esc(info.title)}</h2>
        <p>${esc(info.timing)}</p>
        <p class="muted">${esc(plan.reason)}</p>
        ${urgencyScaleMarkup(plan.urgency)}
        <hr>
        <p><strong>${esc(displayName(plan.pet))}</strong><br><span class="muted">Dog · ${esc(plan.pet.age)} years · ${esc(plan.pet.weight)} lb · ZIP ${esc(plan.pet.zipCode || "not provided")}</span></p>
        <p>${esc(plan.answers.symptoms.join(", "))}</p>
        ${plan.answers.notes ? `<p class="muted">${esc(plan.answers.notes)}</p>` : ""}
      </article>
      ${booking}
      <article class="card sage" id="costCard">
        <p class="eyebrow">Let’s talk about cost</p>
        <p id="pricingBanner"><strong>${esc(estimate.regionBanner)}</strong></p>
        ${starting}
        ${price}
        ${possible}
        ${estimate.potentialStatement ? `<p class="note">${esc(estimate.potentialStatement)}</p>` : ""}
        <hr>
        <h2>Clinics</h2>
        ${estimate.clinicNotes.map((note) => `<div><strong>${esc(note.clinicName)}</strong><p class="note">${esc(note.detail)}</p></div>`).join("")}
        <details id="howWeEstimated">
          <summary>How we estimated this</summary>
          <div class="provenance">
            ${estimate.provenance.map((line) => `<div><strong>${esc(line.service)}</strong><p>${esc(line.price)}</p>${line.sourceName ? `<p>Source: ${esc(line.sourceName)}</p><p><a href="${esc(line.sourceURL)}">View source</a></p><p>${esc(line.geographicScope)}</p><p>${esc(line.dateText)}</p><p>${esc(line.evidenceLabel)} ${esc(line.confidenceLabel)}</p>` : ""}${line.applied ? "" : "<p>Not used as the starting price for this check.</p>"}<p class="note">${esc(line.notes)}</p></div>`).join("")}
          </div>
        </details>
        <p class="note">${esc(estimate.additionalDisclaimer)}</p>
      </article>
      <article class="card">
        <h2>Questions for your vet</h2>
        <p class="note">Possible discussion topics, not diagnoses.</p>
        <ul>${plan.topics.map((topic) => `<li>${esc(topic)}</li>`).join("")}</ul>
      </article>
      ${plan.urgency === "monitor" ? `<article class="card"><h2>While you keep an eye on them</h2><p class="muted">Write down changes in appetite, energy, and symptoms. Call if they persist. Do not give medication without veterinary advice.</p><button class="ghost" data-action="start">Symptoms got worse — check again</button></article>` : ""}
      <a class="card" href="#resources" data-go="resources"><strong>Care that fits your budget</strong><p class="muted">Financial assistance and questions to ask</p></a>
      ${plan.booking ? "" : `<button class="primary" id="bookVisit" data-action="book">${plan.urgency === "monitor" ? "Explore demo booking anyway" : "Explore demo appointments"}</button>`}
      <button class="ghost" data-action="print">Print or save this summary</button>
    </section>`;
}

function booking() {
  if (!state.plan || state.plan.urgency === "emergency") return emergencyView();
  if (state.bookingStep === "time") return timeStep();
  if (state.bookingStep === "review") return reviewStep();
  if (state.bookingStep === "done") return doneStep();
  const available = clinics.map((clinic) => ({ clinic, slots: slotsFor(clinic, state.plan) })).filter((item) => item.slots.length);
  available.sort((a, b) => state.sort === "name" ? a.clinic.name.localeCompare(b.clinic.name) : a.slots[0].localeCompare(b.slots[0]));
  return `
    <section class="stack">
      <p class="eyebrow">Find a clinic</p>
      <h1>Good care, a little closer.</h1>
      <p class="note">Clinic names and published prices are real. These openings are samples, not live appointments. No visit will be reserved.</p>
      <div class="choices"><button class="choice" data-action="sort" data-sort="soonest" aria-pressed="${state.sort !== "name"}">Soonest</button><button class="choice" data-action="sort" data-sort="name" aria-pressed="${state.sort === "name"}">Name</button></div>
      ${available.map(({ clinic, slots }) => `<button class="card" data-action="pick-clinic" data-clinic="${clinic.id}" id="clinic_${clinic.id}"><strong>${esc(clinic.name)}</strong><p class="muted">${esc(clinic.neighborhood)} · ${esc(clinic.phone)}</p><p>${esc(clinicNote(state.plan, clinic.id))}</p><p>Next sample time: ${esc(formatWhen(slots[0]))}</p></button>`).join("")}
      <label class="card field"><span>Already have a vet?</span><input id="regularVet" value="${esc(state.regularVet)}" placeholder="Your vet’s name"><p class="note">${state.regularVet.trim() ? `Contact ${esc(state.regularVet)} directly. This site cannot reserve a real visit.` : "Call your regular vet and bring your summary. Real clinic booking is not connected."}</p></label>
      <button class="ghost" data-action="back-booking">Back to my plan</button>
    </section>`;
}

function timeStep() {
  const clinic = clinics.find((item) => item.id === state.chosenClinic);
  const slots = slotsFor(clinic, state.plan);
  return `
    <section class="stack">
      <h1>A time that works for you.</h1>
      <p class="muted">${esc(clinic.name)}</p>
      <p class="note">Sample openings only. All times use your device’s time zone.</p>
      ${slots.map((slot) => `<button class="slot" data-action="pick-slot" data-slot="${esc(slot)}" aria-pressed="${state.chosenSlot === slot}">${esc(formatWhen(slot))}</button>`).join("")}
      <button class="primary" id="reviewBooking" data-action="review-booking" ${state.chosenSlot ? "" : "disabled"}>Review demo visit</button>
    </section>`;
}

function reviewStep() {
  const clinic = clinics.find((item) => item.id === state.chosenClinic);
  return `
    <section class="stack">
      <h1>One last look.</h1>
      <article class="card">
        <h2>${esc(clinic.name)}</h2>
        <p>${esc(formatWhen(state.chosenSlot))}</p>
        <p>${esc(displayName(state.plan.pet))} · ${esc(state.plan.answers.symptoms.join(", "))}</p>
        <p>${esc(clinicNote(state.plan, clinic.id))}</p>
      </article>
      <p class="note">Your summary stays in this browser. No clinic is contacted, no slot is reserved, and there is no payment.</p>
      <button class="primary" id="confirmBooking" data-action="confirm-booking">Save demo appointment</button>
    </section>`;
}

function doneStep() {
  const booking = state.plan.booking;
  return `
    <section class="stack">
      <p class="eyebrow" id="demoSaved">Demo appointment saved</p>
      <h1>One less thing on your mind.</h1>
      <article class="card">
        <h2>${esc(booking.clinicName)}</h2>
        <p>${esc(formatWhen(booking.when))}</p>
        <p class="muted">${esc(booking.address)}</p>
        <p>For a real visit, bring your care summary, medications, and questions about cost.</p>
      </article>
      <p class="note">This is not a real reservation. Contact a veterinary clinic to arrange care.</p>
      <button class="primary" id="finishBooking" data-action="done-booking">Back to my care plan</button>
    </section>`;
}

function emergencyView() {
  const reason = state.plan?.urgency === "emergency" ? `<p class="muted">${esc(state.plan.reason)}</p>` : "";
  return `
    <section class="stack">
      <p class="eyebrow">Emergency help</p>
      <h1>Let’s get you to a veterinarian.</h1>
      <p>Call an emergency vet now. You don’t need to finish this check or book an appointment here.</p>
      ${reason}
      ${state.plan?.urgency === "emergency" ? urgencyScaleMarkup("emergency") : ""}
      <article class="card">
        <div class="row"><h2>VEG Madison</h2><span class="badge">24/7</span></div>
        <p class="muted">7456 Mineral Point Road<br>Madison, WI 53717</p>
        <a class="primary emergency" href="tel:+16087163255">Call (608) 716-3255</a>
        <a href="https://maps.google.com/?daddr=7456+Mineral+Point+Road+Madison+WI+53717">Get directions</a>
        <a href="https://www.veg.com/locations/wisconsin/madison">Clinic details</a>
      </article>
      <article class="card">
        <h2>Another Madison option</h2>
        <p class="muted">UW Veterinary Care · 24/7 emergency services</p>
        <a href="tel:+16082637600">Call (608) 263-7600</a>
      </article>
      <p class="note">These are Madison contacts, not a nearest-clinic search. If you’re elsewhere, find your closest emergency veterinarian.</p>
      ${state.plan?.urgency === "emergency" ? `<button class="ghost" data-action="print">Print or save this summary</button><button class="ghost" data-action="start">Start a new check</button>` : ""}
    </section>`;
}

function urgencyScaleMarkup(current) {
  return `
    <div class="scale" aria-label="Urgency levels">
      <p class="eyebrow">How this compares</p>
      ${urgencyScale().map((item) => {
        const yours = item.key === current;
        return `<div class="scale-row ${item.key}${yours ? " current" : ""}">
          <span class="scale-level">${item.level}</span>
          <div>
            <strong>${esc(item.title)}</strong>
            ${yours ? `<span class="yours">Your result</span>` : ""}
            <p class="note">${esc(item.timing)}</p>
          </div>
        </div>`;
      }).join("")}
    </div>
    <p class="note">This scale is a demonstration so you can see where this result sits. It is not a diagnosis.</p>`;
}

function resources() {
  return `
    <section class="stack">
      <p class="eyebrow">In your corner</p>
      <h1>Good questions. Better conversations.</h1>
      <article class="card sage"><h2>It’s okay to talk about your budget.</h2><p>Tell the clinic what you can afford early. Ask for a written estimate.</p></article>
      <article class="card">
        <h2>Take these with you</h2>
        <p><strong>What does my dog need today?</strong><br><span class="muted">Ask which parts are essential and which can safely wait.</span></p>
        <p><strong>What could change the estimate?</strong><br><span class="muted">Ask about follow-up visits, medications, and additional tests.</span></p>
        <p><strong>Are there lower-cost options?</strong><br><span class="muted">Ask about staged treatment, payment arrangements, or local assistance.</span></p>
      </article>
      <article class="card">
        <h2>Financial assistance</h2>
        <p class="note">PawPlan does not check eligibility or submit an application. Confirm the current rules with each program.</p>
        ${assistance.map((item) => `<hr><h3>${esc(item.name)}</h3><p>${esc(item.summary)}</p><p class="note">${esc(item.eligibility)}</p><p><a href="${esc(item.url)}">Program details</a></p>`).join("")}
      </article>
      <article class="card">
        <h2>Your information stays in this browser</h2>
        <p class="muted">The latest plan is saved locally. There is no account. Printing happens only when you choose it.</p>
        <button class="ghost" data-action="clear">Delete saved pet and care plan</button>
      </article>
      <p class="note">Urgency rules are a demonstration, not clinical AI. Dollar amounts are limited to published sources. Booking times are sample openings.</p>
    </section>`;
}

function finishEmergency(reason) {
  state.plan = emergencyPlan(normalizedPet(), state.answers, reason);
  save();
  show("emergency");
}

function confirmBooking() {
  const clinic = clinics.find((item) => item.id === state.chosenClinic);
  const slots = slotsFor(clinic, state.plan);
  if (!slots.includes(state.chosenSlot)) {
    state.bookingStep = "time";
    state.chosenSlot = null;
    render();
    return;
  }
  state.plan.booking = { clinicId: clinic.id, clinicName: clinic.name, address: clinic.address, when: state.chosenSlot };
  save();
  state.bookingStep = "done";
  render();
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

function clinicNote(plan, clinicId) {
  return plan.estimate.clinicNotes.find((note) => note.id === clinicId)?.detail || "Price not publicly available — contact clinic for estimate.";
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
function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function blankPet() { return { name: "", age: "", weight: "", zipCode: "" }; }
function blankAnswers() { return { symptoms: [], notes: "", duration: null, energy: null, intake: null, detail: null }; }
function load() {
  const fresh = { view: "home", step: "pet", pet: blankPet(), answers: blankAnswers(), emergency: {}, plan: null, sort: "soonest", bookingStep: "clinics", chosenClinic: null, chosenSlot: null, regularVet: "" };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.plan) fresh.plan = saved.plan;
    if (saved?.pet) fresh.pet = { ...fresh.pet, ...saved.pet };
  } catch { /* ignore broken local data */ }
  return fresh;
}
function save() {
  localStorage.setItem(KEY, JSON.stringify({ pet: state.pet, plan: state.plan }));
}
