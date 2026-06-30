import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { getPostHogClient } from "@/lib/posthog-server";

const schema = z.object({
  title: z.string().min(2).max(200),
  companyName: z.string().min(2).max(200),
  location: z.string().min(2).max(200),
  workMode: z.string().min(1),
  seniorityLevel: z.string().min(1),
  employmentType: z.string().min(1),
  applicationUrl: z.string().url().max(500),
  description: z.string().min(10).max(5000),
  skills: z.string().max(500).optional(),
  employerName: z.string().min(2).max(200),
  employerEmail: z.string().email().max(300),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const rl = await checkRateLimit("default", RATE_LIMITS.strict, ip);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.format() }, { status: 400 });
  }

  const {
    title,
    companyName,
    location,
    workMode,
    seniorityLevel,
    employmentType,
    applicationUrl,
    description,
    skills,
    employerName,
    employerEmail,
  } = parsed.data;

  try {
    // Generate a unique external job id
    const externalId = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Build description with contact section embedded at the bottom
    const fullDescription = `${description}\n\n---\n**Contact Person:** ${employerName} (${employerEmail})`;

    // Parse comma-separated skills
    const parsedSkills = (skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const job = await prisma.job.create({
      data: {
        externalSource: "employer",
        externalJobId: externalId,
        title,
        companyName,
        location,
        country: "GH", // Default to Ghana as pilot market
        workMode,
        seniorityLevel,
        employmentType,
        description: fullDescription,
        applicationUrl,
        postedAt: new Date(),
        status: "active",
        jobSkills: {
          create: parsedSkills.map((skillName) => ({
            skillName,
          })),
        },
      },
      include: {
        jobSkills: true,
      },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: employerEmail,
      event: "employer_job_created",
      properties: {
        jobId: job.id,
        title,
        companyName,
        workMode,
        seniorityLevel,
      },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json({ error: "Failed to submit job listing. Please contact support." }, { status: 500 });
  }
}
