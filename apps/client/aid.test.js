import test from "node:test";
import assert from "node:assert/strict";
import { aidChecklist, clinicWarnings, estimateHigh, matchAid } from "./aid.js";
import { countyForZip } from "./zip-counties.js";

const ids = (list) => list.map((item) => item.org.id);

test("ZIP codes map to Wisconsin counties", () => {
  assert.equal(countyForZip("53703"), "Dane");
  assert.equal(countyForZip("53726"), "Dane"); // missing from the crosswalk, filled from the nearest ZIP
  assert.equal(countyForZip("53511"), "Rock");
  assert.equal(countyForZip("54601"), "La Crosse");
  assert.equal(countyForZip("90210"), null);
});

test("Dane County, urgent, low income: financing first now, national grants after the estimate", () => {
  const result = matchAid({ level: 3, county: "Dane", inWisconsin: true, income: "under60k", estimateHigh: 75 });
  assert.equal(result.now[0].org.id, "financing");
  assert.ok(ids(result.now).includes("scaa"));
  assert.ok(ids(result.now).includes("wiscares"));
  assert.ok(ids(result.after).includes("redrover"));
  assert.ok(ids(result.after).includes("frankies"));
  assert.ok(!ids([...result.now, ...result.after]).includes("noahs"), "Rock-area fund is not shown in Dane");
  assert.ok(ids(result.notForThis).includes("petfund"), "The Pet Fund excludes urgent care");
  assert.equal(result.after.find((item) => item.org.id === "bowwow").fit, "paused");
});

test("income over $60k removes RedRover", () => {
  const result = matchAid({ level: 3, county: "Dane", inWisconsin: true, income: "over60k", estimateHigh: 75 });
  assert.ok(!ids(result.after).includes("redrover"));
  assert.ok(result.notForThis.some((item) => item.org.id === "redrover" && /60,000/.test(item.why)));
});

test("RedRover is out when the need is $500 or more", () => {
  const result = matchAid({ level: 3, county: "Dane", inWisconsin: true, income: "under60k", estimateHigh: 650 });
  assert.ok(result.notForThis.some((item) => item.org.id === "redrover"));
});

test("outside Wisconsin only national programs appear", () => {
  const result = matchAid({ level: 2, county: null, inWisconsin: false, income: "assist" });
  for (const item of [...result.now, ...result.after]) assert.equal(item.org.area, "national");
  assert.ok(ids(result.after).includes("petfund"));
});

test("clinic warnings for programs that won't pay there", () => {
  assert.deepEqual(clinicWarnings(["frankies"], "Banfield Pet Hospital Madison East"), ["Frankie's Friends National Fund won't pay this clinic"]);
  assert.deepEqual(clinicWarnings(["respond"], "Precision Veterinary Madison"), ["UW Veterinary Care RESPOND Fund only helps at UW Veterinary Care"]);
  assert.deepEqual(clinicWarnings(["redrover"], "Banfield"), []);
});

test("checklist splits what the vet provides from what the owner brings", () => {
  const list = aidChecklist(["redrover", "paws4acure"]);
  assert.ok(list.fromVet.includes("Written cost estimate"));
  assert.ok(list.fromVet.includes("Vet packet (the clinic fills this in)"));
  assert.ok(list.fromOwner.includes("Proof of financial hardship"));
});

test("estimate high comes from published fixed prices", () => {
  assert.equal(estimateHigh({ priceLines: [{ amount: "60" }, { amount: "75" }, { amount: null }] }), 75);
  assert.equal(estimateHigh({ priceLines: [] }), null);
});
