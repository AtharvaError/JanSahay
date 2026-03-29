"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, User } from "lucide-react";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";

const states = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];
const occupations = ["Farmer","Student","Daily Wage Worker","Small Business Owner","Government Employee","Private Employee","Unemployed","Other"];
const categories = ["General","SC","ST","OBC","Minority"];
const incomes = ["Below 1 lakh","1–3 lakh","3–6 lakh","6–10 lakh","Above 10 lakh"];

export default function ProfileSettings() {
  const { t } = useLang();
  const [form, setForm] = useState({
    name: "Ramesh Kumar Sharma",
    age: "42",
    gender: "Male",
    state: "Uttar Pradesh",
    district: "Varanasi",
    mobile: "9876543210",
    email: "",
    occupation: "Farmer",
    income: "1–3 lakh",
    category: "OBC",
    aadhaar: "XXXX XXXX 3456",
  });
  const [saving, setSaving] = useState(false);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    toast.success("Profile updated successfully");
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/25">
          {form.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-white">{form.name}</h3>
          <p className="text-sm text-slate-400">{form.occupation} · {form.state}</p>
          <p className="text-xs text-blue-400 mt-0.5">Aadhaar: {form.aadhaar}</p>
        </div>
      </div>

      {/* Form grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { key: "name", label: t("fullName"), type: "text" },
          { key: "age", label: t("age"), type: "number" },
          { key: "mobile", label: t("mobileNumber"), type: "tel" },
          { key: "email", label: "Email (optional)", type: "email" },
          { key: "district", label: t("district"), type: "text" },
          { key: "aadhaar", label: "Aadhaar (last 4 visible)", type: "text" },
        ].map(({ key, label, type }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">{label}</label>
            <input
              type={type}
              value={(form as any)[key]}
              onChange={e => update(key, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-blue-500/50 text-slate-200 text-sm outline-none transition-colors"
            />
          </div>
        ))}

        {[
          { key: "gender", label: t("gender"), options: [t("male"), t("female"), t("other")] },
          { key: "state", label: t("state"), options: states },
          { key: "occupation", label: t("occupation"), options: occupations },
          { key: "income", label: t("income"), options: incomes },
          { key: "category", label: t("category"), options: categories },
        ].map(({ key, label, options }) => (
          <div key={key} className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">{label}</label>
            <select
              value={(form as any)[key]}
              onChange={e => update(key, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-blue-500/50 text-slate-200 text-sm outline-none transition-colors"
            >
              {options.map(o => <option key={o} value={o} className="bg-[#111827]">{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
      >
        {saving ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
        ) : (
          <><Save size={16} /> {t("submit")} Changes</>
        )}
      </button>
    </div>
  );
}
