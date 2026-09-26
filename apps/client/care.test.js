import test from "node:test";
import assert from "node:assert/strict";
import { assistance, emergencyPlan, evaluate, summaryDocument, urgencyScale } from "./care.js";

const mild = { symptoms: ["Itchy skin"], notes: "", duration: "recent", energy: "normal", intake: "normal", detail: "mild" };
const dog = { name: "Mochi", age: 3, weight: 25, zipCode: "53703" };

test("mild, recent itching with normal behavior is level 1", () => {
  assert.equal(evaluate(dog, mild).urgency, "monitor");
});

test("concerning answers are level 3 and in-between answers are level 2", () => {
  assert.equal(evaluate(dog, { ...mild, energy: "reduced" }).urgency, "soon");
  assert.equal(evaluate({ ...dog, age: 12 }, mild).urgency, "soon");
  assert.equal(evaluate(dog, { ...mild, symptoms: ["Vomiting"] }).urgency, "fewDays");
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
