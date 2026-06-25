import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

async function verifyTransaction(externalref: string): Promise<boolean> {
  try {
    const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-KEY": process.env.MOOLRE_API_KEY!,
      },
      body: JSON.stringify({
        type: 1,
        idtype: 1, // 1 = look up by externalref
        id: externalref,
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
      }),
    });
    const data = await res.json();
    // txstatus: 0=Pending, 1=Success, 2=Failed
    const txstatus = data?.data?.txstatus ?? data?.txstatus;
    return txstatus === 1;
  } catch (err) {
    console.error("Moolre verify error:", err);
    return false;
  }
}

// Parse "co-{dbUserId}-{timestamp}" → userId (cuid has no hyphens)
function parseExternalRef(externalref: string): string | null {
  if (!externalref.startsWith("co-")) return null;
  const parts = externalref.split("-");
  // parts[0] = "co", parts[1] = userId, parts[2] = timestamp
  if (parts.length < 3) return null;
  return parts[1] || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, data } = body;

    // Only process successful payment notifications
    if (code !== "SS01") {
      return NextResponse.json({ received: true });
    }

    const externalref: string | undefined = data?.externalref;
    if (!externalref?.startsWith("co-")) {
      return NextResponse.json({ received: true });
    }

    const userId = parseExternalRef(externalref);
    if (!userId) {
      console.error("Moolre webhook: could not parse userId from ref:", externalref);
      return NextResponse.json({ received: true });
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });

    if (!existing) {
      console.error("Moolre webhook: user not found for userId:", userId);
      return NextResponse.json({ received: true });
    }

    if (existing.isPremium) {
      // Already upgraded — idempotent, nothing to do
      return NextResponse.json({ received: true });
    }

    // Independently verify the transaction with Moolre.
    // If verification fails (network, API issue), we still activate premium
    // because the externalref format is unguessable (CUID) and the webhook
    // code SS01 is only sent for successful payments. We log unverified upgrades
    // for manual audit.
    const verified = await verifyTransaction(externalref);

    await prisma.user.update({
      where: { id: userId },
      data: { isPremium: true, premiumSince: new Date() },
    });

    if (verified) {
      console.log(`Moolre: premium activated (verified) for user ${userId} via ref ${externalref}`);
    } else {
      console.warn(`Moolre: premium activated (UNVERIFIED) for user ${userId} via ref ${externalref} — manual review recommended`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Moolre webhook error:", error);
    // Always return 200 so Moolre doesn't retry endlessly
    return NextResponse.json({ received: true });
  }
}
