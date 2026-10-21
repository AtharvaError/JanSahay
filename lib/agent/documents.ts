import { schemes } from "@/lib/data/schemes";
import type { ApplicationDraft, ChecklistItem, DocumentChecklist, DraftField, UserProfile } from "./types";

// ─── Document checklist ──────────────────────────────────────────────────────

const DOC_INFO: { match: RegExp; whereToGet: string; inDigiLocker: boolean }[] = [
  { match: /aadhaar/i, whereToGet: "UIDAI / nearest Aadhaar Seva Kendra (download e-Aadhaar at myaadhaar.uidai.gov.in)", inDigiLocker: true },
  { match: /pan/i, whereToGet: "Income Tax e-filing portal or NSDL/UTIITSL PAN centre", inDigiLocker: true },
  { match: /income/i, whereToGet: "Tehsildar / revenue office or your state e-District portal", inDigiLocker: true },
  { match: /caste|sc\/st|bpl/i, whereToGet: "Tehsildar / SDM office or state e-District portal", inDigiLocker: true },
  { match: /domicile|residence/i, whereToGet: "Tehsildar office or state e-District portal", inDigiLocker: true },
  { match: /ration/i, whereToGet: "Food & Civil Supplies office / state ration card portal", inDigiLocker: true },
  { match: /land|plot/i, whereToGet: "Patwari / Tehsil office or state Bhulekh land-records portal", inDigiLocker: false },
  { match: /bank|passbook|account|ifsc/i, whereToGet: "Your bank branch (first page of passbook or a cancelled cheque)", inDigiLocker: false },
  { match: /photo/i, whereToGet: "Any photo studio — recent passport-size photo with white background", inDigiLocker: false },
  { match: /birth/i, whereToGet: "Municipal / Gram Panchayat birth registrar or hospital", inDigiLocker: true },
  { match: /mark|class 12|certificate.*school|enrol/i, whereToGet: "Your school / board (also on DigiLocker for most boards)", inDigiLocker: true },
  { match: /disab/i, whereToGet: "District medical board — apply via UDID portal (swavlambancard.gov.in)", inDigiLocker: true },
  { match: /driving/i, whereToGet: "RTO / Parivahan Sarathi portal", inDigiLocker: true },
  { match: /admission|course|fee/i, whereToGet: "Your institute's admission office", inDigiLocker: false },
  { match: /shg/i, whereToGet: "Your SHG federation / block NRLM office", inDigiLocker: false },
  { match: /business plan/i, whereToGet: "Prepare yourself or with help from the bank / CSC (we can help draft it)", inDigiLocker: false },
  { match: /death|divorce|court/i, whereToGet: "Municipal registrar (death certificate) or family court (decree)", inDigiLocker: true },
  { match: /mobile/i, whereToGet: "Mobile number linked to your Aadhaar / bank", inDigiLocker: false },
];

function docInfo(doc: string) {
  return DOC_INFO.find(d => d.match.test(doc)) ?? { whereToGet: "Issuing government office / CSC centre", inDigiLocker: false };
}

/** Build a checklist tailored to the profile (e.g. drop caste certificate for General category). */
export function buildChecklist(schemeId: string, profile: UserProfile): DocumentChecklist | null {
  const scheme = schemes.find(s => s.id === schemeId);
  if (!scheme) return null;

  const items: ChecklistItem[] = [];
  for (const doc of scheme.documents) {
    const lower = doc.toLowerCase();
    let required = true;
    let reason = `Required by ${scheme.title}`;

    if (/caste/.test(lower)) {
      if (profile.category === "general") continue; // not applicable
      reason = "Proves your social category for reserved benefits";
      required = profile.category !== undefined;
    }
    if (/bpl/.test(lower) && profile.bpl === false && profile.category !== "sc") continue;
    if (/income/.test(lower)) reason = "Proves your family income is within the scheme limit";
    if (/aadhaar/.test(lower)) reason = "Identity proof and e-KYC";
    if (/bank|passbook/.test(lower)) reason = "Benefit is paid by Direct Benefit Transfer (DBT) to this account";
    if (/land/.test(lower)) reason = "Proves land ownership and size";

    const info = docInfo(doc);
    items.push({ document: doc, reason, whereToGet: info.whereToGet, inDigiLocker: info.inDigiLocker, required });
  }

  // Extra documents implied by the profile
  if (profile.disability && !items.some(i => /disab/i.test(i.document))) {
    items.push({
      document: "Disability certificate / UDID card",
      reason: "Unlocks disability-linked benefits and relaxations",
      whereToGet: docInfo("disability").whereToGet,
      inDigiLocker: true,
      required: false,
    });
  }

  return { schemeId: scheme.id, title: scheme.title, items };
}

// ─── Form pre-fill ───────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = { general: "General", sc: "SC", st: "ST", obc: "OBC", minority: "Minority" };

function valueFor(fieldName: string, p: UserProfile): { value: string; source: DraftField["source"] } | null {
  const f = fieldName.toLowerCase();
  const v = (value: string | undefined, source: DraftField["source"] = "profile") =>
    value ? { value, source } : null;

  if (/aadhaar/.test(f)) return v(p.aadhaarLast4 ? `XXXX XXXX ${p.aadhaarLast4}` : undefined);
  if (/father|husband/.test(f)) return v(p.fatherOrHusbandName);
  if (/(farmer|applicant|head of family|student|full|^)\s*name/.test(f) && !/school|institute|bank|business|hospital/.test(f)) return v(p.name);
  if (/date of birth|dob/.test(f)) return v(p.dateOfBirth);
  if (/^age/.test(f)) return v(p.age?.toString());
  if (/gender/.test(f)) return v(p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : undefined);
  if (/state.*district|state \/ /.test(f)) {
    const parts = [p.state, p.district].filter(Boolean);
    return parts.length ? { value: parts.join(" → "), source: "profile" } : null;
  }
  if (/^state$|^state\b/.test(f)) return v(p.state);
  if (/district/.test(f)) return v(p.district);
  if (/village|ward/.test(f)) return v(p.village);
  if (/account number|bank account/.test(f)) return v(p.bankAccountLast4 ? `XXXXXX${p.bankAccountLast4}` : undefined);
  if (/ifsc/.test(f)) return v(p.ifsc);
  if (/land holding|hectare/.test(f)) return v(p.landHectares?.toString());
  if (/mobile|phone/.test(f)) return v(p.mobile);
  if (/income/.test(f) && !/certificate/.test(f)) return v(p.annualIncome !== undefined ? `₹${p.annualIncome.toLocaleString("en-IN")}` : undefined);
  if (/category|caste/.test(f) && !/certificate/.test(f)) return v(p.category ? CATEGORY_LABEL[p.category] : undefined);
  if (/marital/.test(f)) return v(p.maritalStatus);
  return null;
}

/** Pre-fill the scheme's application form from the profile. Unsigned — the server adds the signature. */
export function prefillForm(schemeId: string, profile: UserProfile): Omit<ApplicationDraft, "signature" | "draftId" | "createdAt"> | null {
  const scheme = schemes.find(s => s.id === schemeId);
  if (!scheme) return null;

  const fields: DraftField[] = scheme.formFields.map(ff => {
    const found = valueFor(ff.field, profile);
    return {
      field: ff.field,
      value: found?.value ?? "",
      source: found?.source ?? "needs_input",
      hint: ff.hint,
    };
  });

  return {
    schemeId: scheme.id,
    title: scheme.title,
    icon: scheme.icon,
    portalUrl: scheme.portalUrl,
    fields,
    missing: fields.filter(f => !f.value).map(f => f.field),
    status: "awaiting_confirmation",
  };
}
