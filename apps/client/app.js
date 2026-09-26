import {
  SYMPTOMS, assistance, detailQuestion, emergencyPlan, evaluate, petIsValid,
  summaryDocument, urgencyInfo
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
  chevron: svg(18, '<path d="M9 18l6-6-6-6"/>'),
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
    show(state.view === "booking" ? "plan" : "home");
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
  if (action === "create-plan" && answersComplete()) {
    state.plan = evaluate(normalizedPet(), state.answers);
    save();
    show("plan");
    return;
  }
  if (action === "book") { show("booking"); return; }
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
      </article>
      <article class="card compact" id="costCard">
        <p class="eyebrow">Estimated cost</p>
        <p class="muted">Clinic prices will show here once vets join.</p>
      </article>
      <article class="card compact aid">
        <div class="row"><p class="eyebrow">Help paying</p><a class="small" href="#resources" data-go="resources">All options</a></div>
        ${assistance.slice(0, 3).map((item) => `<a class="aid-row" href="${esc(item.url)}"><span>${esc(item.name)}</span>${ICONS.chevron}</a>`).join("")}
      </article>
      <button class="primary" id="bookVisit" data-action="book">Book a visit</button>
      ${plan.urgency === "monitor" ? `<button class="ghost" data-action="start">Symptoms got worse — check again</button>` : ""}
      <button class="ghost" data-action="print">Print or save summary</button>
    </section>`;
}



function booking() {
  if (!state.plan || state.plan.urgency === "emergency") return emergencyView();
  return `
    <section class="stack">
      <div class="empty"><div class="empty-title">No clinics yet</div><p>Clinics will show here once vets join.</p></div>
    </section>`;
}








function emergencyView() {
  const reason = state.plan?.urgency === "emergency" ? `<p class="muted">${esc(state.plan.reason)}</p>` : "";
  return `
    <section class="stack">
      <h1>Call an emergency vet now</h1>
      ${reason}
      <a class="primary emergency" href="https://www.google.com/maps/search/emergency+vet+near+me">Find emergency vets near me</a>
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
      <article class="card">
        <h2>Financial assistance</h2>
        ${assistance.map((item) => `<hr><h3>${esc(item.name)}</h3><p class="muted">${esc(item.summary)}</p><p><a href="${esc(item.url)}">Details</a></p>`).join("")}
      </article>
      <button class="ghost" data-action="clear">Delete saved data</button>
    </section>`;
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
  const fresh = { view: "home", step: "pet", pet: blankPet(), answers: blankAnswers(), emergency: {}, plan: null };
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
