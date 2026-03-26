import { NextResponse } from "next/server";

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const courseName = formData.get("courseName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = "";

    if (file.name.endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        const data = await pdfParse(Buffer.from(uint8Array));
        text = data.text;
      } catch {
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
      }
    } else {
      text = new TextDecoder().decode(uint8Array);
    }

    if (!text.trim()) {
      return NextResponse.json({ items: [] });
    }

    const token = process.env.GITHUB_MODELS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const prompt = `Extract all homework assignments, exams, quizzes, projects, and readings with their due dates from this syllabus for the course "${courseName}".

Return a JSON array of objects with these fields:
- title: string (e.g. "Problem Set 1", "Midterm Exam", "Chapter 3 Reading")
- type: one of "homework", "exam", "quiz", "project", "reading"
- dueDate: string in ISO format "YYYY-MM-DD" (best guess if only month/day given, assume current academic year 2025-2026)

Only return the JSON array, no other text. If you can't find any items, return [].

Syllabus text:
${text.slice(0, 8000)}`;

    const res = await fetch(GITHUB_MODELS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: process.env.GITHUB_MODELS_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("GitHub Models API error:", res.status, await res.text());
      return NextResponse.json({ error: "AI API error" }, { status: 500 });
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content?.trim() || "[]";

    // Extract JSON array from response
    const clean = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    const items = Array.isArray(parsed) ? parsed : parsed.items || [];

    return NextResponse.json({ items });
  } catch (err: unknown) {
    console.error("Syllabus parsing failed:", err);
    return NextResponse.json({ error: "Failed to parse syllabus" }, { status: 500 });
  }
}
