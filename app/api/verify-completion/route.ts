import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";

async function callModel(prompt: string): Promise<string> {
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (!token) throw new Error("AI not configured — set GITHUB_MODELS_TOKEN");

  const model = process.env.GITHUB_MODELS_MODEL || "gpt-4o-mini";

  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a helpful assistant. Always respond with valid JSON only, no markdown fences or extra text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskTitle = String(body?.taskTitle || "").trim();
    const taskCategory = String(body?.taskCategory || "").trim();
    const taskWhy = String(body?.taskWhy || "").trim();
    const userMessage = String(body?.message || "").trim();
    const history = body?.history || [];
    const profile = body?.profile || null;

    if (!userMessage) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const result = await callModel(`
You are a skill tree verification AI for a student career platform called "bluprint".

Your role is to determine whether a student has ACTUALLY completed a task or is just trying to skip it.

TASK TO VERIFY:
- Title: "${taskTitle}"
- Category: ${taskCategory}
- Why it matters: ${taskWhy}

STUDENT PROFILE:
${JSON.stringify(profile)}

CONVERSATION SO FAR:
${JSON.stringify(history)}

STUDENT'S LATEST MESSAGE:
${userMessage}

YOUR RULES:
1. Ask probing but friendly questions about WHAT they did, HOW they did it, and WHAT they learned.
2. Look for SPECIFIC details — names, dates, outcomes, links, metrics. Vague answers = not verified.
3. You need at MINIMUM 2 back-and-forth exchanges before approving (unless they provide extraordinary detail immediately).
4. If they're clearly BS-ing (e.g., "yeah I did it" with no details), challenge them gently but firmly.
5. If they provide convincing, specific evidence, mark as VERIFIED.
6. Be encouraging and supportive — this isn't an interrogation. Celebrate real effort.
7. If a task is something like "Apply to 2 internships", ask which companies, when they applied, what roles.
8. If a task is "Visit office hours", ask which professor, what they discussed, what they learned.

Return JSON:
{
  "reply": "Your conversational response",
  "verified": true/false (true ONLY if you're convinced they actually did it),
  "confidence": 0-100 (how confident you are they completed it),
  "reason": "Brief explanation of why you verified or didn't"
}

Set verified to true ONLY when you have enough evidence. Default to false and keep asking.
    `);

    const clean = result.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({
        reply: clean || "I'm having trouble understanding. Could you tell me more about what you did?",
        verified: false,
        confidence: 0,
        reason: "Parse error",
      });
    }

    return NextResponse.json({
      reply: parsed.reply || "Tell me more about how you completed this task.",
      verified: Boolean(parsed.verified),
      confidence: Number(parsed.confidence) || 0,
      reason: parsed.reason || "",
    });
  } catch (error) {
    console.error("verify-completion error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
