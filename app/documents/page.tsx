"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, X, Plus } from "lucide-react";
import { documents as initialDocs } from "@/lib/data/schemes";
import type { Document } from "@/lib/data/schemes";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";

const statusConfig = {
  verified: { label: "Verified", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25" },
  pending: { label: "Pending Review", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/25" },
  "needs-action": { label: "Needs Action", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25" },
  uploading: { label: "Uploading…", icon: Upload, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/25" },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const newDoc: Document = {
        id: `d-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type.includes("pdf") ? "PDF" : "Image",
        size: `${(file.size / 1024).toFixed(0)} KB`,
        status: "uploading",
        uploadedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      };
      setDocs(prev => [newDoc, ...prev]);

      setTimeout(() => {
        setDocs(prev => prev.map(d => d.id === newDoc.id ? { ...d, status: "pending" } : d));
        toast.success(`${file.name} uploaded successfully`);
      }, 2000);
    });
  };

  const removeDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    toast("Document removed", { icon: "🗑️" });
  };

  const stats = {
    total: docs.length,
    verified: docs.filter(d => d.status === "verified").length,
    pending: docs.filter(d => d.status === "pending").length,
    action: docs.filter(d => d.status === "needs-action").length,
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("myDocuments")}</h1>
        <p className="text-slate-400 mt-1">Upload and manage documents required for scheme applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Verified", value: stats.verified, color: "text-emerald-400" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { label: "Need Action", value: stats.action, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-navy-light/30 text-center">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        animate={dragging ? { scale: 1.02 } : { scale: 1 }}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all mb-8 cursor-pointer",
          dragging
            ? "border-blue-400 bg-blue-500/10"
            : "border-navy-light/50 hover:border-blue-500/50 hover:bg-blue-500/5"
        )}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        <AnimatePresence mode="wait">
          {dragging ? (
            <motion.div key="dragging" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Upload size={40} className="text-blue-400 mx-auto mb-3" />
              <p className="text-blue-400 font-semibold">Drop files here</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-blue-400" />
              </div>
              <p className="text-white font-semibold mb-1">{t("dropFiles")}</p>
              <p className="text-sm text-slate-400 mb-3">{t("orBrowse")}</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {["PDF", "JPG", "PNG"].map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 rounded bg-surface-2 text-xs text-slate-400 border border-navy-light/30">{fmt}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Document list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">{t("yourDocuments")} ({docs.length})</h2>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
          >
            <Plus size={16} /> {t("addDocument")}
          </button>
        </div>

        {docs.map((doc, i) => {
          const cfg = statusConfig[doc.status];
          const StatusIcon = cfg.icon;
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 glass rounded-xl p-4 border border-navy-light/30 hover:border-blue-500/30 transition-all group"
            >
              {/* File icon */}
              <div className="w-10 h-12 rounded-lg bg-red-500/15 border border-red-500/20 flex flex-col items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-red-400" />
                <span className="text-[8px] text-red-400 font-bold mt-0.5">{doc.type}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{doc.size} · Uploaded {doc.uploadedAt}</p>
                {doc.status === "uploading" && (
                  <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden w-full">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: ["0%", "90%"] }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className={cn("flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium", cfg.bg, cfg.border, cfg.color)}>
                <StatusIcon size={12} />
                {cfg.label}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeDoc(doc.id)}
                aria-label={`Remove ${doc.name}`}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}

        {docs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <FileText size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="font-medium text-white">No documents uploaded</p>
            <p className="text-sm mt-1">Upload your first document above</p>
          </div>
        )}
      </div>
    </div>
  );
}
