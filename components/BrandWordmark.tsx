import Link from "next/link";

export default function BrandWordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636 5.636 18.364" />
        </svg>
      </div>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">bluprint</span>
    </Link>
  );
}
