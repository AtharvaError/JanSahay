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
}

export const PROFILE_KEYS: (keyof UserProfile)[] = [
  "name", "fatherOrHusbandName", "age", "dateOfBirth", "gender", "state", "district", "village",
  "occupation", "annualIncome", "category", "landHectares", "bpl", "disability", "hasGirlChild",
  "girlChildAge", "maritalStatus", "houseType", "shgMember", "hasBankAccount", "mobile",
  "aadhaarLast4", "bankAccountLast4", "ifsc",
];

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
}

export interface DocumentChecklist {
  schemeId: string;
  title: string;
  items: ChecklistItem[];
}

export interface DraftField {
  field: string;
  value: string;
  source: "profile" | "derived" | "needs_input";
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
}

export interface AgentResponse {
  reply: string;
  profile: UserProfile;
  toolCalls: ToolTrace[];
  artifacts: AgentArtifacts;
  engine: "claude" | "offline";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
