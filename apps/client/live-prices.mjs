/** Read prices from live clinic pages. A model may match a service name, but the amount must appear on the page. */

import { clinics } from "./pricing-data.js";

const SERVICES = new Set([
  "routineExam", "medicalConcernExam", "officeVisit", "urgentExam", "emergencyExam", "newClientExam", "fecalExam", "earCleaning"
]);

const RULES = [
  { service: "newClientExam", label: "New-client exam", test: /new client|first comprehensive exam|first routine exam/i },
  { service: "emergencyExam", label: "Walk-in emergency visit", test: /walk-in emergency|emergency visit/i },
  { service: "urgentExam", label: "Urgent care exam", test: /urgent care exam|urgent-care walk-in|urgent care walk-in/i },
  { service: "medicalConcernExam", label: "Sick or medical-concern exam", test: /medical concern|sick exam|sick\/injured/i },
  { service: "officeVisit", label: "Office visit", test: /office visit/i },
  { service: "routineExam", label: "Routine exam", test: /routine exam|wellness exam|physical exam|routine wellness/i },
  { service: "fecalExam", label: "Fecal test", test: /\bfecal\b/i },
  { service: "earCleaning", label: "Ear cleaning", test: /ear cleaning/i }
];

export function pageText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h1|h2|h3|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[^\S\n]+/g, " ");
}

function priceOnly(line) {
  return /^\$\d{1,4}(\.\d{2})?$/.test(line.replace(/\s/g, ""));
}

function nearbyPrice(lines, index, claimed) {
  const amounts = [...lines[index].matchAll(/\$(\d{1,4}(?:\.\d{2})?)/g)].map((match) => match[1]);
  if (amounts.length === 1 && !priceOnly(lines[index])) return { index, amount: amounts[0] };
  for (let back = index - 1; back >= Math.max(0, index - 3); back -= 1) {
    if (/^[.\s…]+$/.test(lines[back])) continue;
    if (priceOnly(lines[back]) && !claimed.has(back)) return { index: back, amount: lines[back].replace(/[^\d.]/g, "") };
    break;
  }
  for (let forward = index + 1; forward <= Math.min(lines.length - 1, index + 3); forward += 1) {
    if (/^[.\s…]+$/.test(lines[forward])) continue;
    if (priceOnly(lines[forward]) && !claimed.has(forward)) return { index: forward, amount: lines[forward].replace(/[^\d.]/g, "") };
    break;
  }
  return null;
}

export function pricesFromText(text, clinic, accessedDate) {
  const lines = String(text).split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const found = new Map();
  const claimed = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const rule = RULES.find((item) => item.test.test(lines[index]));
    if (!rule || found.has(rule.service) || priceOnly(lines[index])) continue;
    const price = nearbyPrice(lines, index, claimed);
    if (!price) continue;
    claimed.add(price.index);
    const quote = `${lines[index]} $${price.amount}`.replace(/\s+/g, " ").trim();
    found.set(rule.service, recordFrom(clinic, rule.service, rule.label, price.amount, /starting at|starts at/i.test(lines[index]) ? "starting-at" : "fixed", quote, accessedDate));
  }
  return [...found.values()];
}

export function acceptModelPrice(page, clinic, item, accessedDate) {
  if (!item || !SERVICES.has(item.service)) return null;
  const rule = RULES.find((entry) => entry.service === item.service);
  const amount = String(item.amount || "").replace(/[$,\s]/g, "");
  if (!rule || !/^\d{1,4}(\.\d{2})?$/.test(amount)) return null;
  const lines = String(page).split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const claimed = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    if (!rule.test.test(lines[index]) || priceOnly(lines[index])) continue;
    const price = nearbyPrice(lines, index, claimed);
    if (!price) continue;
    claimed.add(price.index);
    if (price.amount !== amount) continue;
    const quote = `${lines[index]} $${price.amount}`.replace(/\s+/g, " ").trim();
    return recordFrom(clinic, item.service, rule.label, amount, /starting at|starts at/i.test(lines[index]) ? "starting-at" : "fixed", quote, accessedDate);
  }
  return null;
}

function recordFrom(clinic, service, label, amount, priceType, quote, accessedDate) {
  return {
    id: `${clinic.id}-${service}-live`,
    service,
    serviceLabel: label,
    lowPrice: amount,
    highPrice: priceType === "starting-at" ? null : amount,
    priceType,
    clinicID: clinic.id,
    clinicName: clinic.name,
    sourceName: clinic.name,
    sourceTitle: "Clinic website",
    sourceURL: clinic.website,
    evidence: "clinicPosted",
    confidence: "HIGH",
    medianPrice: null,
    publishedDate: null,
    restrictions: "",
    accessedDate,
    notes: `Copied from the clinic page: ${quote}`
  };
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "PawPlan/1.0 (public price check)" },
    signal: AbortSignal.timeout(12000),
    redirect: "follow"
  });
  if (!response.ok) throw new Error(String(response.status));
  return pageText(await response.text());
}

async function modelPrices(pages, accessedDate) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !pages.length) return { ok: false, byClinic: new Map() };
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const packet = pages.map((page) => `Clinic id: ${page.clinic.id}\nClinic: ${page.clinic.name}\n${page.text.slice(0, 5000)}`).join("\n\n---\n\n");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{
          text: `Extract veterinary prices that are printed in the page text. Return JSON {"prices":[{"clinicId":"the clinic id","service":"routineExam|medicalConcernExam|officeVisit|urgentExam|emergencyExam|newClientExam|fecalExam|earCleaning","amount":"75","quote":"exact words copied from that clinic's page including the dollar amount","priceType":"fixed|starting-at"}]}. Omit any service that is not printed. Never invent an amount.\n\n${packet}`
        }]
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "minimal" }
      }
    })
  });
  if (!response.ok) return { ok: false, byClinic: new Map() };
  const body = await response.json();
  const content = (body.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("") || "{}";
  const parsed = JSON.parse(content.trim().replace(/^```json\s*|```$/g, ""));
  const byClinic = new Map();
  for (const item of parsed.prices || []) {
    const page = pages.find((entry) => entry.clinic.id === item.clinicId);
    if (!page) continue;
    const record = acceptModelPrice(page.text, page.clinic, item, accessedDate);
    if (!record) continue;
    const list = byClinic.get(page.clinic.id) || [];
    if (list.some((existing) => existing.service === record.service)) continue;
    list.push(record);
    byClinic.set(page.clinic.id, list);
  }
  return { ok: true, byClinic };
}

export async function readLivePrices() {
  const accessedDate = new Date().toISOString().slice(0, 10);
  const pages = await Promise.all(clinics.map(async (clinic) => {
    if (!clinic.website) return null;
    try {
      const text = await fetchPage(clinic.website);
      return { clinic, text };
    } catch {
      return null;
    }
  }));
  const readable = pages.filter(Boolean);
  let modeled = { ok: false, byClinic: new Map() };
  if (process.env.GEMINI_API_KEY) {
    try {
      modeled = await modelPrices(readable, accessedDate);
    } catch {
      modeled = { ok: false, byClinic: new Map() };
    }
  }
  const records = [];
  for (const page of readable) {
    const chosen = pricesFromText(page.text, page.clinic, accessedDate);
    const have = new Set(chosen.map((record) => record.service));
    chosen.push(...(modeled.byClinic.get(page.clinic.id) || []).filter((record) => !have.has(record.service)));
    records.push(...chosen);
  }
  const modelUsed = modeled.ok;
  const note = readable.length
    ? (modelUsed
      ? "Prices were copied from the clinic websites just now. A model matched each service name, and any amount that was not printed on the page was dropped."
      : "Prices were copied from the clinic websites just now. Only a price printed next to the service name is shown.")
    : "Clinic websites could not be read just now, so no price is shown.";
  return { ok: readable.length > 0, records, note, pagesRead: readable.length, modelUsed };
}
