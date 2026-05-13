import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Compass — Course planning for CWRU MAE",
  description:
    "Compass is the course companion for Case Western mechanical & aerospace engineering students. Real grade distributions, peer tips, and a personalized roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
