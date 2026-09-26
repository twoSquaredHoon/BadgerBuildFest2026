import test from "node:test";
import assert from "node:assert/strict";
import {
  COPY, assistance, canonicalSum, emergencyPlan, estimateCost, evaluate, isMadisonZip,
  mapServices, moneyAmounts, priceLabel, pricingRecords, recordsFor, summaryDocument, urgencyScale
} from "./care.js";

const mild = { symptoms: ["Itchy skin"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };

test("madison medical concern uses the published Precision price", () => {
  const plan = evaluate({ name: "Mochi", age: 3, weight: 25, zipCode: "53703" }, mild);
  assert.equal(plan.estimate.expectedPriceLabel, "$75");
  assert.equal(plan.estimate.regionBanner, COPY.madisonBanner);
  assert.equal(plan.estimate.provenance.find((item) => item.id === "precision-medical-concern").sourceURL, "https://precisionveterinary.com/services/");
  assert.equal(plan.urgency, "monitor");
});

test("every catalog price has a source and unsupported areas get no dollars", () => {
  assert.ok(pricingRecords.length > 0);
  for (const record of pricingRecords) {
    assert.ok(record.sourceURL.startsWith("https://"));
    assert.equal(record.geographicArea, "Madison, WI");
    assert.equal(record.evidence, "clinicPosted");
    assert.equal(record.confidence, "HIGH");
    assert.equal(record.medianPrice, null);
    assert.equal(record.clinicName != null, true);
  }
  for (const service of ["xray", "bloodworkCBC", "allergyTesting", "urinalysis", "ivFluids", "ultrasound", "emergencyExam"]) {
    assert.equal(recordsFor(service).length, 0);
  }
  for (const zip of ["", "53562", "53202", "60614", "53702"]) {
    const plan = evaluate({ age: 3, weight: 25, zipCode: zip }, mild);
    assert.equal(plan.estimate.isSupportedRegion, false);
    assert.equal(plan.estimate.regionBanner, COPY.unavailable);
    assert.equal(moneyAmounts(plan.estimate.summaryText).length, 0);
    assert.ok(plan.estimate.clinicNotes.every((note) => note.detail === COPY.clinicUnavailable));
  }
  assert.equal(isMadisonZip("53703-1234"), true);
});

test("clinics are not priced with multipliers and missing services stay unavailable", () => {
  const limping = { symptoms: ["Limping"], notes: "", duration: "longer", energy: "normal", intake: "normal", detail: "repeated" };
  assert.deepEqual(mapServices(limping, "soon"), { expectedExam: "medicalConcernExam", possible: ["xray"] });
  const limpEstimate = estimateCost(mapServices(limping, "soon"), "53719");
  assert.equal(limpEstimate.possibleLines[0].priceLabel, COPY.serviceUnavailable);
  assert.equal(limpEstimate.possibleLines[0].priceLabel.includes("$"), false);
  assert.equal(limpEstimate.potentialStatement, null);

  const digestive = estimateCost(mapServices({ symptoms: ["Vomiting"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" }, "fewDays"), "53703");
  assert.deepEqual(digestive.possibleLines.map((line) => line.name), ["Fecal test", "Bloodwork / CBC"]);
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
  assert.equal(notes.wcvc, COPY.clinicUnavailable);
  assert.equal(notes.wcvc.includes("$"), false);
});

test("emergency and severe answers do not invent an exam price", () => {
  const severe = evaluate({ age: 3, weight: 25, zipCode: "53703" }, { ...mild, energy: "severe" });
  assert.equal(severe.urgency, "emergency");
  assert.equal(moneyAmounts(severe.estimate.summaryText).length, 0);
  assert.equal(severe.estimate.summaryText.includes("85"), false);
  const collapsed = emergencyPlan({ age: 4, weight: 20, zipCode: "53202" }, mild, "Collapse");
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

test("low confidence formatting is not a precise dollar and assistance links are real", () => {
  assert.equal(priceLabel("55", null, "HIGH"), "starts at $55");
  assert.equal(priceLabel("40", "40", "LOW"), "about $40 (limited data)");
  assert.equal(priceLabel("80", null, "MEDIUM"), "about $80 (area estimate)");
  assert.equal(priceLabel("40", "90", "LOW").startsWith("$"), false);
  assert.ok(assistance.some((item) => item.name.includes("WisCARES")));
  assert.ok(assistance.every((item) => item.eligibility && item.url.startsWith("https://")));
});
