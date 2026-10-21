import { schemes } from "@/lib/data/schemes";
import type { EligibilityResult, RuleResult, RuleStatus, UserProfile } from "./types";

// ─── Rule helpers ────────────────────────────────────────────────────────────
// Each helper returns "unknown" when the profile lacks the field, so the agent
// knows exactly which question to ask next instead of guessing.

type Rule = (p: UserProfile) => RuleResult;

const r = (rule: string, ruleHi: string, status: RuleStatus, field?: keyof UserProfile): RuleResult =>
  ({ rule, ruleHi, status, field });

const is = (cond: boolean | undefined): RuleStatus =>
  cond === undefined ? "unknown" : cond ? "pass" : "fail";

const norm = (s?: string) => s?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

const ageBetween = (min: number, max: number): Rule => p =>
  r(`Age ${min}–${max} years`, `आयु ${min}–${max} वर्ष`,
    is(p.age === undefined ? undefined : p.age >= min && p.age <= max), "age");

const ageAtLeast = (min: number): Rule => p =>
  r(`Age ${min}+ years`, `आयु ${min}+ वर्ष`, is(p.age === undefined ? undefined : p.age >= min), "age");

const incomeBelow = (limit: number): Rule => p =>
  r(`Family income ≤ ₹${limit.toLocaleString("en-IN")}/year`,
    `पारिवारिक आय ≤ ₹${limit.toLocaleString("en-IN")}/वर्ष`,
    is(p.annualIncome === undefined ? undefined : p.annualIncome <= limit), "annualIncome");

const stateIs = (state: string): Rule => p =>
  r(`Resident of ${state}`, `${state} का निवासी`,
    is(p.state === undefined ? undefined : norm(p.state) === norm(state)), "state");

const occupationIn = (label: string, labelHi: string, occ: string[]): Rule => p =>
  r(label, labelHi, is(p.occupation === undefined ? undefined : occ.includes(p.occupation)), "occupation");

const isFemale: Rule = p =>
  r("Woman applicant", "महिला आवेदक", is(p.gender === undefined ? undefined : p.gender === "female"), "gender");

const isStudent = occupationIn("Currently a student", "वर्तमान में छात्र/छात्रा", ["student"]);

// ─── Rules per scheme ────────────────────────────────────────────────────────
const RULES: Record<string, Rule[]> = {
  "pm-kisan": [
    occupationIn("Farmer (cultivates own land)", "किसान (अपनी जमीन पर खेती)", ["farmer"]),
    p => r("Land holding up to 2 hectares", "2 हेक्टेयर तक जमीन",
      is(p.landHectares === undefined ? undefined : p.landHectares > 0 && p.landHectares <= 2), "landHectares"),
    p => r("Not a government employee", "सरकारी कर्मचारी नहीं",
      is(p.occupation === undefined ? undefined : p.occupation !== "govt_employee"), "occupation"),
  ],
  "ayushman-bharat": [
    p => r("BPL / SECC-listed family (or income ≤ ₹1.2 lakh)", "BPL / SECC सूची वाला परिवार (या आय ≤ ₹1.2 लाख)",
      p.bpl === true ? "pass"
        : p.annualIncome !== undefined ? (p.annualIncome <= 120000 ? "pass" : "fail")
        : p.bpl === false ? "fail" : "unknown", "bpl"),
  ],
  "pmay": [
    p => r("No pucca house in family", "परिवार के पास पक्का मकान नहीं",
      is(p.houseType === undefined ? undefined : p.houseType !== "pucca"), "houseType"),
    incomeBelow(1800000),
  ],
  "nsp": [
    isStudent,
    incomeBelow(250000),
    p => r("SC / ST / OBC / Minority category", "SC / ST / OBC / अल्पसंख्यक वर्ग",
      is(p.category === undefined ? undefined : p.category !== "general"), "category"),
  ],
  "pm-mudra": [
    occupationIn("Runs or starts a small non-farm business", "छोटा गैर-कृषि व्यवसाय चलाते/शुरू करते हैं",
      ["business", "self_employed", "unemployed"]),
    ageBetween(18, 65),
  ],
  "beti-bachao": [
    p => r("Has a girl child below 10 years", "10 वर्ष से कम उम्र की बेटी",
      p.hasGirlChild === false ? "fail"
        : p.girlChildAge !== undefined ? (p.girlChildAge < 10 ? "pass" : "fail")
        : "unknown", p.hasGirlChild === undefined ? "hasGirlChild" : "girlChildAge"),
  ],
  "stand-up-india": [
    p => r("SC/ST or woman entrepreneur", "SC/ST या महिला उद्यमी",
      p.gender === "female" || p.category === "sc" || p.category === "st" ? "pass"
        : p.gender !== undefined && p.category !== undefined ? "fail" : "unknown",
      p.gender === undefined ? "gender" : "category"),
    ageAtLeast(18),
    occupationIn("Starting a new (greenfield) enterprise", "नया उद्यम शुरू करना",
      ["business", "self_employed", "unemployed"]),
  ],
  "pm-suraksha-bima": [
    ageBetween(18, 70),
    p => r("Has a savings bank account", "बचत बैंक खाता है", is(p.hasBankAccount), "hasBankAccount"),
  ],
  "nps-traders": [
    ageBetween(18, 40),
    occupationIn("Small trader / shopkeeper / self-employed", "छोटे व्यापारी / दुकानदार / स्वरोजगार",
      ["business", "self_employed"]),
  ],
  "skill-loan": [
    ageAtLeast(18),
    occupationIn("Student or job-seeker joining a skill course", "कौशल कोर्स करने वाला छात्र या बेरोजगार",
      ["student", "unemployed"]),
  ],
  "post-matric-scholarship-pwd": [
    p => r("Disability of 40% or more", "40% या अधिक दिव्यांगता", is(p.disability), "disability"),
    isStudent,
    incomeBelow(250000),
  ],
  "kanyashree-prakalpa": [
    stateIs("West Bengal"),
    isFemale,
    ageBetween(13, 19),
    isStudent,
    incomeBelow(120000),
  ],
  "bihar-student-credit-card": [
    stateIs("Bihar"),
    isStudent,
    p => r("Age up to 25 (30 for PG)", "आयु 25 वर्ष तक (PG के लिए 30)",
      is(p.age === undefined ? undefined : p.age <= 30), "age"),
  ],
  "old-age-samman-allowance": [
    ageAtLeast(60),
    stateIs("Haryana"),
    incomeBelow(200000),
  ],
  "mahila-utkarsh-yojana": [
    isFemale,
    stateIs("Gujarat"),
    p => r("Member of a Self-Help Group", "स्वयं सहायता समूह की सदस्य", is(p.shgMember), "shgMember"),
  ],
  "aapki-beti-hamari-beti": [
    stateIs("Haryana"),
    p => r("Has a girl child born after Jan 2015", "जनवरी 2015 के बाद जन्मी बेटी",
      p.hasGirlChild === false ? "fail"
        : p.girlChildAge !== undefined ? (p.girlChildAge <= 10 ? "pass" : "fail")
        : "unknown", p.hasGirlChild === undefined ? "hasGirlChild" : "girlChildAge"),
    p => r("SC or BPL family", "SC या BPL परिवार",
      p.bpl === true || p.category === "sc" ? "pass"
        : p.bpl === false && p.category !== undefined ? "fail" : "unknown", "bpl"),
  ],
  "gatidhara": [
    stateIs("West Bengal"),
    occupationIn("Unemployed youth", "बेरोजगार युवा", ["unemployed"]),
    ageBetween(18, 45),
    incomeBelow(250000),
  ],
  "cm-ekal-nari-pension": [
    isFemale,
    p => r("Widow / divorced / separated / single woman", "विधवा / तलाकशुदा / परित्यक्ता / एकल महिला",
      is(p.maritalStatus === undefined ? undefined : p.maritalStatus !== "married"), "maritalStatus"),
    ageAtLeast(18),
    stateIs("Rajasthan"),
    incomeBelow(48000),
  ],
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function evaluateScheme(schemeId: string, profile: UserProfile): EligibilityResult | null {
  const scheme = schemes.find(s => s.id === schemeId);
  if (!scheme) return null;
  const rules = (RULES[schemeId] ?? []).map(rule => rule(profile));

  const passed = rules.filter(x => x.status === "pass").length;
  const failed = rules.some(x => x.status === "fail");
  const unknown = rules.filter(x => x.status === "unknown");
  const score = rules.length ? Math.round((passed / rules.length) * 100) : 0;

  // "likely" = nothing failed yet but some answers are still missing.
  const verdict = failed ? "not_eligible" : unknown.length === 0 ? "eligible" : "likely";

  return {
    schemeId: scheme.id,
    title: scheme.title,
    icon: scheme.icon,
    verdict,
    score: failed ? Math.min(score, 40) : score,
    rules,
    missingFields: [...new Set(unknown.map(u => u.field).filter(Boolean))] as (keyof UserProfile)[],
    benefit: scheme.benefits[0] ?? "",
  };
}

/** Evaluate every scheme; eligible first, then likely (most rules satisfied), then the rest. */
export function evaluateAll(profile: UserProfile): EligibilityResult[] {
  const order = { eligible: 0, likely: 1, not_eligible: 2 } as const;
  return schemes
    .map(s => evaluateScheme(s.id, profile))
    .filter((x): x is EligibilityResult => x !== null)
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.score - a.score);
}

/** The profile fields that would unlock the most "likely" schemes — drives the next question. */
export function mostUsefulMissingFields(profile: UserProfile): (keyof UserProfile)[] {
  const counts = new Map<keyof UserProfile, number>();
  for (const res of evaluateAll(profile)) {
    if (res.verdict === "not_eligible") continue;
    for (const f of res.missingFields) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
}
