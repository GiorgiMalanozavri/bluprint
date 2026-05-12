import Link from "next/link";
import { Sword } from "lucide-react";

export default function BrandWordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] border-[2px] border-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.3)]">
        <Sword size={16} className="text-[#38bdf8]" strokeWidth={2.5} />
      </div>
      <span className="text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)] uppercase" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>Pathly</span>
    </Link>
  );
}
