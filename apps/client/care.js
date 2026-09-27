/** Symptom check rules, urgency levels, related conditions (from the health-record datasets), published Wisconsin price estimates, and financial-assistance programs for PawPlan. */

import { clinics as clinicList, pricingRecords as priceList } from "./pricing-data.js";
import { ZIP_CENTROIDS } from "./zip-centroids.js";
import { SYMPTOM_ROWS } from "./pet-symptoms.js";
import { DISEASE_CASES } from "./disease-cases.js";

// Price estimate: published Wisconsin clinic prices ranked by distance from the owner's ZIP (pricing-data.js, zip-centroids.js).
export const clinics = clinicList;
export const pricingRecords = priceList;

export const COPY = {
  unavailable: "Local pricing data is not yet available for this area.",
  clinicUnavailable: "Price not publicly available — contact clinic for estimate.",
  serviceUnavailable: "Price unavailable",
  additional: "Additional diagnostics may increase the cost. Your veterinarian will provide the actual treatment estimate.",
  potentialLead: "Potential cost if these listed services are performed",
  closerNote: "No qualifying published price was found closer to your ZIP code.",
  localLead: "Published veterinary prices near ",
  fartherLead: "Closest publicly available Wisconsin pricing"
};

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
  aggregatedMarketEstimate: "Unsourced market estimate",
  reportedInvoice: "Reported invoice"
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const SYMPTOMS = ["Vomiting", "Diarrhea", "Limping", "Not eating", "Low energy", "Itchy skin", "Ear discomfort", "Coughing", "Eye irritation", "Urinary changes"];

export const assistance = [
  { id: "wcvc", name: "Wisconsin Community Veterinary Center", summary: "Madison nonprofit clinic. Its financial-assistance page lists payment partners and outside funds, including a Grey Muzzle grant for senior dogs.", eligibility: "Grey Muzzle assistance is described for dogs 7 years and older and requires WCVC’s Veterinary Assistance Program application. Lifeline is described for low-income families. PawPlan does not decide who qualifies.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "lifeline", name: "WCVC Lifeline Veterinary Care Program", summary: "Subsidized or free services at WCVC, including spay/neuter, vaccines, flea and tick prevention, and urgent surgeries.", eligibility: "WCVC describes Lifeline as support for low-income families. An income cutoff is not published on the program page. Confirm eligibility with the clinic.", url: "https://www.wicvc.org/lifeline" },
  { id: "wiscares", name: "WisCARES", summary: "University of Wisconsin program in Madison for subsidized veterinary care, plus social services, pet food, and boarding or foster in some cases.", eligibility: "For Dane County pet owners who are low income, experiencing or at risk of homelessness, or unable to pay for veterinary care needed to access housing. Address: 1402 Emil St., Madison. Phone: (608) 262-3950.", url: "https://wiscares.wisc.edu/about/" },
  { id: "financing", name: "Payment financing listed by WCVC", summary: "WCVC says it partners with Cherry, VetBilling, and CareCredit to spread out bills. These are financing tools, not grants.", eligibility: "VetBilling is described for dentals and surgeries and excludes spay/neuter. Lender approval applies. A payment plan is still money the client owes.", url: "https://www.wicvc.org/financial-assistance" },
  { id: "wcvc-listed-funds", name: "Funds WCVC suggests before a payment plan", summary: "WCVC’s assistance page names Bow Wow Buddies, Heart Finance, Noah’s Animal Fund, Red Rover, and The Pet Fund.", eligibility: "Bow Wow Buddies: up to $2,500 for certain serious or emergency care; not spay/neuter, dentals, preventative care, ongoing treatment, or end-of-life care; not for money needed the same day. Heart Finance: grants up to $500 for one pet in a three-month period; review takes three to four days. Noah’s Animal Fund: Rock, Jefferson, Green, and Walworth counties only, so Dane County is outside that list; not preventative care. Red Rover: life-threatening situations; WCVC says the average grant is about $250 and is meant to fill a small gap. The Pet Fund: non-basic, non-urgent care. Confirm current rules on the WCVC page.", url: "https://www.wicvc.org/financial-assistance" }
];

export function isWisconsinZip(zip) {
  return Boolean(ZIP_CENTROIDS[normalizeZip(zip)]);
}

export function isMadisonZip(zip) {
  return isWisconsinZip(zip) && normalizeZip(zip).startsWith("537");
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
  const place = item.city ? `${item.city}, WI` : "Wisconsin";
  return `Clinic-specific · ${place}`;
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

export function formatMiles(miles) {
  if (miles < 10) return `${miles.toFixed(1)} miles`;
  return `${Math.round(miles)} miles`;
}

function clinicById(id) {
  return clinics.find((clinic) => clinic.id === id);
}

export function distanceFromZip(zipCode, clinic) {
  const origin = ZIP_CENTROIDS[normalizeZip(zipCode)];
  if (!origin || !clinic) return null;
  return haversineMiles(origin[0], origin[1], clinic.lat, clinic.lng);
}

export function clinicsByDistance(zipCode) {
  return clinics.map((clinic) => ({ ...clinic, miles: distanceFromZip(zipCode, clinic) }))
    .sort((a, b) => (a.miles ?? 9999) - (b.miles ?? 9999) || a.name.localeCompare(b.name));
}

export function selectPublished(service, zipCode, records = pricingRecords) {
  const zip = normalizeZip(zipCode);
  if (!ZIP_CENTROIDS[zip]) return { supported: false, tier: "unsupported", records: [], zip };
  const ranked = records.filter((item) => item.service === service).map((record) => {
    const clinic = clinicById(record.clinicID);
    const miles = distanceFromZip(zip, clinic);
    if (!clinic || miles == null) return null;
    return { ...record, miles, city: clinic.city, state: clinic.state };
  }).filter(Boolean)
    .sort((a, b) => a.miles - b.miles || a.clinicName.localeCompare(b.clinicName));
  if (!ranked.length) return { supported: true, tier: "none", records: [], zip };
  const local = ranked.filter((record) => record.miles <= 25);
  if (local.length) return { supported: true, tier: "local", records: local, zip };
  const regional = ranked.filter((record) => record.miles <= 100);
  if (regional.length) return { supported: true, tier: "regional", records: regional, zip };
  return { supported: true, tier: "statewide", records: ranked, zip };
}

function toCents(value) {
  const [whole, frac = ""] = String(value).split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

function fixedRangeLabel(records) {
  if (records.length < 2 || records.some((record) => record.priceType !== "fixed")) return null;
  const low = Math.min(...records.map((record) => toCents(record.lowPrice)));
  const high = Math.max(...records.map((record) => toCents(record.highPrice)));
  if (low === high) return formatMoney(fromCents(low));
  return `${formatMoney(fromCents(low))}–${formatMoney(fromCents(high))}`;
}

function fromCents(cents) {
  const dollars = Math.trunc(cents / 100);
  const rem = Math.abs(cents % 100);
  return rem === 0 ? String(dollars) : `${dollars}.${String(rem).padStart(2, "0")}`;
}

function placeLine(record) {
  return {
    id: record.id,
    clinicID: record.clinicID,
    clinicName: record.clinicName,
    city: record.city,
    miles: record.miles,
    milesText: formatMiles(record.miles),
    serviceName: record.serviceLabel,
    priceLabel: priceLabel(record.lowPrice, record.highPrice, record.confidence),
    amount: record.priceType === "fixed" ? record.lowPrice : null,
    sourceName: record.sourceName,
    sourceURL: record.sourceURL,
    sourceTitle: record.sourceTitle,
    dateText: dateText(record),
    evidenceLabel: EVIDENCE_LABELS[record.evidence],
    confidenceLabel: record.confidence,
    notes: [record.notes, record.restrictions].filter(Boolean).join(" "),
    geographicScope: scopeLabel(record)
  };
}

const SERVICE_WHY = {
  fecalExam: "Vomiting or diarrhea was reported, so a clinic may ask for a stool sample.",
  bloodworkCBC: "Vomiting or diarrhea was reported. A clinic may discuss bloodwork. No stored Wisconsin clinic page lists a standalone CBC price.",
  xray: "Limping was reported. A clinic may discuss an X-ray. No stored Wisconsin clinic page lists a standalone X-ray price.",
  urinalysis: "Urinary changes were reported. No stored Wisconsin clinic page lists a urinalysis price.",
  allergyTesting: "Itchy skin was reported. No stored Wisconsin clinic page lists an allergy-test price.",
  earCleaning: "Ear discomfort was reported. Precision publishes an ear cleaning."
};

export function mapServices(answers, urgency, options = {}) {
  if (urgency === "emergency") return { expectedExam: "emergencyExam", possible: [] };
  const symptoms = new Set(answers.symptoms || []);
  const possible = [];
  if (symptoms.has("Vomiting") || symptoms.has("Diarrhea")) possible.push("fecalExam", "bloodworkCBC");
  if (symptoms.has("Limping")) possible.push("xray");
  if (symptoms.has("Urinary changes")) possible.push("urinalysis");
  if (symptoms.has("Itchy skin")) possible.push("allergyTesting");
  if (symptoms.has("Ear discomfort")) possible.push("earCleaning");
  return { expectedExam: options.wellness ? "routineExam" : "medicalConcernExam", possible };
}

function serviceLine(service, supported, hideDollars) {
  const matches = hideDollars ? [] : recordsFor(service);
  if (!(supported && matches.length === 1)) {
    if (supported && matches.length > 1) {
      return { id: service, name: SERVICE_LABELS[service], priceLabel: "Published prices are listed with their sources", confidenceLabel: "", detail: "Each clinic price is listed separately.", why: SERVICE_WHY[service] || "" };
    }
    return { id: service, name: SERVICE_LABELS[service], priceLabel: COPY.serviceUnavailable, confidenceLabel: "", detail: "", why: SERVICE_WHY[service] || "" };
  }
  const item = matches[0];
  return {
    id: item.id,
    name: item.serviceLabel,
    priceLabel: priceLabel(item.lowPrice, item.highPrice, item.confidence),
    confidenceLabel: item.confidence,
    detail: `${EVIDENCE_LABELS[item.evidence]} · ${item.sourceName}`,
    why: SERVICE_WHY[service] || ""
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
  routineExam: "Wellness price. Shown as the starting price only for a mild, recent itch with otherwise normal answers.",
  medicalConcernExam: "Medical-concern appointment. Used when a symptom is being checked, rather than a routine wellness visit.",
  officeVisit: "Another clinic’s office visit. It is a different service, so it is not swapped in as the starting price.",
  urgentExam: "Urgent-care walk-in fee for weekday afternoon walk-ins at that clinic. It is not added on top of the starting exam.",
  newClientExam: "Promotional first exam for new clients, with checkout limits. It is not a general visit fee.",
  preoperativeBloodwork: "Dental pre-operative bloodwork. It is not a diagnostic CBC, so it is not shown as a bloodwork price.",
  earCleaning: "Shown only when ear discomfort is reported."
};

function selectionView(selection) {
  const prices = selection.records.map(placeLine);
  const rangeLabel = fixedRangeLabel(selection.records);
  return { tier: selection.tier, prices, rangeLabel, priceLabel: rangeLabel || prices[0]?.priceLabel || COPY.serviceUnavailable };
}

export function estimateCost(mapped, zipCode, records) {
  const catalog = Array.isArray(records) ? records : pricingRecords;
  const zip = normalizeZip(zipCode);
  const supported = Boolean(ZIP_CENTROIDS[zip]);
  const hideDollars = !supported;
  const choose = (service) => selectPublished(service, zip, catalog);
  const expectedSelection = hideDollars ? { supported: false, tier: "unsupported", records: [], zip } : choose(mapped.expectedExam);
  const expected = selectionView(expectedSelection);
  const farther = expected.tier === "regional" || expected.tier === "statewide";
  const regionBanner = !supported ? COPY.unavailable : expected.tier === "local" ? `${COPY.localLead}${zip}` : expected.tier === "none" ? `${COPY.localLead}${zip}` : COPY.fartherLead;
  let startingStatement = COPY.unavailable;
  if (!supported) startingStatement = COPY.unavailable;
  else if (expected.prices.length === 0) startingStatement = `${SERVICE_LABELS[mapped.expectedExam]}: ${COPY.serviceUnavailable}.`;
  else if (expected.rangeLabel) startingStatement = expected.tier === "local"
    ? `Published nearby range: ${expected.rangeLabel}. Each amount is a clinic-published price.`
    : `Published range from these clinics: ${expected.rangeLabel}. Each amount is a clinic-published price.`;
  else startingStatement = `Closest published price available: ${expected.prices[0].serviceName} ${expected.prices[0].priceLabel}.`;

  const possibleLines = (mapped.possible || []).map((service) => {
    const selection = hideDollars ? { records: [], tier: "unsupported" } : choose(service);
    const view = selectionView(selection);
    return { id: service, name: SERVICE_LABELS[service], why: SERVICE_WHY[service] || "", priceLabel: view.prices.length ? view.priceLabel : COPY.serviceUnavailable, prices: view.prices, tier: view.tier };
  });

  const sameClinic = [];
  if (!hideDollars) {
    for (const exam of expected.prices) {
      if (!exam.amount) continue;
      const addons = [];
      for (const line of possibleLines) {
        const match = line.prices.find((price) => price.clinicID === exam.clinicID && price.amount);
        if (match) addons.push(match);
      }
      if (!addons.length) continue;
      const parts = [exam, ...addons];
      sameClinic.push({ clinicName: exam.clinicName, amounts: parts.map((part) => part.amount), names: parts.map((part) => part.serviceName) });
    }
  }
  const potentialStatement = sameClinic.length
    ? sameClinic.map((item) => `${COPY.potentialLead} at ${item.clinicName}: ${formatMoney(canonicalSum(item.amounts))}. Includes only ${item.names.map((name, index) => `${name} (${formatMoney(item.amounts[index])})`).join(" and ")}. This is not a prediction that each listed service will be performed.`).join(" ")
    : null;

  const provenance = [];
  for (const price of expected.prices) provenance.push({ ...price, service: price.serviceName, price: price.priceLabel, applied: true });
  for (const line of possibleLines) {
    if (!line.prices.length) provenance.push({ id: `missing-${line.id}`, service: line.name, price: COPY.serviceUnavailable, sourceName: "", sourceURL: "", geographicScope: "", dateText: "", evidenceLabel: "", confidenceLabel: "", applied: true, notes: line.why });
    for (const price of line.prices) provenance.push({ ...price, service: price.serviceName, price: price.priceLabel, applied: true });
  }
  const comparison = [];
  if (!hideDollars && mapped.expectedExam !== "emergencyExam") {
    for (const service of EXAMS) {
      if (service === mapped.expectedExam || service === "emergencyExam") continue;
      const view = selectionView(choose(service));
      for (const price of view.prices) {
        comparison.push({ ...price, name: price.serviceName, why: UNUSED[service] || "A different published service.", tier: view.tier });
        provenance.push({ ...price, service: price.serviceName, price: price.priceLabel, applied: false, notes: `${price.notes} ${UNUSED[service] || ""}`.trim() });
      }
    }
  }

  const clinicNotes = clinicsByDistance(zip).map((clinic) => ({
    id: clinic.id,
    clinicName: clinic.name,
    city: clinic.city,
    miles: clinic.miles,
    milesText: clinic.miles == null ? "" : formatMiles(clinic.miles),
    careType: clinic.careType,
    phone: clinic.phone,
    website: clinic.website,
    address: clinic.address,
    hours: clinic.hours,
    detail: clinicDetail(clinic, mapped.expectedExam, hideDollars, catalog)
  }));

  const estimate = {
    zipCode: zip,
    isSupportedRegion: supported,
    tier: expected.tier,
    closerNote: farther ? COPY.closerNote : "",
    mapped,
    regionBanner,
    startingStatement,
    expectedPriceLabel: expected.prices.length ? expected.priceLabel : null,
    expectedCaption: expected.prices.length === 1 ? `${expected.prices[0].serviceName} · ${expected.prices[0].clinicName} · ${expected.prices[0].city}, WI — ${expected.prices[0].milesText} away` : "",
    priceLines: expected.prices,
    possibleLines,
    comparison,
    clinicNotes,
    provenance,
    potentialStatement,
    potentialComponentAmounts: sameClinic.flatMap((item) => item.amounts),
    additionalDisclaimer: COPY.additional
  };
  estimate.summaryText = summaryText(estimate);
  return estimate;
}

function clinicDetail(clinic, expected, hideDollars, records = pricingRecords) {
  if (hideDollars) return COPY.clinicUnavailable;
  const exact = records.find((item) => item.service === expected && item.clinicID === clinic.id);
  if (expected === "emergencyExam" && !exact) return COPY.clinicUnavailable;
  if (exact) return `${priceLabel(exact.lowPrice, exact.highPrice, exact.confidence)} · ${exact.serviceLabel}`;
  const other = records.find((item) => item.clinicID === clinic.id && EXAMS.has(item.service) && item.service !== expected);
  if (!other) return COPY.clinicUnavailable;
  return `${COPY.clinicUnavailable} This clinic publishes ${priceLabel(other.lowPrice, other.highPrice, other.confidence)} for ${other.serviceLabel.toLowerCase()}, which is a different service.`;
}

function summaryText(estimate) {
  const lines = [estimate.regionBanner, estimate.startingStatement];
  if (estimate.closerNote) lines.push(estimate.closerNote);
  if (estimate.expectedPriceLabel) lines.push(estimate.expectedPriceLabel);
  if (estimate.expectedCaption) lines.push(estimate.expectedCaption);
  for (const price of estimate.priceLines || []) lines.push(`${price.clinicName}, ${price.city}, WI — ${price.milesText} away: ${price.serviceName} ${price.priceLabel}`);
  for (const line of estimate.possibleLines) {
    lines.push(`${line.name}: ${line.priceLabel}`);
    for (const price of line.prices || []) lines.push(`${price.clinicName}, ${price.city}, WI — ${price.milesText} away: ${price.priceLabel}`);
  }
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

// Related conditions: matches the reported symptoms against the two health-record datasets (pet-symptoms.js, disease-cases.js).
function joinAnd(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const CHIP_TERMS = {
  Vomiting: ["vomit", "throwing up", "threw up", "throw up"],
  Diarrhea: ["diarrhea", "diarrhoea", "loose stool"],
  Limping: ["limp", "lame", "lameness", "hip", "leg"],
  "Not eating": ["not eating", "won't eat", "appetite", "refusing food", "refuses food"],
  "Low energy": ["letharg", "tired", "hiding", "weak"],
  "Itchy skin": ["itch", "scratch", "rash", "skin"],
  "Ear discomfort": ["ear"],
  Coughing: ["cough"],
  "Eye irritation": ["eye"],
  "Urinary changes": ["urin", "pee"]
};

const CHIP_TO_DISEASE = {
  Vomiting: ["Vomiting"],
  Diarrhea: ["Diarrhea"],
  Limping: ["Lameness"],
  "Not eating": ["Loss of Appetite"],
  "Low energy": ["Lethargy"],
  "Itchy skin": ["Skin Lesions"],
  Coughing: ["Coughing"],
  "Eye irritation": ["Eye Discharge"]
};

const AREA_PHRASE = {
  "Digestive Issues": "digestive upset",
  "Mobility Problems": "a mobility problem",
  Parasites: "parasites",
  "Ear Infections": "an ear infection",
  "Skin Irritations": "skin irritation"
};

const DISEASE_NAME = {
  "Canine Parvovirus": "Parvovirus",
  Parvovirus: "Parvovirus",
  "Canine Distemper": "Distemper",
  Distemper: "Distemper",
  "Canine Leptospirosis": "Leptospirosis",
  Leptospirosis: "Leptospirosis",
  "Kennel Cough": "Kennel cough",
  "Bordetella Infection": "Kennel cough",
  "Canine Cough": "Kennel cough",
  Gastroenteritis: "Gastroenteritis",
  "Canine Hepatitis": "Infectious hepatitis",
  "Canine Infectious Hepatitis": "Infectious hepatitis",
  "Lyme Disease": "Lyme disease",
  Pancreatitis: "Pancreatitis",
  "Tick-Borne Disease": "Tick-borne disease",
  Arthritis: "Arthritis",
  "Heartworm Disease": "Heartworm disease",
  "Canine Heartworm Disease": "Heartworm disease",
  "Chronic Bronchitis": "Chronic bronchitis",
  "Allergic Rhinitis": "Allergic rhinitis",
  "Canine Flu": "Canine influenza",
  "Canine Influenza": "Canine influenza"
};

function chipHits(text, chips) {
  const lower = text.toLowerCase();
  return chips.filter((chip) => (CHIP_TERMS[chip] || []).some((term) => lower.includes(term)));
}

function rankedNames(counts, limit) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([name]) => name);
}

function leadingArea(chips) {
  const covered = chips.filter((chip) => CHIP_TERMS[chip]);
  if (!covered.length) return null;
  const scored = SYMPTOM_ROWS.map((row) => ({ row, hits: chipHits(row.text, covered) })).filter((item) => item.hits.length);
  if (!scored.length) return null;
  const overlap = Math.max(...scored.map((item) => item.hits.length));
  const counts = new Map();
  for (const item of scored.filter((entry) => entry.hits.length === overlap)) {
    const name = AREA_PHRASE[item.row.condition] || item.row.condition.toLowerCase();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return rankedNames(counts, 1)[0] || null;
}

function leadingConditions(chips) {
  const wanted = new Set();
  for (const chip of chips) (CHIP_TO_DISEASE[chip] || []).forEach((name) => wanted.add(name));
  if (!wanted.size) return [];
  const scored = DISEASE_CASES.map((row) => ({ row, score: row.symptoms.filter((name) => wanted.has(name)).length })).filter((item) => item.score);
  if (!scored.length) return [];
  const overlap = Math.max(...scored.map((item) => item.score));
  const counts = new Map();
  for (const item of scored.filter((entry) => entry.score === overlap)) {
    const name = DISEASE_NAME[item.row.label] || item.row.label;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return rankedNames(counts, 3);
}

function symptomPhrase(chips) {
  const text = joinAnd(chips.map((chip) => chip.toLowerCase()));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function sampleLabels(answers) {
  const chips = answers.symptoms || [];
  const areaPhrase = leadingArea(chips);
  const conditions = leadingConditions(chips);
  let reading = "";
  if (chips.length && (areaPhrase || conditions.length)) {
    const reported = symptomPhrase(chips);
    if (areaPhrase && conditions.length) reading = `${reported} can go along with ${areaPhrase}. A veterinarian may also want to consider:`;
    else if (areaPhrase) reading = `${reported} can go along with ${areaPhrase}. A veterinarian can confirm whether that fits what you are seeing.`;
    else reading = `With ${reported.toLowerCase()}, a veterinarian may want to consider:`;
  }
  return { areaPhrase, conditions, reading };
}

export function evaluate(pet, answers, now = new Date(), options = {}) {
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
  return plan(pet, answers, urgency, reason, topics, now, { records: options.records });
}

export function emergencyPlan(pet, answers, reason, now = new Date()) {
  return plan(pet, answers || emptyAnswers(), "emergency", reason, [], now);
}

function plan(pet, answers, urgency, reason, topics, now, extra = {}) {
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  return {
    createdAt,
    pet: { ...pet, zipCode: normalizeZip(pet.zipCode) },
    answers,
    urgency,
    reason,
    topics,
    samples: sampleLabels(answers),
    estimate: estimateCost(mapServices(answers, urgency), pet.zipCode, extra.records)
  };
}

export function emptyAnswers() {
  return { symptoms: [], notes: "", duration: null, energy: null, intake: null, detail: null };
}

function sampleSummary(samples) {
  if (!samples?.reading) return "";
  const lines = ["What this may relate to", samples.reading];
  for (const name of samples.conditions || []) lines.push(`- ${name}`);
  lines.push("This is not a diagnosis.");
  return lines.join("\n");
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
    sampleSummary(carePlan.samples),
    carePlan.estimate?.summaryText || "",
    "",
    "Urgency rules are a demonstration, not a diagnosis. Contact a veterinarian for medical advice."
  ].join("\n");
}
