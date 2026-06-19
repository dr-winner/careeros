import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const preferencesSchema = z
  .object({
    workModes: z.array(z.string()).optional(),
    jobTypes: z.array(z.string()).optional(),
    remoteOnly: z.boolean().optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let parsed: { preferences?: z.infer<typeof preferencesSchema> } | undefined;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const raw = await request.json().catch(() => ({}));
      const result = z.object({ preferences: preferencesSchema }).safeParse(raw);
      if (result.success) {
        parsed = result.data;
      }
    }

    const client = await clerkClient();
    const existing = await client.users.getUser(userId);
    const meta = (existing.publicMetadata || {}) as Record<string, unknown>;

    const nextMeta: Record<string, unknown> = {
      ...meta,
      onboardingComplete: true,
    };

    if (parsed?.preferences) {
      nextMeta.onboardingJobPreferences = parsed.preferences;
    }

    await client.users.updateUser(userId, {
      publicMetadata: nextMeta,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding status" },
      { status: 500 },
    );
  }
}
