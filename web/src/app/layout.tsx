import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Merik — Workforce Suite",
  description: "Employee management, attendance, leave, payroll and daily task tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Browser extensions (Grammarly, etc.) inject attributes into <body>
          before React hydrates, which triggers a spurious hydration-mismatch
          warning. Suppressing it here silences that one element's attribute
          diff only — real hydration bugs in children still surface. */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
