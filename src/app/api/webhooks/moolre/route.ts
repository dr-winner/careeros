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

    // Independently verify with Moolre before touching the DB
    const confirmed = await verifyTransaction(externalref);
    if (!confirmed) {
      console.warn("Moolre webhook: transaction not confirmed for ref:", externalref);
      return NextResponse.json({ received: true });
    }

    // externalref = "co-{dbUserId}-{timestamp}"
    const parts = externalref.split("-");
    if (parts.length < 3 || parts[0] !== "co") {
      console.error("Moolre webhook: unexpected externalref format:", externalref);
      return NextResponse.json({ received: true });
    }
    const userId = parts[1];

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });

    if (!existing) {
      console.error("Moolre webhook: user not found:", userId);
      return NextResponse.json({ received: true });
    }

    if (!existing.isPremium) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumSince: new Date() },
      });
      console.log(`Moolre: premium activated for user ${userId} via ref ${externalref}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Moolre webhook error:", error);
    // Always return 200 so Moolre doesn't retry endlessly
    return NextResponse.json({ received: true });
  }
}
