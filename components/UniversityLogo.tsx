import Image from "next/image";

interface UniversityLogoProps {
  name: string;
  abbreviation: string;
  color: string;
  logoUrl?: string;
}

export default function UniversityLogo({ name, abbreviation, color, logoUrl }: UniversityLogoProps) {
  return (
    <div
      className="flex h-12 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-white"
      title={name}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={96}
          height={48}
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <div
          className="text-sm font-semibold"
          style={{ color }}
        >
          {abbreviation}
        </div>
      )}
    </div>
  );
}
