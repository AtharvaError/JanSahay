// Shared types for the Scheme Saathi agent (used by both server tools and client UI).

export type Occupation =
  | "farmer"
  | "student"
  | "daily_wage"
  | "business"
  | "self_employed"
  | "govt_employee"
  | "private_employee"
  | "unemployed"
  | "homemaker"
  | "retired"
  | "other";

export type Category = "general" | "sc" | "st" | "obc" | "minority";
export type Gender = "male" | "female" | "other";
export type MaritalStatus = "married" | "unmarried" | "widow" | "divorced" | "separated";
export type HouseType = "none" | "kutcha" | "semi_pucca" | "pucca" | "rented";

export interface UserProfile {
  name?: string;
  fatherOrHusbandName?: string;
  age?: number;
  dateOfBirth?: string; // DD/MM/YYYY
  gender?: Gender;
  state?: string;
  district?: string;
  village?: string;
  occupation?: Occupation;
  annualIncome?: number; // ₹ per year, household
  category?: Category;
  landHectares?: number;
  bpl?: boolean;
  disability?: boolean;
  hasGirlChild?: boolean;
  girlChildAge?: number;
  maritalStatus?: MaritalStatus;
  houseType?: HouseType;
  shgMember?: boolean;
  hasBankAccount?: boolean;
  mobile?: string;
  aadhaarLast4?: string;
  bankAccountLast4?: string;
  ifsc?: string;
  // Provenance of fields filled from an uploaded document (not sent to forms).
  docSources?: Partial<Record<keyof UserProfile, DocType>>;
  uploadedDocs?: DocType[];
}

export const PROFILE_KEYS: (keyof UserProfile)[] = [
  "name", "fatherOrHusbandName", "age", "dateOfBirth", "gender", "state", "district", "village",
  "occupation", "annualIncome", "category", "landHectares", "bpl", "disability", "hasGirlChild",
  "girlChildAge", "maritalStatus", "houseType", "shgMember", "hasBankAccount", "mobile",
  "aadhaarLast4", "bankAccountLast4", "ifsc",
];

// ─── Document upload & extraction ────────────────────────────────────────────

export type DocType =
  | "aadhaar"
  | "ration_card"
  | "income_certificate"
  | "bank_passbook"
  | "land_record"
  | "caste_certificate"
  | "other";

export const DOC_TYPES: DocType[] = [
  "aadhaar", "ration_card", "income_certificate", "bank_passbook", "land_record", "caste_certificate", "other",
];

/** Profile fields that can be read off a document. */
export const EXTRACTABLE_KEYS = [
  "name", "fatherOrHusbandName", "dateOfBirth", "age", "gender", "village", "district", "state",
  "category", "annualIncome", "landHectares", "bpl", "ifsc", "aadhaarLast4", "bankAccountLast4",
] as const satisfies readonly (keyof UserProfile)[];
export type ExtractableKey = (typeof EXTRACTABLE_KEYS)[number];

export interface ExtractedDocument {
  extractionId: string;
  docType: DocType;
  /** Values as editable strings; only last 4 digits of Aadhaar / account ever appear. */
  fields: Partial<Record<ExtractableKey, string>>;
  warnings: string[];
}

export type RuleStatus = "pass" | "fail" | "unknown";

export interface RuleResult {
  rule: string;       // English description
  ruleHi: string;     // Hindi description
  status: RuleStatus;
  field?: keyof UserProfile; // the profile field that would resolve an "unknown"
}

export interface EligibilityResult {
  schemeId: string;
  title: string;
  icon: string;
  verdict: "eligible" | "likely" | "not_eligible";
  score: number; // 0–100
  rules: RuleResult[];
  missingFields: (keyof UserProfile)[];
  benefit: string;
}

export interface ChecklistItem {
  document: string;
  reason: string;
  whereToGet: string;
  inDigiLocker: boolean;
  required: boolean;
  have?: boolean; // the citizen has uploaded this document
}

export interface DocumentChecklist {
  schemeId: string;
  title: string;
  items: ChecklistItem[];
}

export interface DraftField {
  field: string;
  value: string;
  source: "profile" | "document" | "derived" | "needs_input";
  hint: string;
}

export interface ApplicationDraft {
  draftId: string;
  schemeId: string;
  title: string;
  icon: string;
  portalUrl: string;
  fields: DraftField[];
  missing: string[];
  createdAt: string;
  signature: string; // server HMAC — proves the draft came from the prefill tool
  status: "awaiting_confirmation";
}

export interface FollowUp {
  id: string;
  dueDate: string; // ISO date
  title: string;
  done: boolean;
}

export type ApplicationStatus =
  | "submitted"
  | "under_verification"
  | "approved"
  | "action_required"
  | "rejected";

export interface TrackedApplication {
  referenceId: string;
  draftId: string;
  schemeId: string;
  title: string;
  icon: string;
  portalUrl: string;
  fields: DraftField[];
  submittedAt: string;
  confirmedByUser: true;
  status: ApplicationStatus;
  timeline: { status: ApplicationStatus; at: string; note: string }[];
  followUps: FollowUp[];
}

export interface ToolTrace {
  name: string;
  input: unknown;
  summary: string;
}

export interface AgentArtifacts {
  eligibility?: EligibilityResult[];
  checklist?: DocumentChecklist;
  draft?: ApplicationDraft;
  followUps?: FollowUp[];
  extraction?: ExtractedDocument; // awaiting the citizen's confirmation
}

export interface AgentResponse {
  reply: string;
  profile: UserProfile;
  toolCalls: ToolTrace[];
  artifacts: AgentArtifacts;
  engine: "claude" | "sarvam" | "offline";
}

export interface ImageAttachment {
  data: string; // base64, no data: prefix
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
