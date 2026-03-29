"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1e2a3a",
          color: "#e2e8f0",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "12px",
          fontSize: "14px",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "#1e2a3a" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#1e2a3a" },
        },
      }}
    />
  );
}
