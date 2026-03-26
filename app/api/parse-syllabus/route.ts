import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Extract all homework assignments, exams, quizzes, projects, and readings with their due dates from this syllabus for the course "${courseName}".

Return a JSON array of objects with these fields:
- title: string (e.g. "Problem Set 1", "Midterm Exam", "Chapter 3 Reading")
- type: one of "homework", "exam", "quiz", "project", "reading"
- dueDate: string in ISO format "YYYY-MM-DD" (best guess if only month/day given, assume current academic year 2025-2026)

Only return the JSON array, no other text. If you can't find any items, return [].

Syllabus text:
${text.slice(0, 8000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ items: [] });
    }

    const items = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ items });
  } catch (err: unknown) {
    console.error("Syllabus parsing failed:", err);
    return NextResponse.json({ error: "Failed to parse syllabus" }, { status: 500 });
  }
}
