import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

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
  targetIndustries: z.string().default(""),
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

class AIClient {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

  private getModel() {
    if (this.model) return this.model;
    if (!process.env.GEMINI_API_KEY) {
      return null;
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    });
    return this.model;
  }

  private async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const model = this.getModel();
    if (!model) throw new Error("AI not configured");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });
    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    return schema.parse(parsed);
  }

  async extractProfileFromCV(rawText: string): Promise<ExtractedProfile> {
    return await this.generateStructured(
      `
Extract a structured student profile from this CV text.
Return missing information as empty strings or empty arrays.
Set flaggedFields to any fields you are less than 75% confident about.
Never invent high-specificity facts.

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

Return:
- 4 semesters minimum
- each semester with status and task objects
- monthlyTasks for the current month
- cvScore from 0 to 100
- strengths, improvements, missing
- one concise nudge for the dashboard

Rules:
- tasks must be specific and realistic for a student
- categories should be from INTERNSHIP, CV, NETWORKING, ACADEMICS, VISA, SKILLS
- effort should be short plain English like "30 mins" or "2 hours"
- why should explain timing/strategy
      `,
      roadmapSchema
    );
  }

  async analyzeResume(resumeText: string, profile: unknown): Promise<CVAnalysis> {
    return await this.generateStructured(
      `
Analyze this student CV for their target role.

PROFILE:
${JSON.stringify(profile)}

CV:
${resumeText}

Return a score, summary, strengths, improvements, missing items, and rewrite suggestions.
Focus on specificity and usefulness, not generic advice.
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

Return a realistic match score, what they already meet, the gaps, a short action plan,
and a tailored summary plus tailored bullets for their CV.
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
          pageHint += "\nThe user is on their weekly calendar/planner. They can see their schedule and coursework. Help with scheduling, study planning, and time management.";
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
      `,
        assistantReplySchema
      );
      return response.reply;
    } catch {
      return "Start with the highest leverage task first: tighten your CV bullets, then reach out to a few relevant alumni. That will make the rest of the week easier.";
    }
  }
}

export const aiService = new AIClient();
