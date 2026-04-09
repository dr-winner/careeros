import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { extractTextFromFile, parseCVText } from "@/lib/cv-parser";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
      where: { userId },
    });

    let parsedText: string | null = null;
    let parsedData = null;

    try {
      parsedText = await extractTextFromFile(filename, file.type);
      parsedData = parseCVText(parsedText);
    } catch (parseError) {
      console.error("CV parsing error:", parseError);
    }

    const resume = await prisma.resume.create({
      data: {
        userId,
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

      await prisma.user.update({
        where: { clerkId: userId },
        data: {
          fullName: parsedData.name,
          phone: parsedData.phone,
        },
      });
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
