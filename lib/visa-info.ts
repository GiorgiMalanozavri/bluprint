/**
 * US visa information for international students.
 * Country-specific notes for common source countries.
 */

export const US_VISA_BASICS = {
  f1: {
    title: "F-1 Student Visa",
    desc: "Most common for full-time US university students. Allows CPT (Curricular Practical Training) during studies and OPT (Optional Practical Training) after graduation.",
  },
  cpt: {
    title: "CPT (Curricular Practical Training)",
    desc: "Work authorization during your degree. Must be related to your major. Can be part-time (20h/week) or full-time during breaks.",
  },
  opt: {
    title: "OPT (Optional Practical Training)",
    desc: "Up to 12 months of work authorization after graduation. STEM majors can apply for 24-month STEM OPT extension.",
  },
  h1b: {
    title: "H-1B (Post-OPT)",
    desc: "Employer-sponsored work visa. Companies must prove they cannot find a US worker. Sponsorship varies by company and industry.",
  },
};

/** Country-specific US visa notes (sponsorship trends, consulate tips, etc.) */
export const COUNTRY_VISA_NOTES: Record<string, string> = {
  India: "India is the top source of F-1 students and H-1B recipients. Expect longer visa wait times at US consulates. STEM OPT is especially valuable. Many tech companies actively sponsor H-1B for Indian nationals.",
  China: "F-1 and OPT are common paths. Some tech restrictions may apply. STEM OPT extension widely used. H-1B sponsorship varies by industry.",
  "South Korea": "Strong F-1 presence. E-2 treaty investor visa is an alternative for entrepreneurs. Many Korean companies have US offices.",
  Brazil: "F-1 popular for graduate programs. J-1 also common for exchange. Growing tech sponsorship.",
  Vietnam: "Rising F-1 enrollment. Tech and engineering popular. Check visa wait times for appointments.",
  "United Kingdom": "Similar education system eases transition. F-1 or J-1 common. E-2 treaty option for certain business activities.",
  Canada: "Can use TN status for certain professions (no H-1B lottery). Many students still choose F-1 for flexibility.",
  Nigeria: "Large F-1 population. Focus on graduate programs. Sponsorship varies; tech and healthcare more common.",
  Mexico: "TN status available for qualified professions. F-1 remains popular for undergrad/grad.",
  Germany: "Strong academic reputation. F-1 and J-1 common. Many German companies sponsor H-1B for US roles.",
  France: "Similar to Germany. J-1 exchange popular. Tech and consulting sponsor H-1B.",
  Japan: "F-1 common. Many Japanese companies have US subsidiaries. Engineering and business popular.",
  Pakistan: "Significant F-1 enrollment. Check consulate processing times. STEM OPT valuable.",
  Bangladesh: "Growing F-1 numbers. Graduate programs common. Sponsorship varies by field.",
  Indonesia: "Increasing US enrollment. Engineering and business popular. Check visa appointment availability.",
  "Saudi Arabia": "Government scholarships support many students. F-1 and J-1 common. Return often expected post-graduation.",
  Iran: "F-1 students face additional restrictions. Consult an immigration attorney for current rules.",
  Colombia: "Growing F-1 population. Tech and business popular. J-1 also common.",
  Egypt: "F-1 and J-1 common. STEM and business popular. Government scholarship programs exist.",
  Turkey: "F-1 enrollment significant. Engineering and business popular. Check current consulate processing.",
  Thailand: "F-1 and J-1 common. Tourism and hospitality programs popular. Tech growing.",
  Taiwan: "Strong F-1 presence in STEM. H-1B sponsorship common in tech. E-2 treaty option for investors.",
  Russia: "F-1 and J-1 available. Additional restrictions may apply. Consult current State Dept. guidance.",
  Ukraine: "F-1 common. Special programs (e.g., TPS) may apply. Check latest USCIS announcements.",
  Philippines: "Large F-1 population. Nursing and healthcare popular. H-1B in healthcare sector.",
  Malaysia: "F-1 and J-1 common. Engineering and business popular.",
  "United Arab Emirates": "Many students from UAE study in US. F-1 common. Return often expected.",
  Kenya: "Growing F-1 enrollment. STEM and business popular.",
  Ghana: "F-1 common. Graduate programs and professional degrees popular.",
  Nepal: "Significant F-1 enrollment. Graduate programs common.",
  Morocco: "F-1 and J-1 common. Government programs support some students.",
  Australia: "Similar to UK/Canada. E-3 visa is an alternative for certain professions (no H-1B lottery).",
  "New Zealand": "F-1 and J-1 common. E-1/E-2 treaty options for trade/investment.",
  Israel: "F-1 common. E-2 treaty investor option. Tech industry connections strong.",
  Poland: "F-1 and J-1 common. EU students sometimes use different paths.",
  Spain: "F-1 and J-1 common. Business and arts popular.",
  Portugal: "Similar to Spain. Growing tech presence.",
  Greece: "F-1 and J-1 common. Graduate programs popular.",
  Italy: "F-1 common. Design, business, and engineering popular.",
  Netherlands: "F-1 and J-1 common. Many Dutch companies have US offices.",
  Sweden: "F-1 common. Tech and sustainability focused.",
  Norway: "F-1 and J-1 common. Oil/gas and tech industries.",
  Finland: "F-1 common. Tech (especially Nokia ecosystem) and design.",
  Denmark: "F-1 common. Clean tech and design popular.",
  Ireland: "F-1 common. E-3 not applicable; F-1/OPT/H-1B path typical.",
  "South Africa": "F-1 common. Graduate programs and professional degrees popular.",
  Ethiopia: "Growing F-1 enrollment. Graduate programs common.",
  Tanzania: "F-1 and J-1 common. Check visa processing times.",
  Uganda: "F-1 common. Graduate programs popular.",
};

export function getVisaInfoForCountry(countryName: string | null): {
  country: string | null;
  note: string | null;
  basics: typeof US_VISA_BASICS;
} {
  if (!countryName || !countryName.trim()) {
    return { country: null, note: null, basics: US_VISA_BASICS };
  }
  const note = COUNTRY_VISA_NOTES[countryName.trim()] ?? null;
  return {
    country: countryName.trim(),
    note: note || "Your country-specific guidance will improve as we add more data. In the meantime, the core F-1 → CPT → OPT → H-1B path applies to most international students.",
    basics: US_VISA_BASICS,
  };
}
