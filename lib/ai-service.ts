import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const experienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  duration: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  degree: z.string().default(""),
  institution: z.string().default(""),
  years: z.string().default(""),
  grade: z.string().default(""),
});

export const extractedProfileSchema = z.object({
  name: z.string().default(""),
  university: z.string().default(""),
  degree: z.string().default(""),
  yearOfStudy: z.string().default(""),
  graduating: z.string().default(""),
  studentType: z.string().default("Domestic"),
  dreamRole: z.string().default(""),
  targetIndustries: z.union([z.string(), z.array(z.string()).transform(a => a.join(", "))]).default(""),
  experiences: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(z.string()).default([]),
  extracurriculars: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  flaggedFields: z.array(z.string()).default([]),
});

export const roadmapSchema = z.object({
  semesters: z.array(
    z.object({
      semester: z.string(),
      status: z.enum(["completed", "current", "upcoming"]),
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          category: z.string(),
          effort: z.string(),
          why: z.string(),
        })
      ),
    })
  ),
  monthlyTasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      effort: z.string(),
      why: z.string(),
    })
  ),
  cvScore: z.number().min(0).max(100).default(0),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  nudge: z.string().default("Focus on the next few moves, not everything at once."),
});

export const cvAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  rewrites: z.array(
    z.object({
      section: z.string(),
      original: z.string(),
      suggested: z.string(),
      reason: z.string(),
    })
  ).default([]),
});

export const jobAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  metRequirements: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  actionPlan: z.array(z.string()).default([]),
  tailoredSummary: z.string(),
  tailoredBullets: z.array(z.string()).default([]),
});

export const assistantReplySchema = z.object({
  reply: z.string(),
});

type ExtractedProfile = z.infer<typeof extractedProfileSchema>;
type Roadmap = z.infer<typeof roadmapSchema>;
type CVAnalysis = z.infer<typeof cvAnalysisSchema>;
type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

// ─── AI Client (GitHub Models — OpenAI-compatible) ───────────────────────────

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";

class AIClient {
  private getToken() {
    return process.env.GITHUB_MODELS_TOKEN || null;
  }

  private getModelName() {
    return process.env.GITHUB_MODELS_MODEL || "gpt-4o-mini";
  }

  private async callModel(prompt: string, jsonMode = true): Promise<string> {
    const token = this.getToken();
    if (!token) throw new Error("AI not configured — set GITHUB_MODELS_TOKEN");

    const res = await fetch(GITHUB_MODELS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: this.getModelName(),
        messages: [
          ...(jsonMode ? [{ role: "system", content: "You are a helpful assistant. Always respond with valid JSON only, no markdown fences or extra text." }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("GitHub Models API error:", res.status, err);
      throw new Error(`AI API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  private async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const text = await this.callModel(prompt, true);
    // Strip markdown fences if model wraps in ```json
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    return schema.parse(parsed);
  }

  async extractProfileFromCV(rawText: string): Promise<ExtractedProfile> {
    return await this.generateStructured(
      `
Extract a structured student profile from this CV text.
Return missing information as empty strings or empty arrays.
Set flaggedFields to any fields you are less than 75% confident about.
Never invent high-specificity facts.

Return a JSON object with these fields:
name, university, degree, yearOfStudy, graduating, studentType, dreamRole, targetIndustries,
experiences (array of {title, company, duration, bullets[]}),
education (array of {degree, institution, years, grade}),
skills (string[]), extracurriculars (string[]), languages (string[]), flaggedFields (string[])

CV TEXT:
${rawText}
      `,
      extractedProfileSchema
    );
  }

  async generateRoadmap(profile: unknown): Promise<Roadmap> {
    return await this.generateStructured(
      `
You are generating a practical career roadmap for a university student.
Use this confirmed profile:
${JSON.stringify(profile)}

Return a JSON object with:
- semesters: array of {semester: string, status: "completed"|"current"|"upcoming", tasks: [{id, title, category, effort, why}]}
- monthlyTasks: array of {id, title, category, effort, why}
- cvScore: number 0-100
- strengths: string[]
- improvements: string[]
- missing: string[]
- nudge: string (one concise sentence for the dashboard)

Rules:
- 4 semesters minimum
- tasks must be specific and realistic for a student
- categories from: INTERNSHIP, CV, NETWORKING, ACADEMICS, VISA, SKILLS
- effort should be short plain English like "30 mins" or "2 hours"
- why should explain timing/strategy
- ids should be unique strings like "t1", "t2", etc.
      `,
      roadmapSchema
    );
  }

  async analyzeResume(resumeText: string, profile: unknown): Promise<CVAnalysis> {
    return await this.generateStructured(
      `
You are a constructive CV coach reviewing a student's resume. Be specific and encouraging while identifying real improvements.

SCORING GUIDE:
- 85-100: Exceptional, ready for top firms
- 70-84: Strong for a student, minor refinements
- 55-69: Solid foundation, clear areas to improve
- 40-54: Needs meaningful work but has potential
- Below 40: Early stage, major gaps

CRITICAL RULES:
- ONLY comment on things ACTUALLY in the CV text. Do NOT hallucinate or assume content.
- NEVER suggest non-standard sections (no "personal statements", "soft skills sections", "objective statements" for technical/engineering CVs).
- Before saying "add metrics", CHECK if numbers/percentages already exist. If they do, acknowledge that.
- Every strength must reference SPECIFIC content from the CV.
- Every improvement must: (1) reference a SPECIFIC bullet that exists, (2) explain what's wrong, (3) give a concrete 1-sentence fix. Format: "[Issue] → [Specific fix]"
- Every "missing" item must explain WHY it matters for their target role and HOW to add it.
- Rewrites: the "original" MUST be an exact quote from the CV. The "suggested" must be ready to paste into a CV — noticeably better, not vague.
- Be field-aware: engineering CVs don't need personal statements. CS CVs need project descriptions. Finance CVs need deal/modeling experience.
- Acknowledge what the student is doing WELL before pointing out issues.

STUDENT PROFILE:
${JSON.stringify(profile)}

FULL CV TEXT:
${resumeText}

Return a JSON object with:
- score: number 0-100 (use the scoring guide above — a good student CV with projects and internships should be 60-75)
- summary: string (2-3 sentences — lead with what's strong, then the #1 thing to fix)
- strengths: string[] (3-5 specific things done well, reference actual content)
- improvements: string[] (each formatted as "[Issue] → [Specific fix]", reference actual bullets)
- missing: string[] (only genuinely missing items for their target role, each with WHY and HOW)
- rewrites: array of {section: string, original: string (exact quote from CV), suggested: string (ready to paste), reason: string}
      `,
      cvAnalysisSchema
    );
  }

  async analyzeJobDescription(jobDescription: string, profile: unknown): Promise<JobAnalysis> {
    return await this.generateStructured(
      `
Compare this student's current profile against a job description.

PROFILE:
${JSON.stringify(profile)}

JOB DESCRIPTION:
${jobDescription}

Return a JSON object with:
- matchScore: number 0-100
- metRequirements: string[] (what they already meet)
- gaps: string[] (what they're missing)
- actionPlan: string[] (specific steps to close gaps)
- tailoredSummary: string (a CV summary tailored to this job)
- tailoredBullets: string[] (rewritten CV bullets for this job)

Be realistic about the match score.
      `,
      jobAnalysisSchema
    );
  }

  async chat(message: string, context: any): Promise<string> {
    try {
      const pageCtx = context.pageContext;
      let pageHint = "";
      if (pageCtx) {
        pageHint = `\n\nPAGE CONTEXT (user is currently viewing: ${pageCtx.page}):\n${JSON.stringify(pageCtx.data || {})}`;
        if (pageCtx.page === "planner") {
          pageHint += "\nThe user is on their weekly calendar/planner. Help with scheduling, study planning, and time management.";
        } else if (pageCtx.page === "cv-analyzer") {
          pageHint += "\nThe user is on their CV/resume page. Help with resume improvements, bullet writing, and career positioning.";
        } else if (pageCtx.page === "roadmap") {
          pageHint += "\nThe user is viewing their semester roadmap. Help with long-term career planning and goal prioritization.";
        } else if (pageCtx.page === "month") {
          pageHint += "\nThe user is viewing their monthly tasks. Help prioritize and break down tasks.";
        }
      }

      const response = await this.generateStructured(
        `
You are bluprint's AI assistant for students.
Be direct, plain-English, useful, and specific. Keep answers concise but actionable.
Use the student context below to personalize your response.
If the user has coursework data, reference their actual classes, grades, and deadlines.
If the user has schedule data, reference their actual calendar events.
If visa topics come up, give general info only and say it is not legal advice.

STUDENT PROFILE & ROADMAP:
${JSON.stringify({ profile: context.profile, roadmap: context.roadmap })}
${pageHint}

CONVERSATION HISTORY:
${JSON.stringify(context.history || [])}

USER MESSAGE:
${message}

Return a JSON object with a single field: { "reply": "your response here" }
      `,
        assistantReplySchema
      );
      return response.reply;
    } catch (e) {
      console.error("Chat error:", e);
      return "I'm having trouble connecting right now. Try again in a moment.";
    }
  }
}

export const aiService = new AIClient();
