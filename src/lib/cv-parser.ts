import fs from "fs";
import path from "path";
import mammoth from "mammoth";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const unpdf = await import("unpdf");
    const getDocumentProxy = unpdf.getDocumentProxy as (data: Buffer) => Promise<{
      numPages: number;
      getPage: (i: number) => Promise<unknown>;
    }>;
    const extractText = unpdf.extractText as (page: unknown) => Promise<{ totalPages: number; text: string[] }>;
    
    const pdf = await getDocumentProxy(buffer);
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const result = await extractText(page);
      if (result?.text) textParts.push(...result.text);
    }

    return textParts.join("\n");
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

export async function extractTextFromFile(
  filename: string,
  mimeType: string
): Promise<string> {
  const filepath = path.join(process.cwd(), "uploads", filename);

  if (mimeType === "application/pdf") {
    const dataBuffer = fs.readFileSync(filepath);
    return await extractTextFromPDF(dataBuffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ path: filepath });
    return result.value;
  }

  throw new Error("Unsupported file type");
}

export interface ParsedCV {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: {
    title: string;
    company: string | null;
    duration: string | null;
  }[];
  education: {
    institution: string;
    degree: string | null;
  }[];
}

export function parseCVText(text: string): ParsedCV {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );

  const phoneMatch = text.match(
    /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/
  );

  const name =
    lines[0]?.length < 50 && !lines[0].includes("@")
      ? lines[0]
      : null;

  const skillKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "react",
    "nextjs",
    "node",
    "sql",
    "postgresql",
    "mongodb",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "figma",
    "excel",
    "powerpoint",
    "word",
    "communication",
    "leadership",
    "project management",
    "data analysis",
    "machine learning",
    "ai",
    "html",
    "css",
    "sql",
    "agile",
    "scrum",
  ];

  const skills = skillKeywords.filter((skill) =>
    fullText.includes(skill)
  );

  const experienceKeywords = [
    "experience",
    "employment",
    "work history",
    "professional experience",
  ];
  const educationKeywords = [
    "education",
    "academic",
    "qualification",
    "degree",
    "bachelor",
    "master",
    "phd",
    "certificate",
    "diploma",
  ];

  let inExperience = false;
  let inEducation = false;
  const experience: ParsedCV["experience"] = [];
  const education: ParsedCV["education"] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (experienceKeywords.some((k) => lowerLine.includes(k))) {
      inExperience = true;
      inEducation = false;
      continue;
    }
    if (educationKeywords.some((k) => lowerLine.includes(k))) {
      inEducation = true;
      inExperience = false;
      continue;
    }

    if (
      lowerLine.includes("@") ||
      lowerLine.includes("www") ||
      lowerLine.includes("http")
    ) {
      continue;
    }

    if (inExperience && line.length > 5) {
      const parts = line.split(/[,@|]/).map((p) => p.trim());
      experience.push({
        title: parts[0] || line,
        company: parts[1] || null,
        duration: null,
      });
    }

    if (inEducation && line.length > 5) {
      const parts = line.split(/[,@|]/).map((p) => p.trim());
      education.push({
        institution: parts[0] || line,
        degree: parts.find(
          (p) =>
            p.toLowerCase().includes("bachelor") ||
            p.toLowerCase().includes("master") ||
            p.toLowerCase().includes("phd") ||
            p.toLowerCase().includes("diploma") ||
            p.toLowerCase().includes("certificate") ||
            p.toLowerCase().includes("degree")
        ) || null,
      });
    }
  }

  return {
    name,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    skills,
    experience: experience.slice(0, 5),
    education: education.slice(0, 3),
  };
}
