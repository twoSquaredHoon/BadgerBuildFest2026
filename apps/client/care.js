/** Published veterinary prices and the check that maps symptoms to service categories. Dollar amounts are copied from the cited pages. */

export const COPY = {
  madisonBanner: "Pricing based on available Madison-area data.",
  unavailable: "Local pricing data is not yet available for this area.",
  clinicUnavailable: "Price not publicly available — contact clinic for estimate.",
  serviceUnavailable: "Price unavailable",
  additional: "Additional diagnostics may increase the cost. Your veterinarian will provide the actual treatment estimate.",
  potentialLead: "Potential cost if these listed services are performed",
  startingLead: "Based on currently available Madison-area pricing, an initial exam may start around "
};

const MADISON_ZIPS = new Set([
  "53701", "53703", "53704", "53705", "53706", "53707", "53708",
  "53711", "53713", "53714", "53715", "53716", "53717", "53718",
  "53719", "53726"
]);

const SERVICE_LABELS = {
  routineExam: "Routine exam",
  medicalConcernExam: "Medical-concern exam",
  officeVisit: "Office visit",
  urgentExam: "Urgent-care exam",
  emergencyExam: "Emergency exam",
  newClientExam: "New-client comprehensive exam",
  xray: "X-ray",
  bloodworkCBC: "Bloodwork / CBC",
  preoperativeBloodwork: "Pre-operative bloodwork",
  fecalExam: "Fecal exam",
  allergyTesting: "Allergy-related testing",
  urinalysis: "Urinalysis",
  ivFluids: "IV fluids",
  ultrasound: "Ultrasound",
  earCleaning: "Ear cleaning"
};

const EXAMS = new Set(["routineExam", "medicalConcernExam", "officeVisit", "urgentExam", "emergencyExam", "newClientExam"]);

const EVIDENCE_LABELS = {
  clinicPosted: "Clinic-published price",
  aggregatedMarketEstimate: "Madison-area estimate",
  reportedInvoice: "Reported invoice"
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const SYMPTOMS = ["Vomiting", "Diarrhea", "Limping", "Not eating", "Low energy", "Itchy skin", "Ear discomfort", "Coughing", "Eye irritation", "Urinary changes"];

export const clinics = [
  { id: "precision", name: "Precision Veterinary Madison", neighborhood: "West side · Odana Rd", address: "6107 Odana Rd, Madison, WI 53719", phone: "(608) 405-3148", dayOffset: 0 },
  { id: "banfield-east", name: "Banfield Pet Hospital — Madison East", neighborhood: "East side · E Springs Dr", address: "2216 E Springs Dr, Madison, WI 53704", phone: "(608) 243-1649", dayOffset: 1 },
  { id: "underdog", name: "Underdog Vet Services", neighborhood: "South side · Stoughton Rd", address: "2508 S Stoughton Road, Madison, WI 53716", phone: "(608) 268-7060", dayOffset: 0 },
  { id: "truesdell", name: "Truesdell Animal Care Hospital", neighborhood: "East side · Milwaukee St", address: "4214 Milwaukee Street, Madison, WI 53714", phone: "(608) 244-2555", dayOffset: 1 },
  { id: "wcvc", name: "Wisconsin Community Veterinary Center", neighborhood: "East side · Robertson Rd", address: "4475 Robertson Rd, Madison, WI 53714", phone: "(608) 224-1400", dayOffset: 2 }
];

export const assistance = [
  { id: "wcvc", name: "Wisconsin Community Veterinary Center", summary: "Madison nonprofit clinic. Its financial-assistance page lists payment partners and outside funds, including a Grey Muzzle grant for senior dogs.", eligibility: "Grey Muzzle assistance is described for dogs 7 years and older and requires WCVC’s Veterinary Assistance Program application. Lifeline is described for low-income families. PawPlan does not decide who qualifies.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "lifeline", name: "WCVC Lifeline Veterinary Care Program", summary: "Subsidized or free services at WCVC, including spay/neuter, vaccines, flea and tick prevention, and urgent surgeries.", eligibility: "WCVC describes Lifeline as support for low-income families. An income cutoff is not published on the program page. Confirm eligibility with the clinic.", url: "https://www.wicvc.org/lifeline" },
  { id: "wiscares", name: "WisCARES", summary: "University of Wisconsin program in Madison for subsidized veterinary care, plus social services, pet food, and boarding or foster in some cases.", eligibility: "For Dane County pet owners who are low income, experiencing or at risk of homelessness, or unable to pay for veterinary care needed to access housing. Address: 1402 Emil St., Madison. Phone: (608) 262-3950.", url: "https://wiscares.wisc.edu/about/" },
  { id: "financing", name: "Payment financing listed by WCVC", summary: "WCVC says it partners with Cherry, VetBilling, and CareCredit to spread out bills. These are financing tools, not grants.", eligibility: "VetBilling is described for dentals and surgeries and excludes spay/neuter. Lender approval applies. A payment plan is still money the client owes.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "wcvc-listed-funds", name: "Funds WCVC suggests before a payment plan", summary: "WCVC’s assistance page names Bow Wow Buddies, Heart Finance, Noah’s Animal Fund, Red Rover, and The Pet Fund.", eligibility: "Bow Wow Buddies: up to $2,500 for certain serious or emergency care; not spay/neuter, dentals, preventative care, ongoing treatment, or end-of-life care; not for money needed the same day. Heart Finance: grants up to $500 for one pet in a three-month period; review takes three to four days. Noah’s Animal Fund: Rock, Jefferson, Green, and Walworth counties only, so Dane County is outside that list; not preventative care. Red Rover: life-threatening situations; WCVC says the average grant is about $250 and is meant to fill a small gap. The Pet Fund: non-basic, non-urgent care. Confirm current rules on the WCVC page.", url: "https://www.wicvc.org/financial-assistance" }
];

const ACCESSED = "2026-09-26";

function record(fields) {
  return {
    medianPrice: null,
    geographicArea: "Madison, WI",
    accessedDate: ACCESSED,
    evidence: "clinicPosted",
    confidence: "HIGH",
    publishedDate: null,
    ...fields
  };
}

export const pricingRecords = [
  record({ id: "precision-routine-exam", service: "routineExam", serviceLabel: "Routine exam", lowPrice: "55", highPrice: null, clinicID: "precision", clinicName: "Precision Veterinary Madison", sourceName: "Precision Veterinary Madison", sourceURL: "https://precisionveterinary.com/services/", notes: "Published as routine exams starting at $55. No upper price is published, so no high price is stored." }),
  record({ id: "precision-medical-concern", service: "medicalConcernExam", serviceLabel: "Medical-concern appointment", lowPrice: "75", highPrice: "75", clinicID: "precision", clinicName: "Precision Veterinary Madison", sourceName: "Precision Veterinary Madison", sourceURL: "https://precisionveterinary.com/services/", notes: "Published as a medical-concern appointment price on the clinic services page." }),
  record({ id: "precision-fecal", service: "fecalExam", serviceLabel: "Fecal test", lowPrice: "25", highPrice: "25", clinicID: "precision", clinicName: "Precision Veterinary Madison", sourceName: "Precision Veterinary Madison", sourceURL: "https://precisionveterinary.com/services/", notes: "Published on the add-on services list. The clinic asks clients to bring a stool sample." }),
  record({ id: "precision-ear-cleaning", service: "earCleaning", serviceLabel: "Ear cleaning", lowPrice: "20", highPrice: "20", clinicID: "precision", clinicName: "Precision Veterinary Madison", sourceName: "Precision Veterinary Madison", sourceURL: "https://precisionveterinary.com/services/", notes: "Listed at $20. Free for surgical patients in recovery." }),
  record({ id: "precision-preop-bloodwork", service: "preoperativeBloodwork", serviceLabel: "Pre-operative bloodwork", lowPrice: "65", highPrice: "65", clinicID: "precision", clinicName: "Precision Veterinary Madison", sourceName: "Precision Veterinary Madison", sourceURL: "https://precisionveterinary.com/services/", notes: "Published in the dental section as bloodwork strongly recommended at $65. This is pre-operative bloodwork for a dental procedure, not a diagnostic CBC." }),
  record({ id: "banfield-east-office-visit", service: "officeVisit", serviceLabel: "Office visit", lowPrice: "76.95", highPrice: "76.95", clinicID: "banfield-east", clinicName: "Banfield Pet Hospital — Madison East", sourceName: "Banfield Pet Hospital — Madison East", sourceURL: "https://www.banfield.com/locations/veterinarians/wi/madison/emn/service-pricing", publishedDate: "2025-05-14", notes: "Banfield labels this as an estimate and says pricing may vary. An additional office-visit fee is required for other services, including vaccines." }),
  record({ id: "underdog-urgent-exam", service: "urgentExam", serviceLabel: "Urgent-care walk-in exam", lowPrice: "85", highPrice: "85", clinicID: "underdog", clinicName: "Underdog Vet Services", sourceName: "Underdog Vet Services", sourceURL: "https://www.underdogpetrescue.org/vet-clinic", notes: "Published as the exam fee for urgent-care walk-in appointments, Monday–Friday 1–5 p.m., first come, first served." }),
  record({ id: "truesdell-new-client-exam", service: "newClientExam", serviceLabel: "New-client first comprehensive exam", lowPrice: "38", highPrice: "38", clinicID: "truesdell", clinicName: "Truesdell Animal Care Hospital and Clinic", sourceName: "Truesdell Animal Care Hospital and Clinic", sourceURL: "https://www.trueanimalcare.com/new-client-information/", notes: "New clients’ first comprehensive exam. The offer must be mentioned at or before checkout on the same day and cannot be combined with other discounts." })
];

export function normalizeZip(zip) {
  return String(zip || "").replace(/\D/g, "").slice(0, 5);
}

export function isMadisonZip(zip) {
  const digits = String(zip || "").replace(/\D/g, "");
  return digits.length >= 5 && MADISON_ZIPS.has(digits.slice(0, 5));
}

export function recordsFor(service, clinicID) {
  return pricingRecords.filter((item) => item.service === service && (clinicID == null || item.clinicID === clinicID));
}

export function formatMoney(canonical) {
  return `$${canonical}`;
}

export function canonicalSum(values) {
  const cents = values.reduce((sum, value) => {
    const [whole, frac = ""] = String(value).split(".");
    return sum + Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  }, 0);
  const dollars = Math.trunc(cents / 100);
  const rem = Math.abs(cents % 100);
  return rem === 0 ? String(dollars) : `${dollars}.${String(rem).padStart(2, "0")}`;
}

export function priceLabel(low, high, confidence) {
  if (high && high !== low) {
    const range = `${formatMoney(low)}–${formatMoney(high)}`;
    return confidence === "LOW" ? `about ${range} (limited data)` : range;
  }
  if (confidence === "LOW") return `about ${formatMoney(low)} (limited data)`;
  if (confidence === "MEDIUM") return `about ${formatMoney(low)} (area estimate)`;
  return high == null ? `starts at ${formatMoney(low)}` : formatMoney(low);
}

export function moneyAmounts(text) {
  return text.match(/\$[0-9]+(?:\.[0-9]{2})?/g) || [];
}

function displayDate(iso) {
  const parts = String(iso).split("-");
  if (parts.length !== 3) return iso;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${day}, ${parts[0]}`;
}

function dateText(item) {
  const accessed = `Accessed ${displayDate(item.accessedDate)}`;
  return item.publishedDate ? `Published ${displayDate(item.publishedDate)} · ${accessed}` : accessed;
}

function scopeLabel(item) {
  return item.clinicName ? `Clinic-specific · ${item.geographicArea}` : `${item.geographicArea} estimate`;
}

export function mapServices(answers, urgency) {
  if (urgency === "emergency") return { expectedExam: "emergencyExam", possible: [] };
  const symptoms = new Set(answers.symptoms);
  const possible = [];
  if (symptoms.has("Vomiting") || symptoms.has("Diarrhea")) possible.push("fecalExam", "bloodworkCBC");
  if (symptoms.has("Limping")) possible.push("xray");
  if (symptoms.has("Urinary changes")) possible.push("urinalysis");
  if (symptoms.has("Itchy skin")) possible.push("allergyTesting");
  if (symptoms.has("Ear discomfort")) possible.push("earCleaning");
  return { expectedExam: "medicalConcernExam", possible };
}

function serviceLine(service, supported, hideDollars) {
  const matches = hideDollars ? [] : recordsFor(service);
  if (!(supported && matches.length === 1)) {
    if (supported && matches.length > 1) {
      return { id: service, name: SERVICE_LABELS[service], priceLabel: "Published prices are listed with their sources", confidenceLabel: "", detail: "Each clinic price is listed separately." };
    }
    return { id: service, name: SERVICE_LABELS[service], priceLabel: COPY.serviceUnavailable, confidenceLabel: "", detail: "" };
  }
  const item = matches[0];
  return {
    id: item.id,
    name: item.serviceLabel,
    priceLabel: priceLabel(item.lowPrice, item.highPrice, item.confidence),
    confidenceLabel: item.confidence,
    detail: `${EVIDENCE_LABELS[item.evidence]} · ${item.sourceName}`
  };
}

function provenanceFromRecord(item, applied, unusedNote) {
  return {
    id: item.id,
    service: item.serviceLabel,
    price: priceLabel(item.lowPrice, item.highPrice, item.confidence),
    sourceName: item.sourceName,
    sourceURL: item.sourceURL,
    geographicScope: scopeLabel(item),
    dateText: dateText(item),
    evidenceLabel: EVIDENCE_LABELS[item.evidence],
    confidenceLabel: item.confidence,
    applied,
    notes: applied ? item.notes : `${item.notes} ${unusedNote}`
  };
}

const UNUSED = {
  routineExam: "Wellness price. This check uses the medical-concern exam when a symptom was reported.",
  officeVisit: "Published as an office visit. It is not labeled as a medical-concern exam, so it is not used as that fee.",
  urgentExam: "Urgent-care walk-in fee. It is not used as a medical-concern or emergency exam price.",
  newClientExam: "Promotional first-exam offer for new clients. It is not a general medical-concern fee.",
  preoperativeBloodwork: "Dental pre-operative bloodwork. It is not a diagnostic CBC, so it is not shown as a bloodwork price.",
  earCleaning: "Shown only when ear discomfort is reported."
};

export function estimateCost(mapped, zipCode) {
  const supported = isMadisonZip(zipCode);
  const hideCatalog = !supported || mapped.expectedExam === "emergencyExam";
  const applied = [mapped.expectedExam, ...mapped.possible];
  const expectedRecords = hideCatalog ? [] : recordsFor(mapped.expectedExam);
  const expectedLine = serviceLine(mapped.expectedExam, supported, hideCatalog);
  let startingStatement = COPY.unavailable;
  let expectedPriceLabel = null;
  let expectedCaption = null;
  if (!supported) {
    startingStatement = COPY.unavailable;
  } else if (mapped.expectedExam === "emergencyExam") {
    startingStatement = `${COPY.serviceUnavailable}. Contact an emergency clinic for an estimate.`;
  } else if (expectedRecords.length === 1) {
    const item = expectedRecords[0];
    expectedPriceLabel = formatMoney(item.lowPrice);
    expectedCaption = `${item.serviceLabel} · ${item.clinicName || item.sourceName} · ${item.confidence} · ${EVIDENCE_LABELS[item.evidence]}`;
    startingStatement = `${COPY.startingLead}${expectedPriceLabel}.`;
  } else if (expectedRecords.length === 0) {
    startingStatement = `${expectedLine.name}: ${COPY.serviceUnavailable}.`;
  } else {
    startingStatement = "Based on currently available Madison-area pricing, published initial-exam prices are listed with their sources.";
  }

  const components = [];
  if (!hideCatalog && expectedRecords.length === 1 && expectedRecords[0].lowPrice === expectedRecords[0].highPrice) {
    components.push({ name: expectedRecords[0].serviceLabel, amount: expectedRecords[0].lowPrice });
    for (const service of mapped.possible) {
      const matches = recordsFor(service);
      if (matches.length === 1 && matches[0].lowPrice === matches[0].highPrice) {
        components.push({ name: matches[0].serviceLabel, amount: matches[0].lowPrice });
      }
    }
  }
  const usedComponents = components.length > 1 ? components : [];
  const potentialStatement = usedComponents.length > 1
    ? `${COPY.potentialLead}: ${formatMoney(canonicalSum(usedComponents.map((item) => item.amount)))}. Includes only ${usedComponents.map((item) => `${item.name} (${formatMoney(item.amount)})`).join(" and ")}. This is not a prediction that each listed service will be performed.`
    : null;

  const provenance = applied.map((service) => {
    const matches = hideCatalog ? [] : recordsFor(service);
    if (matches.length === 1) return provenanceFromRecord(matches[0], true, "");
    return { id: `missing-${service}`, service: SERVICE_LABELS[service], price: COPY.serviceUnavailable, sourceName: "", sourceURL: "", geographicScope: "", dateText: "", evidenceLabel: "", confidenceLabel: "", applied: true, notes: "" };
  });
  if (!hideCatalog) {
    const appliedSet = new Set(applied);
    const explanatory = new Set(["routineExam", "officeVisit", "urgentExam", "newClientExam", "preoperativeBloodwork"]);
    for (const item of pricingRecords) {
      if (!appliedSet.has(item.service) && explanatory.has(item.service)) {
        provenance.push(provenanceFromRecord(item, false, UNUSED[item.service] || "Not part of the services selected for this check."));
      }
    }
  }

  const clinicNotes = clinics.map((clinic) => ({ id: clinic.id, clinicName: clinic.name, detail: clinicDetail(clinic, mapped.expectedExam, hideCatalog) }));
  const estimate = {
    zipCode: normalizeZip(zipCode),
    isSupportedRegion: supported,
    mapped,
    regionBanner: supported ? COPY.madisonBanner : COPY.unavailable,
    startingStatement,
    expectedPriceLabel,
    expectedCaption,
    possibleLines: mapped.possible.map((service) => serviceLine(service, supported, hideCatalog)),
    clinicNotes,
    provenance,
    potentialStatement,
    potentialComponentAmounts: usedComponents.map((item) => item.amount),
    additionalDisclaimer: COPY.additional
  };
  estimate.summaryText = summaryText(estimate);
  return estimate;
}

function clinicDetail(clinic, expected, hideCatalog) {
  if (hideCatalog) return COPY.clinicUnavailable;
  const exact = recordsFor(expected, clinic.id)[0];
  if (exact) return `${priceLabel(exact.lowPrice, exact.highPrice, exact.confidence)} · ${exact.serviceLabel}`;
  const other = pricingRecords.find((item) => item.clinicID === clinic.id && EXAMS.has(item.service) && item.service !== expected);
  if (expected === "emergencyExam" || !other) return COPY.clinicUnavailable;
  return `${COPY.clinicUnavailable} This clinic publishes ${priceLabel(other.lowPrice, other.highPrice, other.confidence)} for ${other.serviceLabel.toLowerCase()}, which is a different service.`;
}

function summaryText(estimate) {
  const lines = [estimate.regionBanner, estimate.startingStatement];
  if (estimate.expectedPriceLabel) lines.push(estimate.expectedPriceLabel);
  if (estimate.expectedCaption) lines.push(estimate.expectedCaption);
  for (const line of estimate.possibleLines) lines.push(`${line.name}: ${line.priceLabel}`);
  if (estimate.potentialStatement) lines.push(estimate.potentialStatement);
  lines.push(estimate.additionalDisclaimer);
  for (const note of estimate.clinicNotes) lines.push(`${note.clinicName}: ${note.detail}`);
  lines.push("How this was estimated:");
  for (const item of estimate.provenance) {
    lines.push(`${item.service} — ${item.price}`);
    if (item.sourceName) {
      lines.push(`Source: ${item.sourceName} ${item.sourceURL}`);
      lines.push(`${item.geographicScope}. ${item.dateText}. ${item.evidenceLabel}. ${item.confidenceLabel}.`);
    }
    if (item.notes) lines.push(item.notes);
    if (!item.applied) lines.push("Not used as the starting price for this check.");
  }
  return lines.join("\n");
}

const URGENCY = {
  monitor: { level: 1, title: "Keep a close eye", timing: "Monitor and call if concerned" },
  fewDays: { level: 2, title: "Plan a vet visit", timing: "Within the next few days" },
  soon: { level: 3, title: "Call a vet today", timing: "Today or as your vet advises" },
  emergency: { level: 4, title: "Get emergency help", timing: "Contact an emergency vet now" }
};

export function urgencyInfo(key) {
  return URGENCY[key];
}

export function urgencyScale() {
  return Object.entries(URGENCY).map(([key, info]) => ({ key, ...info }));
}

export function windowHours(urgency) {
  return urgency === "soon" ? 24 : 72;
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
    estimate: estimateCost(mapServices(answers, urgency), pet.zipCode),
    booking: null
  };
}

export function emptyAnswers() {
  return { symptoms: [], notes: "", duration: null, energy: null, intake: null, detail: null };
}

export function slotsFor(clinic, carePlan, now = new Date()) {
  if (carePlan.urgency === "emergency") return [];
  const created = new Date(carePlan.createdAt);
  const deadline = created.getTime() + windowHours(carePlan.urgency) * 3600 * 1000;
  const start = new Date(created);
  start.setHours(0, 0, 0, 0);
  const slots = [];
  for (let day = clinic.dayOffset; day <= 3; day += 1) {
    for (const hour of [9, 11, 14, 16]) {
      const slot = new Date(start);
      slot.setDate(start.getDate() + day);
      slot.setHours(hour, 0, 0, 0);
      if (slot.getTime() > now.getTime() + 30 * 60 * 1000 && slot.getTime() <= deadline) slots.push(slot.toISOString());
    }
  }
  return slots;
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
    carePlan.estimate.summaryText,
    "",
    carePlan.booking
      ? `DEMO APPOINTMENT: ${carePlan.booking.clinicName}\n${new Date(carePlan.booking.when).toLocaleString()}\n${carePlan.booking.address}\nNo appointment has been reserved or sent to a clinic.`
      : "No appointment reserved.",
    "",
    "Urgency rules are a demonstration, not clinical AI or a diagnosis. Appointment times are sample openings and are not reserved. Dollar amounts are included only when a published source is stored with this plan. Contact a veterinarian for medical advice."
  ].join("\n");
}
