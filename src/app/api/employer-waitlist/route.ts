import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { getPostHogClient } from "@/lib/posthog-server";

const schema = z.object({
  company: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  email: z.string().email().max(300),
  role: z.string().max(200).optional(),
  hiringFor: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const rl = await checkRateLimit("default", RATE_LIMITS.strict, ip);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { company, name, email, role, hiringFor } = parsed.data;

  // Store in WaitlistReferral table reusing the existing model (employer entries use a prefixed code)
  // to avoid a schema change. Code = "employer-{timestamp}-{random}"
  const code = `employer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await prisma.waitlistReferral.upsert({
    where: { referralCode: `emp-${email}` },
    update: {},
    create: {
      referralCode: `emp-${email}`,
      referralCount: 0,
    },
  });

  // Log to console so it shows in Vercel logs even before we build a proper employer DB table
  console.log("[employer-waitlist]", { company, name, email, role, hiringFor, code });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: email,
    event: "employer_waitlist_joined",
    properties: {
      company,
      role: role || null,
      hiring_for: hiringFor || null,
    },
  });

  return NextResponse.json({ success: true });
}
