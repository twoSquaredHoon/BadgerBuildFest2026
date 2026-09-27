/** Matches an owner to the financial-help programs in aid-orgs.js. No network, no storage: pure functions (see aid.test.js). */
import { AID_ORGS } from "./aid-orgs.js";

export { AID_ORGS };

export const INCOME_OPTIONS = [
  ["under60k", "Under $60,000 a year"],
  ["assist", "I get SNAP, Medicaid, SSI or other assistance"],
  ["over60k", "$60,000 or more"],
  ["skip", "Prefer not to say"]
];

export const BUDGET_OPTIONS = [
  ["under100", "Under $100"],
  ["100to300", "$100–$300"],
  ["over300", "$300 or more"],
  ["unsure", "Not sure"]
];

export function optionLabel(options, value) {
  return options.find(([key]) => key === value)?.[1] || "";
}

const byId = new Map(AID_ORGS.map((org) => [org.id, org]));
export function aidOrg(id) {
  return byId.get(id) || null;
}

function inArea(org, county, inWisconsin) {
  if (org.area === "national") return true;
  if (org.area === "wisconsin") return inWisconsin;
  return Boolean(county) && org.area.includes(county);
}

function areaLabel(org) {
  if (org.area === "national") return "National";
  if (org.area === "wisconsin") return "Wisconsin";
  return org.areaNote || `${org.area.join(", ")} ${org.area.length > 1 ? "counties" : "County"}`;
}

function levelWhy(org) {
  if (org.levels.every((level) => level >= 3)) return "For urgent or emergency care, not this level";
  if (org.levels.every((level) => level <= 2)) return "Only for non-urgent care; it excludes emergencies";
  return "Not for this urgency level";
}

/**
 * @param {{ level: number, county?: string|null, inWisconsin?: boolean, income?: string, estimateHigh?: number|null }} owner
 * @returns {{ now: Match[], after: Match[], notForThis: { org, why }[] }}
 *   Match = { org, fit: "likely" | "check" | "paused", reasons: string[], area: string }
 */
export function matchAid({ level, county = null, inWisconsin = false, income = "skip", estimateHigh = null }) {
  const now = [];
  const after = [];
  const notForThis = [];
  for (const org of AID_ORGS) {
    if (!inArea(org, county, inWisconsin)) continue; // other regions are never shown
    if (!org.levels.includes(level)) { notForThis.push({ org, why: levelWhy(org) }); continue; }
    if (org.needCap && estimateHigh != null && estimateHigh >= org.needCap) {
      notForThis.push({ org, why: `Only helps when the total needed is under $${org.needCap}` });
      continue;
    }
    const reasons = [];
    let fit = "likely";
    if (org.area !== "national") reasons.push(`You're in ${org.area === "wisconsin" ? "Wisconsin" : `${county} County`}`);
    if (org.income === "max60k") {
      if (income === "over60k") { notForThis.push({ org, why: "Household income must be $60,000 a year or less" }); continue; }
      if (income === "skip") { fit = "check"; reasons.push("Household income must be $60,000 a year or less"); }
      else reasons.push("Income limit: $60,000 a year");
    } else if (org.income === "fpl250") {
      if (income === "assist") reasons.push("Government assistance counts as proof of need");
      else { fit = "check"; reasons.push("Needs government assistance or income under 250% of the poverty line (depends on household size)"); }
    } else if (org.income === "need") {
      if (income === "over60k" || income === "skip") { fit = "check"; reasons.push("You'll need to show financial need"); }
      else reasons.push("For owners who can't afford the care");
    }
    if (org.onlyAt) reasons.push(`Only for care at ${org.onlyAt.split("|")[0]}`);
    if (org.status === "confirm") { fit = "check"; reasons.push("Details not re-checked: call to confirm"); }
    if (org.status === "paused") fit = "paused";
    const match = { org, fit, reasons, area: areaLabel(org) };
    (org.when === "now" ? now : after).push(match);
  }
  const rank = { likely: 0, check: 1, paused: 2 };
  const nowOrder = (org) => (level >= 3 ? { financing: 0, grant: 1, "reduced-cost": 2, referral: 3 } : { "reduced-cost": 0, grant: 1, financing: 2, referral: 3 })[org.kind] ?? 4;
  now.sort((a, b) => rank[a.fit] - rank[b.fit] || nowOrder(a.org) - nowOrder(b.org));
  after.sort((a, b) => rank[a.fit] - rank[b.fit]);
  return { now, after, notForThis };
}

/** Warnings for a clinic, given the programs the owner plans to use. */
export function clinicWarnings(shortlist, clinicName) {
  const name = String(clinicName || "");
  const warnings = [];
  for (const id of shortlist || []) {
    const org = aidOrg(id);
    if (!org) continue;
    if (org.notAt && new RegExp(org.notAt, "i").test(name)) warnings.push(`${org.name} won't pay this clinic`);
    if (org.onlyAt && !new RegExp(org.onlyAt, "i").test(name)) warnings.push(`${org.name} only helps at ${org.onlyAt.split("|")[0]}`);
  }
  return warnings;
}

const FROM_VET = /diagnosis|treatment plan|estimate|vet packet|medical form/i;

/** What to ask the vet for at the visit, and what the owner gathers, for the shortlisted programs. */
export function aidChecklist(shortlist) {
  const fromVet = new Set();
  const fromOwner = new Set();
  for (const id of shortlist || []) {
    for (const doc of aidOrg(id)?.docs || []) (FROM_VET.test(doc) ? fromVet : fromOwner).add(doc);
  }
  return { fromVet: [...fromVet], fromOwner: [...fromOwner] };
}

/** Highest published price in the plan's estimate, in dollars (null when there's no price). */
export function estimateHigh(estimate) {
  const amounts = (estimate?.priceLines || []).map((line) => Number(line.amount)).filter((value) => Number.isFinite(value) && value > 0);
  return amounts.length ? Math.max(...amounts) : null;
}
