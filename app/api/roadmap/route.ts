import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { COURSES } from "@/lib/courses";
import type { GeneratedRoadmap, UserProfile } from "@/lib/types";

export const runtime = "nodejs";
// Cache personalized roadmaps for 30 min if the same payload is requested again
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Compass, an academic advisor specifically for Case Western Reserve University (CWRU) Mechanical & Aerospace Engineering (MAE) students.

You know CWRU. Reference the things that actually matter on campus:
- SAGES (Seminar Approach to General Education and Scholarship) requirements — first seminar, university seminars, departmental seminar, capstone.
- Co-op program (5-year co-op track is common in MAE — discuss timing options).
- Veale Institute for Entrepreneurship — for students with startup or product ambitions.
- Sears think[box] — the seven-floor maker space, central to MAE project work.
- EPICS @ CWRU (Engineering Projects in Community Service).
- Engineering societies: ASME, AIAA, SAE, FSAE.
- Office hours culture at CWRU and which professors run them well (Mathur, Cooperman, Lewandowski, Liu, etc).
- Career fair (CWRU Engineering & Tech Career Fair) in September and February.
- The Nord library and Kelvin Smith library for MAE study spots.

Talk like a senior mentor: concrete, direct, no fluff. Avoid jargon like "leverage" or "synergy". Write the way a smart 4th-year peer would talk to a 2nd-year.

OUTPUT FORMAT — you MUST respond with VALID JSON only, no prose before or after. Schema:

{
  "summary": "2-3 sentence overview of the student's strategic situation and the main bet for the next 12 months.",
  "semesters": [
    {
      "term": "Fall 2026",
      "year": "sophomore" | "junior" | "senior",
      "focus": "One-line mission for the semester (8-12 words).",
      "whyItMatters": "1-2 sentences. Concrete reason this matters for THIS student.",
      "recommendedCourses": ["EMAE 251", "MATH 224"],
      "milestones": [
        "2-4 concrete things to do this term, each 8-15 words"
      ]
    }
  ]
}

Generate 4 semesters of plan starting from the student's current term. Make every recommendation feel like it came from someone who actually knows CWRU MAE.`;

function buildUserMessage(profile: UserProfile): string {
  const completedCourses = profile.completedCourseIds
    .map((id) => COURSES.find((c) => c.id === id)?.code)
    .filter(Boolean)
    .join(", ") || "(none yet)";
  const currentCourses = profile.enrolledCourseIds
    .map((id) => COURSES.find((c) => c.id === id)?.code)
    .filter(Boolean)
    .join(", ") || "(none)";

  return [
    `Student profile:`,
    `- Name: ${profile.name}`,
    `- Year: ${profile.year}`,
    `- University: CWRU`,
    `- Major: Mechanical & Aerospace Engineering`,
    ``,
    `Coursework status:`,
    `- Completed: ${completedCourses}`,
    `- Currently taking: ${currentCourses}`,
    ``,
    `Goals (their words):`,
    profile.goals,
    ``,
    `Biggest concern (their words):`,
    profile.concerns,
    ``,
    `Generate the personalized roadmap. JSON only.`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const { profile } = (await req.json()) as { profile: UserProfile };
    if (!profile?.name || !profile?.year) {
      return NextResponse.json({ error: "Missing profile fields" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback: a deterministic stub so the app keeps working without a key
      return NextResponse.json({ roadmap: stubRoadmap(profile) });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(profile) }],
    });

    // Find the first text block
    const block = message.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text : "";
    const parsed = safeParseRoadmap(raw, profile);
    return NextResponse.json({ roadmap: parsed });
  } catch (err) {
    console.error("Roadmap generation failed:", err);
    const { profile } = await req.json().catch(() => ({ profile: null }));
    return NextResponse.json({ roadmap: stubRoadmap(profile) }, { status: 200 });
  }
}

function safeParseRoadmap(raw: string, profile: UserProfile): GeneratedRoadmap {
  // Find JSON in the response (model might wrap with ``` despite instructions)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return stubRoadmap(profile);
  try {
    const parsed = JSON.parse(match[0]);
    return {
      generatedAt: new Date().toISOString(),
      summary: String(parsed.summary || ""),
      semesters: Array.isArray(parsed.semesters)
        ? parsed.semesters.map((s: any) => ({
            term: String(s.term || ""),
            year: ["sophomore", "junior", "senior", "freshman"].includes(s.year) ? s.year : profile.year,
            focus: String(s.focus || ""),
            whyItMatters: String(s.whyItMatters || ""),
            recommendedCourses: Array.isArray(s.recommendedCourses)
              ? s.recommendedCourses.map(String).filter(Boolean)
              : [],
            milestones: Array.isArray(s.milestones)
              ? s.milestones.map(String).filter(Boolean)
              : [],
          }))
        : [],
    };
  } catch {
    return stubRoadmap(profile);
  }
}

function stubRoadmap(profile: UserProfile | null): GeneratedRoadmap {
  const year = profile?.year ?? "sophomore";
  const map: Record<string, GeneratedRoadmap["semesters"]> = {
    freshman: [
      {
        term: "Spring 2026",
        year: "freshman",
        focus: "Build a strong foundation and get into the maker community.",
        whyItMatters: "Year 1 is the cheapest time to set GPA and find your crew. Show up.",
        recommendedCourses: ["EMAE 160", "MATH 122", "PHYS 121"],
        milestones: [
          "Get through Think[box] orientation in the first 3 weeks.",
          "Join one engineering society — ASME or SAE.",
          "Visit office hours once a week for your hardest class.",
        ],
      },
    ],
    sophomore: [
      {
        term: "Fall 2026",
        year: "sophomore",
        focus: "Survive dynamics and start internship outreach.",
        whyItMatters: "Sophomore year is when CWRU MAE recruiting starts. Get a resume reviewed by mid-October.",
        recommendedCourses: ["EMAE 181", "MATH 224", "PHYS 122"],
        milestones: [
          "Form an EMAE 181 study group by week 3.",
          "Sign up for the September career fair — bring 10 resumes.",
          "Apply to 3 sophomore-friendly internship programs by Thanksgiving.",
        ],
      },
      {
        term: "Spring 2027",
        year: "sophomore",
        focus: "Lock down a summer internship or research role.",
        whyItMatters: "Sophomore summer experience is the single biggest predictor of senior offers.",
        recommendedCourses: ["EMAE 250", "EMAE 251", "EMAE 260"],
        milestones: [
          "Get into Think[box] for the SolidWorks lab work.",
          "Email two MAE faculty about summer research by January.",
          "Apply broadly — 10+ internships at sophomore-friendly companies.",
        ],
      },
    ],
    junior: [
      {
        term: "Fall 2027",
        year: "junior",
        focus: "Specialize and start targeting top tier roles.",
        whyItMatters: "Junior year recruiting maps almost 1:1 to senior offers. Aim higher than last year.",
        recommendedCourses: ["EMAE 350", "EMAE 311", "EMAE 376"],
        milestones: [
          "Do practice problem sets weekly for EMAE 350 — don't fall behind.",
          "Apply to top-tier internships (Lockheed, Boeing, Tesla, SpaceX) by November.",
          "Reach out to a CWRU alum at a target company.",
        ],
      },
      {
        term: "Spring 2028",
        year: "junior",
        focus: "Convert leads into a summer offer and pick a capstone direction.",
        whyItMatters: "Most return offers come from the junior summer. Lock it in now.",
        recommendedCourses: ["EMAE 351", "EMAE 354", "EMAE 372"],
        milestones: [
          "Follow up on every internship interview within 48 hours.",
          "Talk to senior design advisors about capstone topics that match your goal.",
          "Make sure your LinkedIn shows the junior coursework — recruiters look.",
        ],
      },
    ],
    senior: [
      {
        term: "Fall 2028",
        year: "senior",
        focus: "Capstone hard, secure full time offer.",
        whyItMatters: "Capstone is your single best resume line. Pick the right team and ship.",
        recommendedCourses: ["EMAE 398", "EMAE 355"],
        milestones: [
          "Lock in a sponsor project that aligns with the role you want.",
          "Submit FT applications by the end of October.",
          "Confirm two professional references for offer references.",
        ],
      },
    ],
  };
  return {
    generatedAt: new Date().toISOString(),
    summary: `A personalized plan for ${profile?.name ?? "you"} in CWRU MAE. AI is offline right now — this is a fallback view; reconnect ANTHROPIC_API_KEY in your env vars for a tailored version.`,
    semesters: map[year] ?? map.sophomore,
  };
}
