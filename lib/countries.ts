import countriesData from "./countries.json";

export interface Country {
  name: string;
  code: string;
  flag: string;
}

/** Generate flag emoji from ISO 3166-1 alpha-2 code */
function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export const COUNTRIES: Country[] = (countriesData as { name: string; code: string }[]).map(
  (c) => ({
    name: c.name,
    code: c.code,
    flag: getFlagEmoji(c.code),
  })
);
