import test from "node:test";
import assert from "node:assert/strict";
import {
  COPY, assistance, canonicalSum, clinics, emergencyPlan, estimateCost, evaluate, isWisconsinZip,
  mapServices, moneyAmounts, priceLabel, pricingRecords, recordsFor, sampleLabels, selectPublished, summaryDocument, urgencyScale
} from "./care.js";

const mild = { symptoms: ["Itchy skin"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };

test("a mild itch uses the published routine exam and a symptom visit uses the medical-concern price", () => {
  const plan = evaluate({ name: "Mochi", age: 3, weight: 25, zipCode: "53703" }, mild);
  assert.equal(plan.estimate.regionBanner, "Published veterinary prices near 53703");
  assert.equal(plan.estimate.tier, "local");
  assert.ok(plan.estimate.priceLines.some((line) => line.priceLabel === "starts at $55" && line.clinicName.includes("Precision")));
  assert.ok(plan.estimate.priceLines.some((line) => line.priceLabel === "$40"));
  assert.equal(plan.urgency, "monitor");
  assert.match(plan.reason, /lowest level/);
  assert.ok(plan.factors.some((factor) => factor.text.includes("Itchy skin")));
  assert.equal(plan.estimate.comparison.some((line) => line.priceLabel === "$75"), true);
  const visit = { symptoms: ["Vomiting"], notes: "", duration: "longer", energy: "reduced", intake: "normal", detail: "mild" };
  const sick = evaluate({ name: "Mochi", age: 3, weight: 25, zipCode: "53703" }, visit);
  assert.equal(sick.urgency, "soon");
  assert.equal(sick.estimate.expectedPriceLabel, "$60–$75");
  assert.match(sick.reason, /lasted 3 or more days/);
  assert.match(sick.reason, /energy is lower than usual/);
  assert.equal(sick.estimate.provenance.find((item) => item.id === "precision-medical-concern").sourceURL, "https://precisionveterinary.com/services/");
});

test("every catalog price has a source and unsupported areas get no dollars", () => {
  assert.ok(pricingRecords.length > 0);
  for (const record of pricingRecords) {
    assert.ok(record.sourceURL.startsWith("https://"));
    assert.equal(record.evidence, "clinicPosted");
    assert.equal(record.confidence, "HIGH");
    assert.equal(record.medianPrice, null);
    assert.equal(record.clinicName != null, true);
    assert.ok(["fixed", "starting-at", "range"].includes(record.priceType));
    const clinic = clinics.find((item) => item.id === record.clinicID);
    assert.equal(clinic.state, "WI");
    assert.equal(typeof clinic.lat, "number");
  }
  for (const service of ["xray", "bloodworkCBC", "allergyTesting", "urinalysis", "ivFluids", "ultrasound"]) {
    assert.equal(recordsFor(service).length, 0);
  }
  for (const zip of ["", "60614", "53702"]) {
    const plan = evaluate({ age: 3, weight: 25, zipCode: zip }, mild);
    assert.equal(plan.estimate.isSupportedRegion, false);
    assert.equal(plan.estimate.regionBanner, COPY.unavailable);
    assert.equal(moneyAmounts(plan.estimate.summaryText).length, 0);
    assert.ok(plan.estimate.clinicNotes.every((note) => note.detail === COPY.clinicUnavailable));
  }
  assert.equal(isWisconsinZip("53703-1234"), true);
  assert.equal(isWisconsinZip("53202"), true);
  assert.equal(isWisconsinZip("60614"), false);
});

test("clinics are not priced with multipliers and missing services stay unavailable", () => {
  const limping = { symptoms: ["Limping"], notes: "", duration: "longer", energy: "normal", intake: "normal", detail: "repeated" };
  assert.deepEqual(mapServices(limping, "soon"), { expectedExam: "medicalConcernExam", possible: ["xray"] });
  const limpEstimate = estimateCost(mapServices(limping, "soon"), "53719");
  assert.equal(limpEstimate.possibleLines[0].priceLabel, COPY.serviceUnavailable);
  assert.equal(limpEstimate.possibleLines[0].priceLabel.includes("$"), false);
  assert.equal(limpEstimate.potentialStatement, null);

  const digestive = estimateCost(mapServices({ symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" }, "fewDays"), "53703");
  assert.deepEqual(digestive.possibleLines.map((line) => line.name), ["Fecal exam", "Bloodwork / CBC"]);
  assert.equal(digestive.possibleLines[1].priceLabel, COPY.serviceUnavailable);
  assert.deepEqual(digestive.potentialComponentAmounts, ["75", "25"]);
  assert.match(digestive.potentialStatement, /Potential cost if these listed services are performed/);
  assert.match(digestive.potentialStatement, /\$100/);
  const catalogAmounts = new Set(pricingRecords.flatMap((record) => [record.lowPrice, record.highPrice].filter(Boolean).map((amount) => `$${amount}`)));
  const derived = new Set([`$${canonicalSum(digestive.potentialComponentAmounts)}`]);
  for (const amount of moneyAmounts(digestive.summaryText)) {
    assert.equal(catalogAmounts.has(amount) || derived.has(amount), true, amount);
  }

  const notes = Object.fromEntries(limpEstimate.clinicNotes.map((note) => [note.id, note.detail]));
  assert.equal(notes.precision, "$75 · Medical-concern appointment");
  assert.match(notes["banfield-east"], /\$76\.95/);
  assert.match(notes["banfield-east"], /Price not publicly available/);
  assert.equal(notes.wcvc, "$60 · Sick/injured urgent wellness visit");
  assert.equal(notes.veg, COPY.clinicUnavailable);
  assert.equal(notes.veg.includes("$"), false);
});

test("another Wisconsin ZIP does not silently reuse Madison prices", () => {
  const milwaukee = selectPublished("medicalConcernExam", "53202");
  assert.equal(milwaukee.tier, "local");
  assert.deepEqual(milwaukee.records.map((record) => record.clinicID).sort(), ["haws", "new-berlin"]);
  assert.ok(milwaukee.records.every((record) => record.miles <= 25));
  const eauClaire = selectPublished("medicalConcernExam", "54701");
  assert.equal(eauClaire.tier, "statewide");
  assert.match(estimateCost(mapServices({ symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" }, "fewDays"), "54701").closerNote, /No qualifying published price was found closer/);
  const greenBay = selectPublished("urgentExam", "54301");
  assert.equal(greenBay.tier, "local");
  assert.equal(greenBay.records[0].clinicID, "ashwaubenon");
  assert.equal(greenBay.records[0].lowPrice, "112");
});

test("emergency and severe answers do not invent an exam price", () => {
  const severe = evaluate({ age: 3, weight: 25, zipCode: "53703" }, { ...mild, energy: "severe" });
  assert.equal(severe.urgency, "emergency");
  assert.equal(severe.estimate.summaryText.includes("85"), false);
  assert.equal(severe.estimate.summaryText.includes("$75"), false);
  for (const amount of moneyAmounts(severe.estimate.summaryText)) assert.equal(amount, "$162");
  const collapsed = emergencyPlan({ age: 4, weight: 20, zipCode: "60614" }, mild, "Collapse");
  assert.equal(moneyAmounts(collapsed.estimate.summaryText).length, 0);
});

test("the result lists every urgency level and marks the one that applies", () => {
  assert.deepEqual(urgencyScale().map((item) => [item.level, item.title]), [
    [1, "Keep a close eye"],
    [2, "Plan a vet visit"],
    [3, "Call a vet today"],
    [4, "Get emergency help"]
  ]);
  const plan = evaluate({ name: "Mochi", age: 3, weight: 25, zipCode: "53703" }, mild);
  const summary = summaryDocument(plan);
  assert.match(summary, /YOUR RESULT — LEVEL 1: Keep a close eye/);
  assert.match(summary, /> Level 1: Keep a close eye/);
  assert.match(summary, / Level 4: Get emergency help/);
});

test("both health records inform the concern list and neither supplies a price", () => {
  const vomiting = sampleLabels({ symptoms: ["Vomiting", "Diarrhea"] });
  assert.equal(vomiting.areaPhrase, "digestive upset");
  assert.equal(vomiting.conditions.includes("Gastroenteritis"), true);
  assert.equal(vomiting.conditions.includes("Parvovirus"), true);
  assert.equal(/xlsx|spreadsheet|excel|sample row/i.test(vomiting.reading), false);
  const ears = sampleLabels({ symptoms: ["Ear discomfort"] });
  assert.equal(ears.areaPhrase, "an ear infection");
  const plan = evaluate({ age: 3, weight: 25, zipCode: "53703" }, { symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" });
  assert.equal(plan.urgency, "fewDays");
  assert.equal(/xlsx|spreadsheet|excel/i.test(summaryDocument(plan)), false);
  assert.equal(plan.estimate.expectedPriceLabel, "$60–$75");
});

test("low confidence formatting is not a precise dollar and assistance links are real", () => {
  assert.equal(priceLabel("55", null, "HIGH"), "starts at $55");
  assert.equal(priceLabel("40", "40", "LOW"), "about $40 (limited data)");
  assert.equal(priceLabel("80", null, "MEDIUM"), "about $80 (area estimate)");
  assert.equal(priceLabel("40", "90", "LOW").startsWith("$"), false);
  assert.ok(assistance.some((item) => item.name.includes("WisCARES")));
  assert.ok(assistance.every((item) => item.eligibility && item.url.startsWith("https://")));
});
