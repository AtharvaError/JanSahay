import { createHmac, randomUUID } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { schemes } from "@/lib/data/schemes";
import { evaluateAll, evaluateScheme } from "./eligibility";
import { buildChecklist, prefillForm } from "./documents";
import type {
  AgentArtifacts, ApplicationDraft, FollowUp, ToolTrace, TrackedApplication, UserProfile,
} from "./types";
import { PROFILE_KEYS } from "./types";

// ─── Draft signing ───────────────────────────────────────────────────────────
// Drafts are signed so the submit endpoint only accepts forms produced by the
// prefill tool and reviewed by the user — the agent itself can never submit.

const SECRET = process.env.DRAFT_SIGNING_SECRET ?? "jansahay-dev-secret-change-me";

export function signDraft(d: Pick<ApplicationDraft, "draftId" | "schemeId">): string {
  return createHmac("sha256", SECRET).update(`${d.draftId}:${d.schemeId}`).digest("hex");
}

export function verifyDraft(d: Pick<ApplicationDraft, "draftId" | "schemeId" | "signature">): boolean {
  return typeof d.signature === "string" && d.signature === signDraft(d);
}

// ─── Profile merging with light validation ───────────────────────────────────

const ENUMS: Partial<Record<keyof UserProfile, string[]>> = {
  occupation: ["farmer", "student", "daily_wage", "business", "self_employed", "govt_employee", "private_employee", "unemployed", "homemaker", "retired", "other"],
  category: ["general", "sc", "st", "obc", "minority"],
  gender: ["male", "female", "other"],
  maritalStatus: ["married", "unmarried", "widow", "divorced", "separated"],
  houseType: ["none", "kutcha", "semi_pucca", "pucca", "rented"],
};
const NUMBERS: (keyof UserProfile)[] = ["age", "annualIncome", "landHectares", "girlChildAge"];
const BOOLS: (keyof UserProfile)[] = ["bpl", "disability", "hasGirlChild", "shgMember", "hasBankAccount"];

export function mergeProfile(base: UserProfile, patch: Record<string, unknown>): UserProfile {
  const out: Record<string, unknown> = { ...base };
  for (const key of PROFILE_KEYS) {
    const val = patch[key];
    if (val === undefined || val === null || val === "") continue;
    if (NUMBERS.includes(key)) {
      const n = Number(val);
      if (Number.isFinite(n) && n >= 0) out[key] = n;
    } else if (BOOLS.includes(key)) {
      out[key] = val === true || val === "true";
    } else if (ENUMS[key]) {
      const s = String(val).toLowerCase();
      if (ENUMS[key]!.includes(s)) out[key] = s;
    } else if (key === "aadhaarLast4" || key === "bankAccountLast4") {
      // Only ever keep the last 4 digits — never store full Aadhaar / account numbers.
      const digits = String(val).replace(/\D/g, "");
      if (digits.length >= 4) out[key] = digits.slice(-4);
    } else if (key === "mobile") {
      const digits = String(val).replace(/\D/g, "").slice(-10);
      if (digits.length === 10) out[key] = digits;
    } else {
      out[key] = String(val).trim().slice(0, 120);
    }
  }
  return out as UserProfile;
}

// ─── Tool definitions (Claude tool-use schema) ───────────────────────────────

const schemeIdEnum = schemes.map(s => s.id);

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "update_profile",
    description:
      "Save facts the citizen has told you about themselves (in any language) into their profile. Call this every time the user shares personal details, BEFORE checking eligibility. Convert to the canonical units: annualIncome in rupees per year (monthly × 12; '2 lakh' = 200000), landHectares in hectares (1 acre = 0.405 ha, 1 bigha ≈ 0.25 ha). Only pass fields the user actually stated. For Aadhaar or bank account, pass at most the last 4 digits.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        fatherOrHusbandName: { type: "string" },
        age: { type: "number" },
        dateOfBirth: { type: "string", description: "DD/MM/YYYY" },
        gender: { type: "string", enum: ENUMS.gender },
        state: { type: "string", description: "Indian state name in English, e.g. 'Uttar Pradesh'" },
        district: { type: "string" },
        village: { type: "string" },
        occupation: { type: "string", enum: ENUMS.occupation },
        annualIncome: { type: "number", description: "Household income in ₹ per year" },
        category: { type: "string", enum: ENUMS.category },
        landHectares: { type: "number" },
        bpl: { type: "boolean" },
        disability: { type: "boolean" },
        hasGirlChild: { type: "boolean" },
        girlChildAge: { type: "number" },
        maritalStatus: { type: "string", enum: ENUMS.maritalStatus },
        houseType: { type: "string", enum: ENUMS.houseType },
        shgMember: { type: "boolean" },
        hasBankAccount: { type: "boolean" },
        mobile: { type: "string" },
        aadhaarLast4: { type: "string" },
        bankAccountLast4: { type: "string" },
        ifsc: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "check_eligibility",
    description:
      "Run the official eligibility rules engine against the citizen's saved profile. Returns each scheme's verdict (eligible / likely / not_eligible), which rules passed or failed, and which profile fields are still missing. Always use this tool — never decide eligibility yourself. Omit scheme_ids to check all schemes.",
    input_schema: {
      type: "object",
      properties: {
        scheme_ids: { type: "array", items: { type: "string", enum: schemeIdEnum } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_document_checklist",
    description:
      "Build the personalised list of documents the citizen needs for one scheme, with where to obtain each and whether it can be fetched from DigiLocker.",
    input_schema: {
      type: "object",
      properties: { scheme_id: { type: "string", enum: schemeIdEnum } },
      required: ["scheme_id"],
      additionalProperties: false,
    },
  },
  {
    name: "prefill_application_form",
    description:
      "Pre-fill the scheme's application form from the saved profile. This only creates a DRAFT that is shown to the citizen for review. You cannot submit it: the citizen must press 'Confirm & Submit' themselves after checking every field. Tell them to review the draft card. Before calling, collect at least name and mobile number.",
    input_schema: {
      type: "object",
      properties: { scheme_id: { type: "string", enum: schemeIdEnum } },
      required: ["scheme_id"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_follow_up",
    description:
      "Create a follow-up reminder for the citizen (e.g. collect a missing document, check application status, check DBT credit).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short reminder text in the user's language" },
        days_from_now: { type: "number" },
      },
      required: ["title", "days_from_now"],
      additionalProperties: false,
    },
  },
  {
    name: "get_application_status",
    description:
      "Look up the status, timeline and pending follow-ups of the citizen's submitted applications. Pass a reference_id to look up one application, or omit to list all.",
    input_schema: {
      type: "object",
      properties: { reference_id: { type: "string" } },
      additionalProperties: false,
    },
  },
];

// ─── Tool execution ──────────────────────────────────────────────────────────

export interface ToolContext {
  profile: UserProfile;
  applications: TrackedApplication[];
  artifacts: AgentArtifacts;
  traces: ToolTrace[];
}

export function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext): unknown {
  switch (name) {
    case "update_profile": {
      ctx.profile = mergeProfile(ctx.profile, input);
      ctx.traces.push({ name, input, summary: `Saved ${Object.keys(input).join(", ")}` });
      return { ok: true, profile: ctx.profile };
    }

    case "check_eligibility": {
      const ids = Array.isArray(input.scheme_ids) ? (input.scheme_ids as string[]) : null;
      const results = ids
        ? ids.map(id => evaluateScheme(id, ctx.profile)).filter(Boolean)
        : evaluateAll(ctx.profile);
      const list = results as NonNullable<ReturnType<typeof evaluateScheme>>[];
      ctx.artifacts.eligibility = list;
      const eligible = list.filter(r => r.verdict === "eligible");
      const likely = list.filter(r => r.verdict === "likely" && r.score > 0);
      ctx.traces.push({ name, input, summary: `${eligible.length} eligible, ${likely.length} likely` });
      return {
        eligible: eligible.map(r => ({ id: r.schemeId, title: r.title, benefit: r.benefit })),
        likely: likely.slice(0, 6).map(r => ({
          id: r.schemeId, title: r.title, benefit: r.benefit, score: r.score,
          missing_fields: r.missingFields,
        })),
        not_eligible_count: list.filter(r => r.verdict === "not_eligible").length,
      };
    }

    case "get_document_checklist": {
      const checklist = buildChecklist(String(input.scheme_id), ctx.profile);
      if (!checklist) return { error: "Unknown scheme_id" };
      ctx.artifacts.checklist = checklist;
      ctx.traces.push({ name, input, summary: `${checklist.items.length} documents` });
      return checklist;
    }

    case "prefill_application_form": {
      const base = prefillForm(String(input.scheme_id), ctx.profile);
      if (!base) return { error: "Unknown scheme_id" };
      const draftId = `DRAFT-${randomUUID().slice(0, 8).toUpperCase()}`;
      const draft: ApplicationDraft = {
        ...base,
        draftId,
        createdAt: new Date().toISOString(),
        signature: signDraft({ draftId, schemeId: base.schemeId }),
      };
      ctx.artifacts.draft = draft;
      ctx.traces.push({ name, input, summary: `${draft.fields.length - draft.missing.length}/${draft.fields.length} fields filled` });
      return {
        draft_id: draftId,
        status: "awaiting_user_confirmation",
        filled: draft.fields.filter(f => f.value).map(f => ({ field: f.field, value: f.value })),
        needs_user_input: draft.missing,
        note: "Draft is shown to the citizen with a Confirm & Submit button. Nothing has been submitted.",
      };
    }

    case "schedule_follow_up": {
      const days = Math.max(0, Math.min(365, Number(input.days_from_now) || 7));
      const fu: FollowUp = {
        id: `FU-${randomUUID().slice(0, 6)}`,
        title: String(input.title).slice(0, 140),
        dueDate: new Date(Date.now() + days * 86400000).toISOString(),
        done: false,
      };
      ctx.artifacts.followUps = [...(ctx.artifacts.followUps ?? []), fu];
      ctx.traces.push({ name, input, summary: `Reminder in ${days} days` });
      return { ok: true, follow_up: fu };
    }

    case "get_application_status": {
      const ref = input.reference_id ? String(input.reference_id).toUpperCase() : null;
      const apps = ref ? ctx.applications.filter(a => a.referenceId === ref) : ctx.applications;
      ctx.traces.push({ name, input, summary: `${apps.length} application(s)` });
      if (!apps.length) return { applications: [], note: "No submitted applications found." };
      return {
        applications: apps.map(a => ({
          reference_id: a.referenceId,
          scheme: a.title,
          status: a.status,
          submitted_at: a.submittedAt,
          pending_follow_ups: a.followUps.filter(f => !f.done).map(f => ({ title: f.title, due: f.dueDate })),
        })),
      };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
}
