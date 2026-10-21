import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import ToastProvider from "@/components/providers/ToastProvider";
import GlobalAIGuide from "@/components/ui/GlobalAIGuide";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SavedSchemesProvider } from "@/contexts/SavedSchemesContext";
import { UserDataProvider } from "@/contexts/UserDataContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GovScheme AI – Find & Apply for Government Schemes",
  description: "AI-powered assistant to help Indian citizens discover, check eligibility, and apply for government welfare schemes in their language.",
  keywords: "government schemes, India, PM-KISAN, Ayushman Bharat, PMAY, eligibility checker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-[#060b04] text-[#edf2e8] antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <SavedSchemesProvider>
            <UserDataProvider>
            <ToastProvider />
            <div className="flex h-full">
              <Sidebar />
              <main className="flex-1 overflow-y-auto pb-20 md:pb-0" role="main">
                {children}
              </main>
            </div>
            <BottomNav />
            <GlobalAIGuide />
            </UserDataProvider>
            </SavedSchemesProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
