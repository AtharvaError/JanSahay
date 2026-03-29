"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, FileText, ExternalLink,
  ChevronRight, ChevronLeft, AlertCircle, Sparkles,
  BookOpen, MousePointerClick, ThumbsUp, Copy,
  Upload, Clock, ShieldCheck, XCircle, ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Scheme } from "@/lib/data/schemes";
import { documents as allDocs } from "@/lib/data/schemes";

// ─── Wizard step definitions ─────────────────────────────────────────────────
const STEP_KEYS = [
  { id: "documents", icon: ShieldCheck,       labelKey: "docCheck"      },
  { id: "guide",     icon: BookOpen,           labelKey: "formFieldGuide"},
  { id: "portal",    icon: MousePointerClick,  labelKey: "applyOnPortal" },
  { id: "done",      icon: ThumbsUp,           labelKey: "allDone"       },
] as const;

// ─── Per-scheme portal guidance ───────────────────────────────────────────────
const PORTAL_STEPS: Record<string, { intro: string; steps: { emoji: string; title: string; detail: string }[] }> = {
  "pm-kisan": {
    intro: "Follow these steps exactly on pmkisan.gov.in to register and submit your PM-KISAN application.",
    steps: [
      { emoji: "🔗", title: "Open Farmer Corner", detail: 'Visit pmkisan.gov.in → click the "Farmer Corner" tab in the top navigation menu.' },
      { emoji: "📝", title: "New Farmer Registration", detail: 'Click "New Farmer Registration". A popup asks Rural or Urban — select based on your land location.' },
      { emoji: "📱", title: "Aadhaar e-KYC", detail: "Enter your 12-digit Aadhaar number and click Get OTP. Enter the 6-digit OTP sent to your Aadhaar-linked mobile within 10 minutes." },
      { emoji: "👤", title: "Personal Details", detail: "Fill Name, Father/Husband Name, Date of Birth, and Gender exactly as printed on your Aadhaar card. Even a single letter difference will cause rejection." },
      { emoji: "🗺️", title: "Location Details", detail: "Select State → District → Sub-District → Block → Village from cascading dropdown menus. Choose 'Rural' for village land." },
      { emoji: "🏦", title: "Bank Account", detail: "Enter your savings account number and IFSC code from your bank passbook. This account must be in your name and active — it receives ₹2,000 instalments." },
      { emoji: "🌾", title: "Land Details", detail: "Enter your agricultural land holding in hectares (max 2 ha). Click 'Add' to enter land survey number, khasra number, and upload the Land Record (PDF/JPG, max 2 MB)." },
      { emoji: "📸", title: "Upload Photo", detail: "Upload a recent passport-size photograph in JPG format, max 100 KB. The face must be clearly visible against a white background." },
      { emoji: "✅", title: "Submit & Screenshot", detail: 'Review all details carefully, then click "Submit". The portal shows an Application Reference Number — screenshot it immediately and save it for tracking.' },
    ],
  },
  "ayushman-bharat": {
    intro: "Follow these steps on pmjay.gov.in to check eligibility and get your Ayushman Bharat card issued.",
    steps: [
      { emoji: "🔍", title: "Check Eligibility First", detail: 'Visit pmjay.gov.in → click "Am I Eligible?" → enter your mobile number and OTP to log in.' },
      { emoji: "📋", title: "Search Your Name", detail: "Search by Name + District + Village or by Ration Card number. If your family appears, you are already included in SECC data." },
      { emoji: "🏥", title: "Visit Empanelled Hospital", detail: "Take your Aadhaar card to any Ayushman Bharat empanelled hospital (the green AB-PMJAY logo). The hospital's Ayushman Mitra desk will verify your eligibility online." },
      { emoji: "🪪", title: "e-KYC at Hospital", detail: "The Ayushman Mitra scans your Aadhaar for biometric verification (fingerprint). This completes your KYC in minutes." },
      { emoji: "💳", title: "Get Golden Card", detail: "After successful KYC, a Golden Card (Ayushman card) is printed immediately. It is free of cost. Keep it safe — present it at any empanelled hospital for cashless treatment." },
      { emoji: "📲", title: "Download e-Card", detail: "You can also download your e-card from beneficiary.nha.gov.in → Login with Aadhaar OTP → Download Card." },
    ],
  },
  "pmay": {
    intro: "Follow these steps on pmaymis.gov.in to apply for Pradhan Mantri Awas Yojana (Urban) housing subsidy.",
    steps: [
      { emoji: "🔗", title: "Visit PMAY-U Portal", detail: 'Go to pmaymis.gov.in → click "Citizen Assessment" → select "For Slum Dwellers" or "Benefit Under Other 3 Components" based on your income group.' },
      { emoji: "📱", title: "Aadhaar Verification", detail: "Enter your 12-digit Aadhaar number and click Check. Your details are auto-fetched from UIDAI — verify they are correct." },
      { emoji: "👤", title: "Personal Details", detail: "Fill Father/Spouse name, Date of Birth, mobile number, current address, and alternate ID (PAN/Driving Licence/Voter ID)." },
      { emoji: "🏠", title: "Present Housing Status", detail: "Declare your present housing condition: Kutcha/Pucca/Semi-Pucca. Select whether you are applying under EWS/LIG/MIG-I/MIG-II category." },
      { emoji: "💰", title: "Bank & Income Details", detail: "Enter annual household income, bank account number, and IFSC code. The subsidy (up to ₹2.67 lakh) is directly transferred to your bank after loan disbursement." },
      { emoji: "🔢", title: "Loan Details", detail: "Enter your home loan amount and bank name. If you don't have a loan yet, select 'Applied to bank' and enter the bank's name." },
      { emoji: "📎", title: "Upload Documents", detail: "Upload: Aadhaar, income certificate, property documents/allotment letter, bank passbook copy. Each file must be PDF/JPG, max 2 MB." },
      { emoji: "✅", title: "Submit & Note ID", detail: "Click Save → Print the filled form for your records. Note the Application ID — use it to track status on the same portal." },
    ],
  },
  "nsp": {
    intro: "Follow these steps on scholarships.gov.in (National Scholarship Portal) to apply for your scholarship.",
    steps: [
      { emoji: "🔗", title: "Register on NSP", detail: 'Go to scholarships.gov.in → click "New Registration". Accept the guidelines and click "Continue".' },
      { emoji: "📱", title: "Create Account", detail: "Enter your state, scheme type, and academic details. Provide mobile number for OTP verification. Create a strong password — you will need this to login later." },
      { emoji: "🎓", title: "Select Your Scheme", detail: "After login, click 'Application Form'. Select the correct scheme: Pre-Matric, Post-Matric, or Merit-cum-Means based on your education level." },
      { emoji: "👤", title: "Personal & Academic Details", detail: "Fill: Name (as in mark sheet), Date of Birth, gender, religion, category, Aadhaar, mobile, email, current class/course, institute name, roll number, and percentage." },
      { emoji: "🏦", title: "Bank Details", detail: "Enter your bank account number and IFSC. The account must be in your name (not parent's). Scholarship amount is credited directly here." },
      { emoji: "📄", title: "Upload Documents", detail: "Upload: passport photo (max 200KB, JPG), latest mark sheet, income certificate, caste certificate (if applicable), bank passbook first page, and institute verification form signed by principal." },
      { emoji: "🏫", title: "Institute Verification", detail: "After submitting online, the form goes to your Institute Nodal Officer (INO). Remind your school/college admin to verify and forward it within the deadline." },
      { emoji: "✅", title: "Track Application", detail: "After submission, note the Application ID. Track status on NSP portal under 'Check Your Status' using Application ID and date of birth." },
    ],
  },
  "pm-mudra": {
    intro: "Follow these steps on udyamimitra.in (MUDRA portal) to apply for a Pradhan Mantri MUDRA Yojana loan.",
    steps: [
      { emoji: "🔗", title: "Visit Udyami Mitra", detail: 'Go to udyamimitra.in → click "Apply for MUDRA Loan" or go directly to a participating bank (SBI, Bank of Baroda, Union Bank, or any NBFC).' },
      { emoji: "👤", title: "Register as Applicant", detail: "Click 'Register'. Choose 'Individual' or 'Enterprise'. Enter mobile number, OTP, name, and email to create your profile." },
      { emoji: "🏭", title: "Business Details", detail: "Fill: Business name, type (Shishu/Kishore/Tarun based on loan amount), nature of activity (trading/service/manufacturing), date of incorporation, and GST number if applicable." },
      { emoji: "💰", title: "Loan Amount", detail: "Select loan amount: Shishu (up to ₹50,000), Kishore (₹50,001–5 lakh), Tarun (₹5–10 lakh). Enter purpose of loan and repayment tenure (12–60 months)." },
      { emoji: "📊", title: "Financial Details", detail: "Upload last 2 years' ITR or income proof, bank statements for 6 months, and a simple business plan (1-2 pages describing your business and how loan will be used)." },
      { emoji: "🏦", title: "Choose Lender", detail: "Select your preferred bank/NBFC from the list. The portal matches you with suitable lenders. You can also directly approach any branch with the MUDRA Shishu/Kishore/Tarun form." },
      { emoji: "📋", title: "Complete Bank KYC", detail: "Visit the selected bank branch with original documents for in-person KYC: Aadhaar, PAN, business proof, address proof, and 2 passport photos." },
      { emoji: "✅", title: "Loan Sanction", detail: "The bank reviews your application within 7–30 days. On approval, you receive a MUDRA RuPay card (for Shishu) or direct credit to your business account." },
    ],
  },
  "bbbp": {
    intro: "Follow these steps to register under Beti Bachao Beti Padhao and access related schemes for the girl child.",
    steps: [
      { emoji: "🔗", title: "Visit WCD Portal", detail: "Go to wcd.nic.in → navigate to 'Schemes' → 'Beti Bachao Beti Padhao'. Alternatively, visit your district Women & Child Development office directly." },
      { emoji: "🏦", title: "Open Sukanya Samriddhi Account", detail: "Visit any post office or authorised bank (SBI, Bank of India, Canara Bank, etc.). Ask for SSY (Sukanya Samriddhi Yojana) account opening form — part of BBBP." },
      { emoji: "📋", title: "Fill SSY Form", detail: "Fill the account opening form: girl child's name, date of birth, guardian's name, Aadhaar of guardian and child, and address. Minimum deposit: ₹250." },
      { emoji: "📎", title: "Submit Documents", detail: "Submit: girl child's birth certificate, guardian's Aadhaar, guardian's address proof, and 2 passport photos of the girl child at the bank/post office counter." },
      { emoji: "💰", title: "Initial Deposit", detail: "Pay the initial deposit (min ₹250, max ₹1.5 lakh/year). You receive a passbook. The account earns 8.2% interest p.a. (tax-free). Maturity is 21 years after opening." },
      { emoji: "📲", title: "Register for Awareness Programmes", detail: "Visit your Anganwadi centre or district ICDS office to register for BBBP awareness programmes, free health check-ups, and girl child immunisation camps in your area." },
      { emoji: "✅", title: "Track Account", detail: "Update the passbook annually at the branch. After 15 years, no further deposits are needed. Amount is withdrawable at maturity (age 21) or 50% for higher education at age 18." },
    ],
  },
};

// Fallback steps for unknown scheme IDs
const DEFAULT_PORTAL_STEPS = {
  intro: "Follow these general steps to apply on the official government portal.",
  steps: [
    { emoji: "🔗", title: "Visit the Official Portal", detail: "Open the official portal URL shown below. Do not use third-party websites — only the official .gov.in domain is safe." },
    { emoji: "📱", title: "Register / Login", detail: "Click 'New Registration' if first time. Use your mobile number for OTP-based login. Save your username and password securely." },
    { emoji: "📝", title: "Fill Application Form", detail: "Use the Form Field Guide (previous step) to fill each field accurately. Cross-check every detail against your original documents." },
    { emoji: "📎", title: "Upload Documents", detail: "Upload all required documents in PDF or JPG format. Each file must be under 2 MB. Scan clearly — blurry uploads will be rejected." },
    { emoji: "🔍", title: "Review Before Submit", detail: "Click 'Preview' or 'Review' to see your filled form. Read every field one more time before submitting." },
    { emoji: "✅", title: "Submit & Save Reference", detail: "Click Submit. Note the Application/Reference Number and take a screenshot of the confirmation page." },
  ],
};

// ─── Step 0: Document Verification ───────────────────────────────────────────
type DocStatus = "verified" | "pending" | "needs-action" | "missing";

function StepDocuments({ scheme, onNext }: { scheme: Scheme; onNext: () => void }) {
  const { t } = useLang();
  // Match scheme's required doc strings against uploaded documents in the app
  const docStatuses = scheme.documents.map((required) => {
    const keywords = required.toLowerCase().split(/[\s/,]+/).filter((w) => w.length > 3);
    const match = allDocs.find((uploaded) => {
      const name = uploaded.name.toLowerCase();
      return keywords.some((kw) => name.includes(kw));
    });
    return {
      required,
      status: (match ? match.status : "missing") as DocStatus,
      doc: match ?? null,
    };
  });

  const verified = docStatuses.filter((d) => d.status === "verified").length;
  const missing  = docStatuses.filter((d) => d.status === "missing").length;
  const pending  = docStatuses.filter((d) => d.status === "pending" || d.status === "needs-action").length;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={cn(
        "p-4 rounded-2xl border",
        missing > 0
          ? "bg-red-500/10 border-red-500/25"
          : "bg-emerald-500/10 border-emerald-500/25"
      )}>
        <p className="text-sm font-semibold text-white mb-1">
          {missing > 0 ? `⚠️ ${t("missingDocumentsDetected")}` : `✅ ${t("docsVerified")}`}
        </p>
        <p className="text-xs text-slate-400 mb-3">
          {t("docStatusCheck")} — <strong className="text-white">{scheme.title}</strong>
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle size={12} /> {verified} Verified
          </span>
          {pending > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Clock size={12} /> {pending} Under Review
            </span>
          )}
          {missing > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <XCircle size={12} /> {missing} Missing
            </span>
          )}
        </div>
      </div>

      {/* Per-document status rows */}
      <div className="space-y-2.5">
        {docStatuses.map(({ required, status, doc }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border",
              status === "verified"
                ? "bg-emerald-500/10 border-emerald-500/25"
                : status === "pending"
                ? "bg-yellow-500/10 border-yellow-500/20"
                : status === "needs-action"
                ? "bg-orange-500/10 border-orange-500/20"
                : "bg-red-500/10 border-red-500/20"
            )}
          >
            {/* Status icon */}
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
              status === "verified"     ? "bg-emerald-500/20 text-emerald-400"
              : status === "pending"   ? "bg-yellow-500/20 text-yellow-400"
              : status === "needs-action" ? "bg-orange-500/20 text-orange-400"
              : "bg-red-500/20 text-red-400"
            )}>
              {status === "verified"      ? <CheckCircle size={18} />
               : status === "pending"    ? <Clock size={18} />
               : status === "needs-action" ? <AlertCircle size={18} />
               : <XCircle size={18} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{required}</p>
              {doc ? (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {doc.name} &middot; {doc.uploadedAt}
                </p>
              ) : (
                <p className="text-[11px] text-red-400 mt-0.5">{t("notUploadedMsg")}</p>
              )}
            </div>

            {/* Badge / action */}
            {status === "verified" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                {t("verified")} ✓
              </span>
            )}
            {status === "pending" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 flex-shrink-0">
                {t("underReview")}
              </span>
            )}
            {status === "needs-action" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 flex-shrink-0">
                {t("actionNeeded")}
              </span>
            )}
            {status === "missing" && (
              <Link
                href="/documents"
                className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                <Upload size={11} /> Upload
              </Link>
            )}
          </motion.div>
        ))}
      </div>

      {/* DigiLocker tip */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
        <span className="text-base mt-0.5">💡</span>
        <span>
          Connect <strong>DigiLocker</strong> in Settings to auto-fetch Aadhaar, PAN & government certificates — no manual uploads needed.
        </span>
      </div>

      {/* CTA */}
      {missing > 0 ? (
        <div className="space-y-2">
          <Link
            href="/documents"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25"
          >
            <Upload size={16} /> {t("goUploadDocs")}
          </Link>
          <button
            onClick={onNext}
            className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors text-center"
          >
            {t("skipProceedAnyway")} →
          </button>
        </div>
      ) : (
        <motion.button
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25"
        >
          {t("docsReadyContinue")}
          <ChevronRight size={16} />
        </motion.button>
      )}
    </div>
  );
}

// ─── Step 1: Form Field Guide ─────────────────────────────────────────────────
function StepGuide({ scheme, onNext }: { scheme: Scheme; onNext: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(i);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/25">
        <p className="text-sm font-semibold text-white mb-1">
          📋 What you&apos;ll see on the {scheme.title} portal
        </p>
        <p className="text-xs text-slate-400">
          Each field below matches a field on the real government form. Follow the hints to fill it correctly.
        </p>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-hide">
        {scheme.formFields.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-surface-2 border border-navy-light/30 hover:border-blue-500/25 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-white">{f.field}</p>
              </div>
              {f.source && (
                <span className="text-[10px] text-blue-400 bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 rounded-full flex-shrink-0">
                  From: {f.source}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed pl-7">{f.hint}</p>
            <div className="flex items-center gap-2 pl-7">
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex-1">
                e.g. {f.example}
              </span>
              <button
                onClick={() => copy(f.example, i)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 hover:bg-navy-light/50 text-slate-400 hover:text-white border border-navy-light/40 transition-colors text-[10px]"
              >
                {copied === i ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copied === i ? "Copied" : "Copy"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={onNext}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25"
      >
        {t("readyTakeToPortal")} <ChevronRight size={16} />
      </motion.button>
    </div>
  );
}

// ─── Step 2: Portal with Detailed Guidance ────────────────────────────────────
function StepPortal({ scheme, onNext }: { scheme: Scheme; onNext: () => void }) {
  const { t } = useLang();
  const [opened, setOpened] = useState(false);
  const guide = PORTAL_STEPS[scheme.id] ?? DEFAULT_PORTAL_STEPS;

  const openPortal = () => {
    window.open(scheme.portalUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
    toast.success("Portal opened in a new tab — follow the steps below while filling the form.");
  };

  return (
    <div className="space-y-5">
      {/* Portal button card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <ExternalLink size={26} className="text-emerald-400" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">{t("officialGovPortal")}</h3>
        <p className="text-xs text-slate-400 mb-3">{guide.intro}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy/50 border border-navy-light/40 text-xs text-slate-400 font-mono mb-4 break-all">
          🔒 {scheme.portalUrl}
        </div>

        <motion.button
          onClick={openPortal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30"
        >
          <ExternalLink size={18} />
          Open {scheme.title} Portal →
        </motion.button>
      </div>

      {/* Detailed step-by-step guide */}
      <div>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-4 h-0.5 bg-blue-500/50 rounded" />
          {t("stepByStepGuide")}
          <span className="flex-1 h-0.5 bg-blue-500/50 rounded" />
        </p>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
          {guide.steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex gap-3 p-3.5 rounded-xl bg-surface-2 border border-navy-light/30 hover:border-blue-500/20 transition-colors"
            >
              {/* Step number + emoji */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                  {i + 1}
                </div>
                {i < guide.steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-navy-light/50 rounded min-h-[12px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-sm font-semibold text-white mb-1">
                  {s.emoji} {s.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{s.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Important tips */}
      <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300 space-y-1.5">
        <p className="font-semibold text-yellow-200">⚠️ {t("importantTips")}</p>
        <p>• Use only <strong>official .gov.in</strong> portal — never pay anyone to apply on your behalf.</p>
        <p>• All uploads must be <strong>clear scans</strong> (not blurry phone photos) in PDF or JPG format.</p>
        <p>• Screenshot your <strong>Application Reference Number</strong> — you need it for tracking.</p>
      </div>

      {opened ? (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25"
        >
          <CheckCircle size={16} /> {t("submittedFormBtn")} →
        </motion.button>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          Open the portal above, then the confirmation button will appear here.
        </p>
      )}
    </div>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────
function StepDone({ scheme }: { scheme: Scheme }) {
  const { t } = useLang();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-6 space-y-5"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center"
      >
        <Sparkles size={36} className="text-emerald-400" />
      </motion.div>

      <div>
        <h3 className="text-2xl font-bold text-white">{t("wellDone")} 🎉</h3>
        <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
          You've submitted your application on the official{" "}
          <span className="text-white font-medium">{scheme.title}</span> portal.
        </p>
      </div>

      <div className="w-full p-4 bg-surface-2 border border-navy-light/30 rounded-xl text-left space-y-3">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{t("nextSteps")}</p>
        {[
          { icon: "📲", text: "Save your application reference number from the portal for future tracking" },
          { icon: "🕐", text: "Expected processing time: 15–30 working days" },
          { icon: "🔔", text: "Enable notifications in this app to get status alerts" },
          { icon: "🏦", text: "Benefit will be transferred directly to the bank account you provided" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3 text-xs text-slate-400">
            <span>{icon}</span>
            {text}
          </div>
        ))}
      </div>

      <button
        onClick={() => { window.location.href = scheme.portalUrl; }}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5"
      >
        {t("openPortalBtn")} <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function ApplicationWizard({ scheme }: { scheme: Scheme }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8">
        {STEP_KEYS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <motion.div
                  animate={active ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                    done
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                      : active
                      ? "bg-blue-500/20 border-blue-400 text-blue-400"
                      : "bg-surface-2 border-navy-light/40 text-slate-500"
                  )}
                >
                  {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                </motion.div>
                <span
                  className={cn(
                    "text-[9px] font-medium hidden sm:block text-center max-w-[64px] leading-tight",
                    active ? "text-blue-400" : done ? "text-emerald-400" : "text-slate-500"
                  )}
                >
                  {t(s.labelKey)}
                </span>
              </div>
              {i < STEP_KEYS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 rounded transition-colors",
                    done ? "bg-emerald-400/50" : "bg-navy-light/50"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{t(STEP_KEYS[step].labelKey)}</h2>
          <span className="text-xs text-slate-400">
            {t("step")} {step + 1} {t("of")} {STEP_KEYS.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
            animate={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && <StepDocuments scheme={scheme} onNext={next} />}
          {step === 1 && <StepGuide scheme={scheme} onNext={next} />}
          {step === 2 && <StepPortal scheme={scheme} onNext={next} />}
          {step === 3 && <StepDone scheme={scheme} />}
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {step > 0 && step < 3 && (
        <button
          onClick={prev}
          className="mt-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={15} /> {t("back")}
        </button>
      )}
    </div>
  );
}
