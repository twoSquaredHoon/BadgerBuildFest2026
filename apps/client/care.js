/** Symptom check rules, urgency levels, and financial-assistance programs for PawPlan. Clinics, prices and appointment times will come from the backend. */

export const SYMPTOMS = ["Vomiting", "Diarrhea", "Limping", "Not eating", "Low energy", "Itchy skin", "Ear discomfort", "Coughing", "Eye irritation", "Urinary changes"];

export const assistance = [
  { id: "wcvc", name: "Wisconsin Community Veterinary Center", summary: "Madison nonprofit clinic. Its financial-assistance page lists payment partners and outside funds, including a Grey Muzzle grant for senior dogs.", eligibility: "Grey Muzzle assistance is described for dogs 7 years and older and requires WCVC’s Veterinary Assistance Program application. Lifeline is described for low-income families. PawPlan does not decide who qualifies.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "lifeline", name: "WCVC Lifeline Veterinary Care Program", summary: "Subsidized or free services at WCVC, including spay/neuter, vaccines, flea and tick prevention, and urgent surgeries.", eligibility: "WCVC describes Lifeline as support for low-income families. An income cutoff is not published on the program page. Confirm eligibility with the clinic.", url: "https://www.wicvc.org/lifeline" },
  { id: "wiscares", name: "WisCARES", summary: "University of Wisconsin program in Madison for subsidized veterinary care, plus social services, pet food, and boarding or foster in some cases.", eligibility: "For Dane County pet owners who are low income, experiencing or at risk of homelessness, or unable to pay for veterinary care needed to access housing. Address: 1402 Emil St., Madison. Phone: (608) 262-3950.", url: "https://wiscares.wisc.edu/about/" },
  { id: "financing", name: "Payment financing listed by WCVC", summary: "WCVC says it partners with Cherry, VetBilling, and CareCredit to spread out bills. These are financing tools, not grants.", eligibility: "VetBilling is described for dentals and surgeries and excludes spay/neuter. Lender approval applies. A payment plan is still money the client owes.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "wcvc-listed-funds", name: "Funds WCVC suggests before a payment plan", summary: "WCVC’s assistance page names Bow Wow Buddies, Heart Finance, Noah’s Animal Fund, Red Rover, and The Pet Fund.", eligibility: "Bow Wow Buddies: up to $2,500 for certain serious or emergency care; not spay/neuter, dentals, preventative care, ongoing treatment, or end-of-life care; not for money needed the same day. Heart Finance: grants up to $500 for one pet in a three-month period; review takes three to four days. Noah’s Animal Fund: Rock, Jefferson, Green, and Walworth counties only, so Dane County is outside that list; not preventative care. Red Rover: life-threatening situations; WCVC says the average grant is about $250 and is meant to fill a small gap. The Pet Fund: non-basic, non-urgent care. Confirm current rules on the WCVC page.", url: "https://www.wicvc.org/financial-assistance" }
];

const URGENCY = {
  monitor: { level: 1, title: "Keep a close eye", timing: "Monitor and call if concerned" },
  fewDays: { level: 2, title: "Plan a vet visit", timing: "Within the next few days" },
  soon: { level: 3, title: "Call a vet today", timing: "Today or as your vet advises" },
  emergency: { level: 4, title: "Get emergency help", timing: "Contact an emergency vet now" }
};

export function normalizeZip(zip) {
  return String(zip || "").replace(/\D/g, "").slice(0, 5);
}

export function urgencyInfo(key) {
  return URGENCY[key];
}

export function urgencyScale() {
  return Object.entries(URGENCY).map(([key, info]) => ({ key, ...info }));
}

export function petIsValid(pet) {
  const age = Number(pet.age);
  const weight = Number(pet.weight);
  return Number.isFinite(age) && Number.isFinite(weight) && age >= 0 && age <= 30 && weight > 0 && weight <= 350;
}

export function detailQuestion(symptoms) {
  const selected = new Set(symptoms);
  if (selected.has("Vomiting") || selected.has("Diarrhea")) return "How frequent or severe are the episodes?";
  if (selected.has("Limping")) return "How much is movement affected?";
  if (selected.has("Itchy skin") || selected.has("Ear discomfort")) return "How much is the irritation bothering them?";
  return "How would you describe the symptoms?";
}

export function evaluate(pet, answers, now = new Date()) {
  if (answers.energy === "severe" || answers.detail === "redFlag" || answers.intake === "unable") {
    return emergencyPlan(pet, answers, "You reported a potentially serious sign. Contact an emergency veterinarian for immediate guidance.", now);
  }
  const symptoms = answers.symptoms || [];
  const notes = (answers.notes || "").trim();
  const onlyMildSkin = symptoms.length === 1 && symptoms[0] === "Itchy skin" && notes === "";
  const age = Number(pet.age);
  const mild = onlyMildSkin && answers.duration === "recent" && answers.energy === "normal" && answers.intake === "normal" && answers.detail === "mild" && age >= 1 && age < 10;
  const concerning = answers.duration === "longer" || answers.energy === "reduced" || answers.intake === "reduced" || answers.detail === "repeated" || age < 1 || age >= 10 || notes !== "" || ["Eye irritation", "Urinary changes", "Not eating", "Low energy"].some((item) => symptoms.includes(item));
  const urgency = mild ? "monitor" : concerning ? "soon" : "fewDays";
  const digestive = symptoms.includes("Vomiting") || symptoms.includes("Diarrhea");
  const skin = symptoms.includes("Itchy skin") || symptoms.includes("Ear discomfort");
  const topics = digestive
    ? ["Digestive irritation", "Something eaten or swallowed", "Hydration assessment"]
    : skin
      ? ["Skin or ear irritation", "Allergies or parasites", "Whether an exam or sample is needed"]
      : ["A physical exam to understand the symptoms", "Whether testing or treatment is needed"];
  const reason = urgency === "monitor"
    ? "This demo scenario shows mild, recent itching with otherwise normal behavior. A veterinarian should confirm whether monitoring is appropriate."
    : "Your answers suggest arranging veterinary advice. A clinician can determine the right timing and tests for your dog.";
  return plan(pet, answers, urgency, reason, topics, now);
}

export function emergencyPlan(pet, answers, reason, now = new Date()) {
  return plan(pet, answers || emptyAnswers(), "emergency", reason, [], now);
}

function plan(pet, answers, urgency, reason, topics, now) {
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  return {
    createdAt,
    pet: { ...pet, zipCode: normalizeZip(pet.zipCode) },
    answers,
    urgency,
    reason,
    topics,
  };
}

export function emptyAnswers() {
  return { symptoms: [], notes: "", duration: null, energy: null, intake: null, detail: null };
}

export function summaryDocument(carePlan) {
  const pet = carePlan.pet;
  const name = (pet.name || "").trim() || "Your dog";
  const answers = carePlan.answers || emptyAnswers();
  const info = urgencyInfo(carePlan.urgency);
  return [
    "PAWPLAN • CARE SUMMARY",
    new Date(carePlan.createdAt).toLocaleString(),
    "",
    `${name} — Dog · ${pet.age} years · ${pet.weight} lb`,
    `ZIP: ${pet.zipCode || "Not provided"}`,
    `Reported symptoms: ${answers.symptoms.length ? answers.symptoms.join(", ") : "See notes / emergency check"}`,
    `Notes: ${answers.notes?.trim() ? answers.notes.trim() : "None"}`,
    "",
    `YOUR RESULT — LEVEL ${info.level}: ${info.title}`,
    info.timing,
    "All levels:",
    ...urgencyScale().map((item) => `${item.key === carePlan.urgency ? ">" : " "} Level ${item.level}: ${item.title} — ${item.timing}`),
    carePlan.reason,
    "",
    `Discussion topics (not diagnoses): ${carePlan.topics.join("; ") || "None"}`,
    "",
    "Urgency rules are a demonstration, not a diagnosis. Contact a veterinarian for medical advice."
  ].join("\n");
}
