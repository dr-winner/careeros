import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { syncClerkUserToDb } from "@/lib/user";
import { getDbUser } from "@/lib/auth";
import { z } from "zod";

const ALLOWED_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
]);

const MAX_SIZE = 5 * 1024 * 1024;

const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "File is required")
    .refine(
      (file) => ALLOWED_TYPES.has(file.type),
      "Only PDF and Word documents are allowed",
    )
    .refine((file) => file.size <= MAX_SIZE, "File size must be less than 5MB"),
});

type ParsedResumeData = {
  skills: string[];
  experience: { title: string; company: string | null }[];
  education: { institution: string; degree: string | null }[];
  name: string | null;
  email: string | null;
  phone: string | null;
};

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function getSafeExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && ["pdf", "doc", "docx"].includes(fromName)) {
    return fromName;
  }

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "application/msword") return "doc";
  return "docx";
}

function parseCVText(text: string): ParsedResumeData {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const skills: string[] = [];
  const experience: { title: string; company: string | null }[] = [];
  const education: { institution: string; degree: string | null }[] = [];

  const skillKeywords = [
    "javascript",
    "typescript",
    "react",
    "node",
    "python",
    "java",
    "c++",
    "c#",
    "html",
    "css",
    "sql",
    "mongodb",
    "postgresql",
    "aws",
    "docker",
    "kubernetes",
    "git",
    "github",
    "figma",
    "photoshop",
    "excel",
    "word",
    "powerpoint",
    "communication",
    "leadership",
    "teamwork",
    "problem solving",
    "analytical",
    "project management",
    "agile",
    "scrum",
    "machine learning",
    "data analysis",
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (skillKeywords.some((keyword) => lowerLine.includes(keyword))) {
      const parts = line.split(/[,@|/]/).map((part) => part.trim());

      for (const part of parts) {
        if (part.length > 2 && part.length < 40 && !skills.includes(part)) {
          skills.push(part);
        }
      }
    }
  }

  const experiencePatterns = [
    /^(software|frontend|backend|full.?stack|web|mobile|data|devops|cloud|product|project|marketing|sales|hr)/i,
    /engineer|developer|manager|analyst|designer|consultant|specialist|coordinator/i,
  ];

  const educationPatterns = [
    /university|college| institute|school/i,
    /bachelor|master|phd|degree|diploma|certificate/i,
  ];

  for (const line of lines) {
    if (
      experiencePatterns.some((pattern) => pattern.test(line)) &&
      line.length < 120
    ) {
      const parts = line.split(/ at | @ |,| - /i).map((part) => part.trim());
      experience.push({
        title: parts[0] || line,
        company: parts[1] || null,
      });
    }

    if (
      educationPatterns.some((pattern) => pattern.test(line)) &&
      line.length < 120
    ) {
      const parts = line.split(/,| - /).map((part) => part.trim());
      education.push({
        institution: parts[0] || line,
        degree: parts[1] || null,
      });
    }
  }

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/[\+]?[\d\s()-]{10,}/);
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/m);

  return {
    skills: [...new Set(skills)].slice(0, 15),
    experience: experience.slice(0, 5),
    education: education.slice(0, 3),
    name: nameMatch ? nameMatch[1] : null,
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : null,
  };
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const mammothModule = mammoth.default || mammoth;
    const result = await mammothModule.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("Text extraction error:", error);
    return "";
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const PDFParse = (
      pdfParseModule as {
        PDFParse: new (options: { data: Buffer }) => {
          getText: () => Promise<{ text: string }>;
        };
      }
    ).PDFParse;

    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return data.text || "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

async function ensureAuthenticatedDbUser() {
  const { userId } = await auth();

  if (!userId) {
    return { clerkId: null, user: null };
  }

  let user = await getDbUser();

  if (user) {
    return { clerkId: userId, user };
  }

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    await syncClerkUserToDb(clerkUser);
    user = await getDbUser();
  } catch (error) {
    console.error("Failed to sync Clerk user during upload:", error);
  }

  return { clerkId: userId, user };
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await ensureAuthenticatedDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const rawFile = formData.get("file");

    const parsedUpload = uploadSchema.safeParse({
      file: rawFile,
    });

    if (!parsedUpload.success) {
      return NextResponse.json(
        { error: parsedUpload.error.issues[0]?.message || "Invalid upload" },
        { status: 400 },
      );
    }

    const { file } = parsedUpload.data;

    const ext = getSafeExtension(file);
    const baseName = sanitizeFilenamePart(
      path.basename(file.name, path.extname(file.name)) || "resume",
    );
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}.${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const existingResumes = await prisma.resume.count({
      where: { userId: user.id },
    });

    let parsedText: string | null = null;
    let parsedData: ParsedResumeData | null = null;

    try {
      if (file.type === "application/pdf") {
        parsedText = await extractTextFromPDF(buffer);
      } else {
        parsedText = await extractTextFromDOCX(buffer);
      }

      if (parsedText?.trim()) {
        parsedData = parseCVText(parsedText);
      }
    } catch (parseError) {
      console.error("CV parsing error:", parseError);
    }

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        fileUrl: `/uploads/${filename}`,
        parsedText,
        versionLabel:
          existingResumes === 0 ? "Primary" : `Version ${existingResumes + 1}`,
        isPrimary: existingResumes === 0,
      },
    });

    if (parsedData) {
      if (parsedData.experience.length > 0) {
        await prisma.resumeExperience.createMany({
          data: parsedData.experience.map((exp) => ({
            resumeId: resume.id,
            title: exp.title,
            company: exp.company,
          })),
        });
      }

      if (parsedData.education.length > 0) {
        await prisma.resumeEducation.createMany({
          data: parsedData.education.map((edu) => ({
            resumeId: resume.id,
            institution: edu.institution,
            degree: edu.degree,
          })),
        });
      }

      if (parsedData.skills.length > 0) {
        await prisma.resumeSkill.createMany({
          data: parsedData.skills.map((skill) => ({
            resumeId: resume.id,
            skillName: skill,
            source: "parsed",
          })),
        });
      }

      const profileUpdates: {
        fullName?: string;
        phone?: string;
      } = {};

      if (!user.fullName && parsedData.name) {
        profileUpdates.fullName = parsedData.name;
      }

      if (!user.phone && parsedData.phone) {
        profileUpdates.phone = parsedData.phone;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: profileUpdates,
        });
      }
    }

    const updatedCounts = await prisma.resume.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      id: resume.id,
      filename,
      originalName: file.name,
      size: file.size,
      versionLabel: resume.versionLabel,
      isPrimary: resume.isPrimary,
      parsed: parsedData,
      counts: {
        resumes: updatedCounts,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
