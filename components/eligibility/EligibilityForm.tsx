"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "Personal Info",
    fields: [
      { id: "name", label: "Full Name", type: "text", placeholder: "Enter your full name" },
      { id: "age", label: "Age", type: "number", placeholder: "Your age" },
      { id: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { id: "state", label: "State", type: "select", options: ["Maharashtra", "Uttar Pradesh", "Tamil Nadu", "Bihar", "Rajasthan", "West Bengal", "Gujarat", "Other"] },
    ],
  },
  {
    id: 2,
    title: "Economic Status",
    fields: [
      { id: "occupation", label: "Occupation", type: "select", options: ["Farmer", "Student", "Daily Wage Worker", "Small Business Owner", "Government Employee", "Private Employee", "Unemployed", "Other"] },
      { id: "income", label: "Annual Household Income (₹)", type: "select", options: ["Below 1 lakh", "1–3 lakh", "3–6 lakh", "6–10 lakh", "Above 10 lakh"] },
      { id: "bpl", label: "BPL Card Holder?", type: "toggle" },
    ],
  },
  {
    id: 3,
    title: "Category & Family",
    fields: [
      { id: "category", label: "Social Category", type: "select", options: ["General", "SC", "ST", "OBC", "Minority"] },
      { id: "landholding", label: "Land Holding (Hectares)", type: "select", options: ["None", "Less than 1", "1–2", "2–5", "More than 5"] },
      { id: "children", label: "Number of Children", type: "number", placeholder: "e.g. 2" },
      { id: "girl_child", label: "Do you have a girl child?", type: "toggle" },
    ],
  },
  {
    id: 4,
    title: "Health & Housing",
    fields: [
      { id: "house_type", label: "Type of House", type: "select", options: ["No house / Kutcha", "Pucca", "Semi-pucca", "Rented"] },
      { id: "disability", label: "Person with Disability?", type: "toggle" },
      { id: "health_insurance", label: "Existing Health Insurance?", type: "toggle" },
    ],
  },
];

export default function EligibilityForm({ onComplete }: { onComplete?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [done, setDone] = useState(false);

  const step = steps[current];
  const isLast = current === steps.length - 1;

  const update = (id: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const next = () => {
    if (isLast) { setDone(true); onComplete?.(); }
    else setCurrent(c => c + 1);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 glow-emerald">
          <Check size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Profile Complete!</h3>
        <p className="text-slate-400 mb-6">Analysing 500+ schemes against your profile…</p>
        <div className="w-48 h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Step {current + 1} of {steps.length}: {step.title}</span>
          <span>{Math.round(((current + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                i < current ? "bg-emerald-500" : i === current ? "bg-blue-500" : "bg-surface-2"
              )}
            />
          ))}
        </div>
      </div>

      {/* Fields */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <h3 className="text-base font-semibold text-white">{step.title}</h3>
          {step.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={field.id} className="block text-sm font-medium text-slate-300">
                {field.label}
              </label>
              {field.type === "text" || field.type === "number" ? (
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => update(field.id, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-blue-500/50 text-slate-200 text-sm outline-none transition-colors placeholder-slate-500"
                />
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => update(field.id, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-blue-500/50 text-slate-200 text-sm outline-none transition-colors"
                >
                  <option value="" className="text-slate-500">Select…</option>
                  {field.options?.map(o => (
                    <option key={o} value={o} className="bg-surface-2">{o}</option>
                  ))}
                </select>
              ) : field.type === "toggle" ? (
                <button
                  type="button"
                  onClick={() => update(field.id, !formData[field.id])}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all",
                    formData[field.id]
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                      : "border-navy-light/40 bg-surface-2 text-slate-400"
                  )}
                >
                  <div className={cn("w-8 h-4 rounded-full transition-colors relative", formData[field.id] ? "bg-emerald-500" : "bg-slate-600")}>
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", formData[field.id] ? "left-4.5" : "left-0.5")} />
                  </div>
                  {formData[field.id] ? "Yes" : "No"}
                </button>
              ) : null}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {current > 0 && (
          <button
            onClick={() => setCurrent(c => c - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass border border-navy-light/40 text-slate-300 text-sm hover:border-blue-500/40 hover:text-white transition-all"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          onClick={next}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          {isLast ? "Find Schemes" : "Next"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
