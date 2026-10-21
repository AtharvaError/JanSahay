// Offline Scheme Saathi agent — used when no ANTHROPIC_API_KEY is configured.
// It follows the same contract as the Claude agent: every decision goes through
// the same tools (update_profile → check_eligibility → get_document_checklist →
// prefill_application_form → schedule_follow_up), and it never submits anything.
import type { LangCode } from "@/lib/translations";
import { schemes } from "@/lib/data/schemes";
import { evaluateScheme, mostUsefulMissingFields } from "./eligibility";
import { MSG, QUESTIONS, STATUS_LABEL, fill, type AskField } from "./i18n";
import { detectIntent, detectScheme, extractFacts, isSkip } from "./nlu";
import { buildChecklist } from "./documents";
import { executeTool, type ToolContext } from "./tools.server";
import type { AgentResponse, DocumentChecklist, EligibilityResult, TrackedApplication, UserProfile } from "./types";

export interface OfflineState {
  stage: "collect" | "choose" | "apply" | "review";
  asked?: AskField;
  scheme?: string;
  offered?: string[];
  extrasAsked?: number;
  skipped?: AskField[];
  retries?: number;
}

const CORE: AskField[] = ["occupation", "age", "gender", "state", "annualIncome", "category"];
const ASKABLE = new Set<string>(Object.keys(QUESTIONS));
const MAX_EXTRAS = 3;

export function runOfflineAgent(input: {
  message: string;
  lang: LangCode;
  profile: UserProfile;
  state?: OfflineState;
  applications: TrackedApplication[];
}): AgentResponse & { state: OfflineState } {
  const { lang } = input;
  const L = (m: Record<LangCode, string>) => m[lang] ?? m.en;
  let state: OfflineState = { stage: "collect", extrasAsked: 0, skipped: [], ...input.state };
  const ctx: ToolContext = { profile: { ...input.profile }, applications: input.applications, artifacts: {}, traces: [] };
  const lines: string[] = [];
  const msg = input.message.trim();

  const done = (): AgentResponse & { state: OfflineState } => ({
    reply: lines.join("\n"),
    profile: ctx.profile,
    toolCalls: ctx.traces,
    artifacts: ctx.artifacts,
    engine: "offline",
    state,
  });

  const ask = (field: AskField) => {
    state.asked = field;
    lines.push(L(QUESTIONS[field]));
    return done();
  };

  // ── Start of conversation ──
  if (!msg || msg === "__start__") {
    lines.push(L(MSG.greet));
    const next = CORE.find(f => ctx.profile[f] === undefined);
    if (next) return ask(next);
    return showEligibility();
  }

  // ── Intents that work at any stage ──
  const intent = detectIntent(msg);
  if (intent === "reset") {
    ctx.profile = {};
    state = { stage: "collect", extrasAsked: 0, skipped: [] };
    lines.push(L(MSG.greet));
    return ask("occupation");
  }
  if (intent === "status") {
    const result = executeTool("get_application_status", {}, ctx) as { applications: { reference_id: string; scheme: string; status: string; pending_follow_ups: { title: string; due: string }[] }[] };
    if (!result.applications.length) lines.push(L(MSG.noApps));
    for (const a of result.applications) {
      lines.push("• " + fill(L(MSG.statusLine), { scheme: a.scheme, ref: a.reference_id, status: L(STATUS_LABEL[a.status] ?? STATUS_LABEL.submitted) }));
      for (const f of a.pending_follow_ups) lines.push(`   ⏰ ${f.title} — ${new Date(f.due).toLocaleDateString("en-IN")}`);
    }
    return done();
  }

  // ── Save whatever facts the user told us ──
  const facts = extractFacts(msg, state.asked);
  if (Object.keys(facts).length) executeTool("update_profile", facts as Record<string, unknown>, ctx);
  else if (state.asked && isSkip(msg)) state.skipped = [...(state.skipped ?? []), state.asked];

  // ── Picking a scheme (explicit name, ordinal, or "apply for …") ──
  // Ordinals ("2", "दूसरी") only count while the user is choosing from a list we showed.
  const choosing = state.stage === "choose" || state.stage === "review";
  const picked = detectScheme(msg, choosing ? state.offered : []);
  if (picked && picked !== state.scheme && (choosing || intent === "apply" || !Object.keys(facts).length)) {
    state.scheme = picked;
    state.stage = "apply";
    state.asked = undefined;
    const cl = executeTool("get_document_checklist", { scheme_id: picked }, ctx) as DocumentChecklist;
    lines.push(formatChecklist(cl));
    return continueApply();
  }

  if (intent === "documents" && state.scheme) {
    const cl = executeTool("get_document_checklist", { scheme_id: state.scheme }, ctx) as DocumentChecklist;
    lines.push(formatChecklist(cl));
    return state.stage === "apply" ? continueApply() : done();
  }

  // Didn't understand the answer to a direct question → re-ask it once more.
  const answered = state.asked ? ctx.profile[state.asked] !== undefined || state.skipped?.includes(state.asked) : true;
  // (If they told us other facts instead, just carry on — the question comes back later.)
  if (!answered && state.asked && !Object.keys(facts).length) {
    lines.push(L(MSG.notUnderstood));
    if (!state.retries) {
      state.retries = 1;
      return ask(state.asked);
    }
    // Second miss: skip this question rather than looping forever.
    state.skipped = [...(state.skipped ?? []), state.asked];
  }
  state.retries = 0;

  switch (state.stage) {
    case "collect": return continueCollect();
    case "apply": return continueApply();
    case "choose":
    case "review":
    default:
      if (Object.keys(facts).length) return showEligibility(); // new info → re-check
      lines.push(L(MSG.choose));
      return done();
  }

  // ─── Stage handlers ────────────────────────────────────────────────────────

  function continueCollect() {
    if (Object.keys(facts).length && !state.asked) lines.push(L(MSG.noted));
    // Farmers: land size matters for PM-KISAN, ask right after occupation.
    if (ctx.profile.occupation === "farmer" && ctx.profile.landHectares === undefined && !state.skipped?.includes("landHectares"))
      return ask("landHectares");
    const nextCore = CORE.find(f => ctx.profile[f] === undefined && !state.skipped?.includes(f));
    if (nextCore) return ask(nextCore);

    if ((state.extrasAsked ?? 0) < MAX_EXTRAS) {
      const extra = mostUsefulMissingFields(ctx.profile)
        .find(f => ASKABLE.has(f) && !state.skipped?.includes(f as AskField)) as AskField | undefined;
      if (extra) {
        state.extrasAsked = (state.extrasAsked ?? 0) + 1;
        return ask(extra);
      }
    }
    return showEligibility();
  }

  function showEligibility() {
    state.asked = undefined;
    const res = executeTool("check_eligibility", {}, ctx) as {
      eligible: { id: string; title: string; benefit: string }[];
      likely: { id: string; title: string; benefit: string; score: number }[];
    };
    const offered = [...res.eligible.slice(0, 5), ...res.likely.filter(l => l.score >= 50).slice(0, 3)];
    if (!offered.length) {
      lines.push(L(MSG.none));
      state.stage = "collect";
      return done();
    }
    let i = 1;
    if (res.eligible.length) {
      lines.push(L(MSG.eligibleIntro));
      for (const s of res.eligible.slice(0, 5)) lines.push(`${i++}. ${icon(s.id)} ${s.title} — ${s.benefit}`);
    }
    const likely = res.likely.filter(l => l.score >= 50).slice(0, 3);
    if (likely.length) {
      lines.push(L(MSG.likelyIntro));
      for (const s of likely) lines.push(`${i++}. ${icon(s.id)} ${s.title} — ${s.benefit}`);
    }
    lines.push(L(MSG.choose));
    state.offered = offered.map(o => o.id);
    state.stage = "choose";
    return done();
  }

  function continueApply() {
    const schemeId = state.scheme!;
    const scheme = schemes.find(s => s.id === schemeId)!;
    const skipped = new Set(state.skipped ?? []);

    // 1) Resolve any eligibility questions still open for this scheme.
    const ev = evaluateScheme(schemeId, ctx.profile) as EligibilityResult;
    const openRule = ev.missingFields.find(f => ASKABLE.has(f) && !skipped.has(f as AskField)) as AskField | undefined;
    if (openRule) return ask(openRule);

    // 2) Details needed to pre-fill the form.
    const formText = scheme.formFields.map(f => f.field.toLowerCase()).join(" | ");
    const needed: AskField[] = ["name", "mobile"];
    if (/father|husband/.test(formText)) needed.push("fatherOrHusbandName");
    if (/district/.test(formText)) needed.push("district");
    if (/village|ward/.test(formText)) needed.push("village");
    if (/aadhaar/.test(formText)) needed.push("aadhaarLast4");
    const nextField = needed.find(f => !ctx.profile[f] && !skipped.has(f));
    if (nextField) return ask(nextField);

    // 3) Pre-fill → draft awaiting the citizen's confirmation.
    state.asked = undefined;
    const draft = executeTool("prefill_application_form", { scheme_id: schemeId }, ctx) as { filled: unknown[]; needs_user_input: string[] };
    const total = draft.filled.length + draft.needs_user_input.length;
    lines.push(fill(L(MSG.draftReady), { scheme: scheme.title, filled: draft.filled.length, total }));

    // 4) Follow-up for documents that can't be auto-fetched.
    const cl = buildChecklist(schemeId, ctx.profile);
    if (cl?.items.some(i => !i.inDigiLocker)) {
      const fu = executeTool("schedule_follow_up", { title: fill(L(MSG.followUpTitle), { scheme: scheme.title }), days_from_now: 3 }, ctx) as { follow_up: { dueDate: string } };
      lines.push(fill(L(MSG.followUpSet), { date: new Date(fu.follow_up.dueDate).toLocaleDateString("en-IN") }));
    }
    state.stage = "review";
    return done();
  }

  function formatChecklist(cl: DocumentChecklist) {
    const out = [fill(L(MSG.checklist), { scheme: cl.title })];
    for (const it of cl.items) out.push(`• ${it.document}${it.inDigiLocker ? " 📲" : ""}`);
    out.push(L(MSG.digilocker));
    return out.join("\n");
  }
}

function icon(id: string) {
  return schemes.find(s => s.id === id)?.icon ?? "📄";
}
