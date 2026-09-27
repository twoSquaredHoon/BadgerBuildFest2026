import test from "node:test";
import assert from "node:assert/strict";
import {
  COPY, assistance, canonicalSum, clinics, emergencyPlan, estimateCost, evaluate, isWisconsinZip,
  mapServices, moneyAmounts, pricingRecords, recordsFor, sampleLabels, selectPublished, summaryDocument, urgencyScale
} from "./care.js";

const mild = { symptoms: ["Itchy skin"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };
const dog = { name: "Mochi", age: 3, weight: 25, zipCode: "53703" };

test("mild, recent itching with normal behavior is level 1", () => {
  assert.equal(evaluate(dog, mild).urgency, "monitor");
});

test("worse follow-up answers are level 3 and a mild illness is not", () => {
  assert.equal(evaluate(dog, { ...mild, energy: "reduced" }).urgency, "soon");
  assert.equal(evaluate(dog, { ...mild, duration: "longer" }).urgency, "soon");
  assert.equal(evaluate(dog, { ...mild, intake: "reduced" }).urgency, "soon");
  assert.equal(evaluate(dog, { ...mild, detail: "repeated" }).urgency, "soon");
  assert.equal(evaluate({ ...dog, age: 12 }, mild).urgency, "fewDays");
  assert.equal(evaluate({ ...dog, age: 0.5 }, mild).urgency, "fewDays");
  assert.equal(evaluate(dog, { ...mild, symptoms: ["Vomiting"] }).urgency, "fewDays");
  assert.equal(evaluate(dog, { ...mild, symptoms: ["Not eating"] }).urgency, "fewDays");
  assert.equal(evaluate(dog, { ...mild, symptoms: ["Low energy"] }).urgency, "fewDays");
  assert.equal(evaluate(dog, { ...mild, symptoms: ["Eye irritation"] }).urgency, "fewDays");
  assert.equal(evaluate(dog, { ...mild, notes: "a little itchy" }).urgency, "fewDays");
});

test("red flags go straight to emergency", () => {
  assert.equal(evaluate(dog, { ...mild, energy: "severe" }).urgency, "emergency");
  assert.equal(evaluate(dog, { ...mild, detail: "redFlag" }).urgency, "emergency");
  assert.equal(evaluate(dog, { ...mild, intake: "unable" }).urgency, "emergency");
  assert.equal(emergencyPlan(dog, mild, "Collapse").urgency, "emergency");
});

test("the summary names the result and every urgency level", () => {
  assert.deepEqual(urgencyScale().map((item) => [item.level, item.title]), [
    [1, "Keep a close eye"],
    [2, "Plan a vet visit"],
    [3, "Call a vet today"],
    [4, "Get emergency help"]
  ]);
  const summary = summaryDocument(evaluate(dog, mild));
  assert.match(summary, /YOUR RESULT — LEVEL 1: Keep a close eye/);
  assert.match(summary, /> Level 1: Keep a close eye/);
  assert.match(summary, / Level 4: Get emergency help/);
});

test("assistance programs have real links", () => {
  assert.ok(assistance.some((item) => item.name.includes("WisCARES")));
  assert.ok(assistance.every((item) => item.eligibility && item.url.startsWith("https://")));
});

test("the health records suggest related conditions", () => {
  const vomiting = sampleLabels({ symptoms: ["Vomiting", "Diarrhea"] });
  assert.equal(vomiting.areaPhrase, "digestive upset");
  assert.equal(vomiting.conditions.includes("Gastroenteritis"), true);
  assert.equal(vomiting.conditions.includes("Parvovirus"), true);
  assert.equal(sampleLabels({ symptoms: ["Ear discomfort"] }).areaPhrase, "an ear infection");
  assert.deepEqual(sampleLabels({ symptoms: [] }).conditions, []);
  const plan = evaluate(dog, { ...mild, symptoms: ["Vomiting"] });
  assert.ok(plan.samples.conditions.length > 0);
  assert.match(summaryDocument(plan), /What this may relate to/);
});

test("a symptom visit near Madison uses the closest published medical-concern prices", () => {
  const sick = evaluate(dog, { symptoms: ["Vomiting"], notes: "", duration: "longer", energy: "reduced", intake: "normal", detail: "mild" });
  assert.equal(sick.estimate.expectedPriceLabel, "$60–$75");
  assert.equal(sick.estimate.tier, "local");
  assert.equal(sick.estimate.provenance.find((item) => item.id === "precision-medical-concern").sourceURL, "https://precisionveterinary.com/services/");
});

test("every catalog price has a source and unsupported areas get no dollars", () => {
  assert.ok(pricingRecords.length > 0);
  for (const record of pricingRecords) {
    assert.ok(record.sourceURL.startsWith("https://"));
    assert.equal(record.evidence, "clinicPosted");
    assert.equal(record.confidence, "HIGH");
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
  }
  assert.equal(isWisconsinZip("53703-1234"), true);
  assert.equal(isWisconsinZip("60614"), false);
});

test("missing services stay unavailable and totals only use published amounts", () => {
  const limping = { symptoms: ["Limping"], notes: "", duration: "longer", energy: "normal", intake: "normal", detail: "repeated" };
  assert.deepEqual(mapServices(limping, "soon"), { expectedExam: "medicalConcernExam", possible: ["xray"] });
  const limpEstimate = estimateCost(mapServices(limping, "soon"), "53719");
  assert.equal(limpEstimate.possibleLines[0].priceLabel, COPY.serviceUnavailable);
  const digestive = estimateCost(mapServices({ symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" }, "fewDays"), "53703");
  assert.deepEqual(digestive.possibleLines.map((line) => line.name), ["Fecal exam", "Bloodwork / CBC"]);
  const catalogAmounts = new Set(pricingRecords.flatMap((record) => [record.lowPrice, record.highPrice].filter(Boolean).map((amount) => `$${amount}`)));
  const derived = new Set([`$${canonicalSum(digestive.potentialComponentAmounts)}`]);
  for (const amount of moneyAmounts(digestive.summaryText)) {
    assert.equal(catalogAmounts.has(amount) || derived.has(amount), true, amount);
  }
});

test("another Wisconsin ZIP does not silently reuse Madison prices", () => {
  const milwaukee = selectPublished("medicalConcernExam", "53202");
  assert.equal(milwaukee.tier, "local");
  assert.ok(milwaukee.records.every((record) => record.miles <= 25));
  assert.equal(selectPublished("medicalConcernExam", "54701").tier, "statewide");
  assert.equal(selectPublished("urgentExam", "54301").records[0].clinicID, "ashwaubenon");
});

test("an empty live catalog does not fall back to stored dollars", () => {
  const visit = { symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };
  const estimate = estimateCost(mapServices(visit, "fewDays"), "53703", []);
  assert.equal(estimate.expectedPriceLabel, null);
  assert.equal(moneyAmounts(estimate.summaryText).length, 0);
  const plan = evaluate({ age: 3, weight: 25, zipCode: "53703" }, visit, new Date(), { records: [] });
  assert.equal(plan.estimate.expectedPriceLabel, null);
});

test("a live catalog replaces stored prices for the same visit", () => {
  const visit = { symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };
  const live = [{
    id: "precision-medicalConcernExam-live",
    service: "medicalConcernExam",
    serviceLabel: "Sick or medical-concern exam",
    lowPrice: "75",
    highPrice: "75",
    priceType: "fixed",
    clinicID: "precision",
    clinicName: "Precision Veterinary Madison",
    sourceName: "Precision Veterinary Madison",
    sourceTitle: "Clinic website",
    sourceURL: "https://precisionveterinary.com/services/",
    evidence: "clinicPosted",
    confidence: "HIGH",
    notes: "Copied from the clinic page"
  }];
  const estimate = estimateCost(mapServices(visit, "fewDays"), "53703", live);
  assert.equal(estimate.expectedPriceLabel, "$75");
  assert.equal(estimate.priceLines.length, 1);
  assert.equal(estimate.priceLines[0].clinicID, "precision");
  assert.equal(moneyAmounts(estimate.summaryText).includes("$60"), false);
});
