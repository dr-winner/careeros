import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { z } from "zod";
import { uploadToStorage } from "@/lib/storage";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured, hasVercelBlobConfigured } from "@/lib/env";

const ALLOWED_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
]);

// Keep in sync with client upload UIs (dashboard CV upload, guided onboarding, profile)
const MAX_SIZE = 10 * 1024 * 1024;

const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "File is required")
    .refine(
      (file) => ALLOWED_TYPES.has(file.type),
      "Only PDF and Word documents are allowed",
    )
    .refine((file) => file.size <= MAX_SIZE, "File size must be less than 10MB"),
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

// Extracts skills, experience, and education in one AI call. The regex
// parser needs newline-separated lines, which PDF extraction often doesn't
// produce — so experience/education silently came out empty. AI fills in
// whichever sections the parser missed (needsExperience/needsEducation).
async function extractProfileWithAI(
  resumeId: string,
  text: string,
  options: { needsExperience: boolean; needsEducation: boolean },
): Promise<void> {
  try {
    const { text: aiText } = await generateWithFallback(
      `Extract structured data from this CV.

Skills — include:
- Technical: programming languages, frameworks, libraries, databases, cloud platforms, tools
- Domain: industries, methodologies, certifications, standards
- Soft skills: leadership, communication, project management (only if explicitly mentioned)

Experience — every job/role held, most recent first.
Education — every institution attended.

CV TEXT:
${text.substring(0, 6000)}

Return ONLY JSON:
{"skills": ["React", "Team Leadership"], "experience": [{"title": "Social Media Manager", "company": "Acme Ltd"}], "education": [{"institution": "University of Ghana", "degree": "BSc Marketing"}]}
Rules: skills are 1-5 words each, proper casing, no duplicates, 10-40 total. Use null for unknown company/degree. Empty arrays if a section is absent.`,
      "You are a CV data extraction expert. Return ONLY valid JSON with skills, experience, and education. No explanations.",
      { maxTokens: 900, temperature: 0.1, json: true },
    );

    let parsed: {
      skills?: string[];
      experience?: { title?: string; company?: string | null }[];
      education?: { institution?: string; degree?: string | null }[];
    };
    try {
      parsed = JSON.parse(aiText);
    } catch {
      const match = aiText.match(/\{[\s\S]*\}/);
      if (!match) return;
      parsed = JSON.parse(match[0]);
    }

    const cleanSkills = (parsed.skills || [])
      .filter((s) => typeof s === "string" && s.trim().length > 1 && s.trim().length < 60)
      .map((s) => s.trim())
      .slice(0, 40);

    if (cleanSkills.length > 0) {
      await prisma.resumeSkill.createMany({
        data: cleanSkills.map((skill) => ({
          resumeId,
          skillName: skill,
          source: "ai",
        })),
        skipDuplicates: true,
      });
    }

    if (options.needsExperience) {
      const experience = (parsed.experience || [])
        .filter((e) => typeof e?.title === "string" && e.title.trim().length > 1)
        .slice(0, 8);
      if (experience.length > 0) {
        await prisma.resumeExperience.createMany({
          data: experience.map((exp) => ({
            resumeId,
            title: exp.title!.trim().slice(0, 120),
            company: typeof exp.company === "string" ? exp.company.trim().slice(0, 120) : null,
          })),
        });
      }
    }

    if (options.needsEducation) {
      const education = (parsed.education || [])
        .filter((e) => typeof e?.institution === "string" && e.institution.trim().length > 1)
        .slice(0, 5);
      if (education.length > 0) {
        await prisma.resumeEducation.createMany({
          data: education.map((edu) => ({
            resumeId,
            institution: edu.institution!.trim().slice(0, 120),
            degree: typeof edu.degree === "string" ? edu.degree.trim().slice(0, 120) : null,
          })),
        });
      }
    }
  } catch (err) {
    console.error("AI profile extraction failed (non-fatal):", err);
  }
}

function isLikelyCVText(text: string): { isValid: boolean; reason?: string } {
  const clean = text.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length < 30) {
    return {
      isValid: false,
      reason: "Document is too short. A standard CV should contain details about your career and background (at least 30 words)."
    };
  }

  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(clean);
  const hasWorkKeywords = /experience|employment|work|history|career|role|position|responsibility|achieved|project/i.test(clean);
  const hasEduKeywords = /education|university|degree|school|college|bsc|ba|msc|mba|diploma|certificate/i.test(clean);
  const hasSkillsKeywords = /skills|expertise|competencies|technologies|tools|languages/i.test(clean);

  const score = (hasEmail ? 1 : 0) + (hasWorkKeywords ? 1 : 0) + (hasEduKeywords ? 1 : 0) + (hasSkillsKeywords ? 1 : 0);

  if (score < 2) {
    return {
      isValid: false,
      reason: "This file does not appear to be a CV. A valid CV must contain recognizable sections (like Work Experience, Education, or Skills) and contact information."
    };
  }

  return { isValid: true };
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
    const unpdf = await import("unpdf");
    const uint8Array = new Uint8Array(buffer);
    const pdf = await unpdf.getDocumentProxy(uint8Array);
    const { text } = await unpdf.extractText(pdf, { mergePages: true });
    return text || "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const rateLimitResult = await checkRateLimit("upload", RATE_LIMITS.upload, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait before trying again." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      );
    }

    console.log("[POST /api/upload] Starting request");
    const user = await getDbUser();

    if (!user) {
      console.log("[POST /api/upload] No DB user found, forcing a reload/refresh strategy");
      return NextResponse.json(
        {
          error: "Profile synchronization in progress. Please wait 2 seconds and try again.",
          retryAfter: 2
        },
        { status: 401 }
      );
    }
    console.log(`[POST /api/upload] Authorized user: ${user.id}`);

    // JSON branch: pasted CV text (no file). Most mobile users don't have
    // a CV file on their phone — pasting from a doc or LinkedIn removes
    // the single biggest onboarding friction. Reuses the same validation,
    // extraction, and creation pipeline as file uploads.
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const pastedText = typeof body.text === "string" ? body.text.trim() : "";
      const label =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim().slice(0, 80)
          : "Pasted CV";

      if (pastedText.length < 150) {
        return NextResponse.json(
          { error: "Paste more of your CV — at least your skills and recent experience." },
          { status: 400 },
        );
      }

      const cvValidation = isLikelyCVText(pastedText);
      if (!cvValidation.isValid) {
        return NextResponse.json(
          { error: cvValidation.reason || "This text does not look like a CV." },
          { status: 400 },
        );
      }

      const duplicate = await prisma.resume.findFirst({
        where: { userId: user.id, parsedText: pastedText },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "This CV is already saved on your account." },
          { status: 409 },
        );
      }

      const existingResumes = await prisma.resume.count({ where: { userId: user.id } });
      const parsedData = parseCVText(pastedText);

      const resume = await prisma.resume.create({
        data: {
          userId: user.id,
          filename: null,
          originalName: label,
          fileUrl: null,
          parsedText: pastedText,
          versionLabel: existingResumes === 0 ? "Primary" : `Version ${existingResumes + 1}`,
          isPrimary: existingResumes === 0,
        },
      });

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

      if (hasAiProviderConfigured()) {
        await extractProfileWithAI(resume.id, pastedText, {
          needsExperience: parsedData.experience.length === 0,
          needsEducation: parsedData.education.length === 0,
        });
      } else if (parsedData.skills.length > 0) {
        await prisma.resumeSkill.createMany({
          data: parsedData.skills.map((skill) => ({
            resumeId: resume.id,
            skillName: skill,
            source: "parsed",
          })),
        });
      }

      const updatedCounts = await prisma.resume.count({ where: { userId: user.id } });

      return NextResponse.json({
        success: true,
        id: resume.id,
        filename: null,
        originalName: label,
        size: pastedText.length,
        versionLabel: resume.versionLabel,
        isPrimary: resume.isPrimary,
        parsed: parsedData,
        counts: { resumes: updatedCounts },
      });
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let fileUrl: string;
    const isVercel = !!process.env.VERCEL;

    const uploadResult = await uploadToStorage("resumes", filename, buffer, file.type);

    if (uploadResult) {
      fileUrl = uploadResult.publicUrl;
    } else if (isVercel) {
      // On Vercel the filesystem is read-only — cloud storage is required
      const hint = hasVercelBlobConfigured()
        ? "Storage upload failed. Please try again in a few minutes."
        : "File storage is not configured. Please contact support.";
      return NextResponse.json({ error: hint }, { status: 503 });
    } else {
      // Local dev fallback: write to uploads/ directory
      const filepath = path.join(uploadDir, filename);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      await writeFile(filepath, buffer);
      fileUrl = `/uploads/${filename}`;
    }

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

    if (!parsedText || !parsedText.trim()) {
      return NextResponse.json(
        { error: "We could not extract any text from this document. Please ensure it is a text-based PDF or Word document (not a scanned image or empty file)." },
        { status: 400 }
      );
    }

    const cvValidation = isLikelyCVText(parsedText);
    if (!cvValidation.isValid) {
      return NextResponse.json(
        { error: cvValidation.reason || "The uploaded document does not look like a valid CV." },
        { status: 400 }
      );
    }

    // Same file re-uploaded (same name, identical extracted text) just
    // clutters the CV list — point the user at the existing copy instead.
    const duplicate = await prisma.resume.findFirst({
      where: { userId: user.id, originalName: file.name, parsedText },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "This CV is already uploaded. Delete the existing copy first if you want to replace it." },
        { status: 409 },
      );
    }

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        fileUrl,
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

      if (parsedText && hasAiProviderConfigured()) {
        // AI extraction: await so skills are ready before the response returns
        await extractProfileWithAI(resume.id, parsedText, {
          needsExperience: parsedData.experience.length === 0,
          needsEducation: parsedData.education.length === 0,
        });
      } else if (parsedData.skills.length > 0) {
        // Keyword fallback when no AI provider is configured
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
