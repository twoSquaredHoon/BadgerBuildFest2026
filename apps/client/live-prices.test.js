import test from "node:test";
import assert from "node:assert/strict";
import { acceptModelPrice, pageText, pricesFromText } from "./live-prices.mjs";

const clinic = { id: "precision", name: "Precision Veterinary Madison", website: "https://precisionveterinary.com/services/" };
const html = "<ul><li>Routine exams starting at $55</li><li>Medical Concerns appointments for $75</li><li>Fecal test $25</li></ul>";

test("live page text keeps a printed price and drops an invented one", () => {
  const text = pageText(html);
  const found = pricesFromText(text, clinic, "2026-09-26");
  assert.equal(found.find((item) => item.service === "routineExam").lowPrice, "55");
  assert.equal(found.find((item) => item.service === "routineExam").priceType, "starting-at");
  assert.equal(found.find((item) => item.service === "medicalConcernExam").lowPrice, "75");
  const invented = acceptModelPrice(text, clinic, { service: "medicalConcernExam", amount: "200", quote: "Medical Concerns appointments for $200", priceType: "fixed" }, "2026-09-26");
  assert.equal(invented, null);
  const copied = acceptModelPrice(text, clinic, { service: "medicalConcernExam", amount: "75", quote: "Medical Concerns appointments for $75", priceType: "fixed" }, "2026-09-26");
  assert.equal(copied.lowPrice, "75");
  const split = pricesFromText("Routine Wellness Visit\n.........................\n$40\nSick/Injured Urgent Wellness Visit\n.........................\n$60\n$30\nFecal Exam\n$35\nNail Trim", clinic, "2026-09-26");
  assert.equal(split.find((item) => item.service === "routineExam").lowPrice, "40");
  assert.equal(split.find((item) => item.service === "medicalConcernExam").lowPrice, "60");
  assert.equal(split.find((item) => item.service === "fecalExam").lowPrice, "30");
  const splitText = "Routine Wellness Visit\n.........................\n$40\nSick/Injured Urgent Wellness Visit\n.........................\n$60\n$30\nFecal Exam\n$35\nNail Trim";
  assert.equal(acceptModelPrice(splitText, clinic, { service: "fecalExam", amount: "35", quote: "Fecal Exam ......................... $35", priceType: "fixed" }, "2026-09-26"), null);
  assert.equal(acceptModelPrice(splitText, clinic, { service: "fecalExam", amount: "30", quote: "$30 Fecal Exam", priceType: "fixed" }, "2026-09-26").lowPrice, "30");
  assert.equal(acceptModelPrice(splitText, clinic, { service: "urgentExam", amount: "60", quote: "Sick/Injured Urgent Wellness Visit $60", priceType: "fixed" }, "2026-09-26"), null);
});
