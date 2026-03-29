"use client";

import { motion } from "framer-motion";
import { UserCheck, Search, FileUp, CheckCircle } from "lucide-react";

const steps = [
  { icon: UserCheck, step: "01", title: "Tell Us About Yourself", desc: "Share basic details — age, income, occupation, location. Takes under 2 minutes." },
  { icon: Search, step: "02", title: "AI Matches Schemes", desc: "Our AI scans 500+ schemes and ranks the best matches based on your profile." },
  { icon: FileUp, step: "03", title: "Upload Documents", desc: "Upload required documents digitally. We guide you on exactly what's needed." },
  { icon: CheckCircle, step: "04", title: "Apply & Track", desc: "Submit your application and track its status with real-time notifications." },
];

export default function HowItWorks() {
  return (
    <section className="px-4 py-20" style={{ background: "var(--section-fade)" }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-slate-400 text-lg">Four simple steps to access benefits you're entitled to</p>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map(({ icon: Icon, step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                    <Icon size={28} className="text-blue-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
