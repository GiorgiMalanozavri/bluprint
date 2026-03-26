import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AISidebar from "@/components/AISidebar";
import { Providers } from "./providers";
import { createClient } from "@/utils/supabase/server";
import { Inter, DM_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
  variable: "--font-inter",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400","500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "bluprint - Career planning for university students",
  description: "Personalised semester-by-semester roadmaps, a weekly planner, and AI-powered tools built for international students.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          <Navigation initialUser={user} />
          {children}
          <Footer />
          <AISidebar />
        </Providers>
      </body>
    </html>
  );
}
