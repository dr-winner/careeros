import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { syncClerkUserToDb } from "@/lib/user";

const ALLOWED_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 5 * 1024 * 1024;

function parseCVText(text: string) {
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const skills: string[] = [];
  const experience: { title: string; company: string | null }[] = [];
  const education: { institution: string; degree: string | null }[] = [];

  const skillKeywords = [
    "javascript", "typescript", "react", "node", "python", "java", "c++", "c#",
    "html", "css", "sql", "mongodb", "postgresql", "aws", "docker", "kubernetes",
    "git", "github", "figma", "photoshop", "excel", "word", "powerpoint",
    "communication", "leadership", "teamwork", "problem solving", "analytical",
    "project management", "agile", "scrum", "machine learning", "data analysis",
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (skillKeywords.some((s: string) => lowerLine.includes(s))) {
      const words = line.split(/[,@|]/).map((p: string) => p.trim());
      for (const word of words) {
        if (word.length > 2 && word.length < 30 && !skills.includes(word)) {
          skills.push(word);
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
    if (experiencePatterns.some((p: RegExp) => p.test(line)) && line.length < 100) {
      const parts = line.split(/at|@|,|-/).map((p: string) => p.trim());
      experience.push({
        title: parts[0] || line,
        company: parts[1] || null,
      });
    }

    if (educationPatterns.some((p: RegExp) => p.test(line)) && line.length < 100) {
      const parts = line.split(/,|-/).map((p: string) => p.trim());
      education.push({
        institution: parts[0] || line,
        degree: parts[1] || null,
      });
    }
  }

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/[\+]?[\d\s-]{10,}/);
  const nameMatch = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/m);

  return {
    skills: [...new Set(skills)].slice(0, 15),
    experience: experience.slice(0, 5),
    education: education.slice(0, 3),
    name: nameMatch ? nameMatch[1] : null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0].replace(/\s/g, "") : null,
  };
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const mammothFn = mammoth.default || mammoth;
    const result = await mammothFn.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Text extraction error:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    await syncClerkUserToDb(clerkUser);

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Word documents are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
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
    let parsedData = null;

    try {
      parsedText = await extractTextFromDOCX(buffer);
      if (parsedText) {
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
        versionLabel: existingResumes === 0 ? "Primary" : `Version ${existingResumes + 1}`,
        isPrimary: existingResumes === 0,
      },
    });

    if (parsedData) {
      if (parsedData.experience.length > 0) {
        await prisma.resumeExperience.createMany({
          data: parsedData.experience.map((exp: { title: string; company: string | null }) => ({
            resumeId: resume.id,
            title: exp.title,
            company: exp.company,
          })),
        });
      }

      if (parsedData.education.length > 0) {
        await prisma.resumeEducation.createMany({
          data: parsedData.education.map((edu: { institution: string; degree: string | null }) => ({
            resumeId: resume.id,
            institution: edu.institution,
            degree: edu.degree,
          })),
        });
      }

      if (parsedData.skills.length > 0) {
        await prisma.resumeSkill.createMany({
          data: parsedData.skills.map((skill: string) => ({
            resumeId: resume.id,
            skillName: skill,
            source: "parsed",
          })),
        });
      }

      if (parsedData.name || parsedData.phone) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(parsedData.name && { fullName: parsedData.name }),
            ...(parsedData.phone && { phone: parsedData.phone }),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      id: resume.id,
      filename,
      originalName: file.name,
      size: file.size,
      versionLabel: resume.versionLabel,
      parsed: parsedData,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
