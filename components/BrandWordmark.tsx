import Link from "next/link";

export default function BrandWordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex h-8 w-10 items-center justify-center drop-shadow-sm">
        <svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Main unrolled paper */}
          <path d="M25 20 Q50 25 85 15 L95 55 Q60 65 30 65 Z" fill="#5895c4" stroke="#1c3a63" strokeWidth="4" strokeLinejoin="round"/>
          
          {/* Left rolled part */}
          <path d="M25 20 Q20 15 15 20 L15 50 Q15 65 25 65 Q35 65 35 50 L35 20 Z" fill="#4678a1" stroke="#1c3a63" strokeWidth="4" strokeLinejoin="round"/>
          
          {/* Inner curl of the roll */}
          <path d="M25 45 Q15 45 15 55 Q15 65 25 65 Q30 65 30 55" fill="#305980" stroke="#1c3a63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25 50 Q20 50 20 55" fill="none" stroke="#1c3a63" strokeWidth="2.5" strokeLinecap="round"/>

          {/* White blueprint markings */}
          <g stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
            {/* Compass rose */}
            <path d="M40 35 L45 25 L50 35 L60 40 L50 45 L45 55 L40 45 L30 40 Z" />
            <line x1="45" y1="20" x2="45" y2="60" />
            <line x1="25" y1="40" x2="65" y2="40" />
            
            {/* Geometric shapes and lines */}
            <rect x="60" y="30" width="15" height="15" />
            <circle cx="67.5" cy="37.5" r="4" />
            <line x1="55" y1="25" x2="80" y2="22" strokeDasharray="2 2" />
            <path d="M75 50 L85 50 M80 45 L80 55" />
            <path d="M40 55 L70 50" />
            <circle cx="80" cy="35" r="5" />
            <line x1="80" y1="25" x2="80" y2="45" />
          </g>
        </svg>
      </div>
      <span className="text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)] lowercase" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>bluprint</span>
    </Link>
  );
}
