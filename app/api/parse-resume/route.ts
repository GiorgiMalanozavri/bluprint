import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log("PDF File received:", file.name, file.size);

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let text = "";
        try {
            console.log("Using internal pdf-parse engine (bypassing test block)...");
            // We require the lib directly to avoid the !module.parent test in index.js
            const pdfParse = require("pdf-parse/lib/pdf-parse.js");

            // Standard call
            const data = await pdfParse(Buffer.from(uint8Array));
            text = data.text;

            console.log("PDF parsing completed. Text length:", text?.length);
        } catch (err: any) {
            console.error("PDF parsing failed:", err);
            throw new Error(`PDF parsing failed: ${err.message}`);
        }

        // Helper Extractions
        const extractEmail = (text: string) => {
            const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            return match ? match[0] : "";
        };

        const extractPhone = (text: string) => {
            const match = text.match(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
            return match ? match[0] : "";
        };

        const extractLinkedin = (text: string) => {
            const match = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
            return match ? match[0] : "";
        };

        const extractName = (text: string) => {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
                const firstLine = lines[0];
                if (firstLine.split(' ').length <= 4 && !/\d/.test(firstLine)) {
                    return firstLine;
                }
            }
            return "";
        };

        // Sections Extraction
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const sections: any = {
            summary: "",
            experience: "",
            education: "",
            skills: "",
            other: ""
        };

        let currentSection = "summary";
        const markers = {
            experience: ["experience", "employment", "work history", "professional background"],
            education: ["education", "academic", "university", "degrees"],
            skills: ["skills", "expertise", "technologies", "competencies"],
            summary: ["summary", "profile", "objective", "professional summary"]
        };

        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            let foundSection = false;
            for (const [key, patterns] of Object.entries(markers)) {
                if (patterns.some(p => lowerLine === p || lowerLine.includes(p) && line.length < 30)) {
                    currentSection = key;
                    foundSection = true;
                    break;
                }
            }
            if (!foundSection) {
                sections[currentSection] += line + "\n";
            }
        });

        return NextResponse.json({
            text,
            extracted: {
                name: extractName(text),
                email: extractEmail(text),
                phone: extractPhone(text),
                linkedin: extractLinkedin(text),
                ...sections
            }
        });

    } catch (error: any) {
        console.error("PDF Route Error:", error);
        return NextResponse.json({
            error: "Failed to parse PDF",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
