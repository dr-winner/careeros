import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAiOutage } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Cheap, no-token health signal for the UI. "degraded" means every provider
// failed within the last 10 minutes. The raw provider errors are only
// returned to admins (ADMIN_EMAILS) so the founder can read the actual cause
// from the browser instead of digging through Vercel logs.
export async function GET() {
  const configured = hasAiProviderConfigured();
  const outage = configured ? await getAiOutage() : null;

  const status: "ready" | "degraded" | "unconfigured" = !configured
    ? "unconfigured"
    : outage
      ? "degraded"
      : "ready";

  let reasons: string[] | undefined;
  if (outage) {
    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
      if (isAdminEmail(email)) reasons = outage.reasons;
    }
  }

  return NextResponse.json(
    { status, since: outage?.at ?? null, reasons },
    { headers: { "Cache-Control": "no-store" } },
  );
}
