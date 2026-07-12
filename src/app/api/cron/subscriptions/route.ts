import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { isValidCronSecret } from "@/lib/validation";
import { readEnv, getEmailFrom } from "@/lib/env";

const resendApiKey = readEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM = getEmailFrom();
const APP_URL = (readEnv("NEXT_PUBLIC_APP_URL") || "https://www.careeros.live").replace(/\/+$/, "");

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

const AMOUNTS: Record<string, string> = {
  monthly: readEnv("MOOLRE_MONTHLY_AMOUNT") || "25",
  annual:  readEnv("MOOLRE_ANNUAL_AMOUNT")  || "199",
};

async function createRenewalLink(userId: string, email: string, billingCycle: string): Promise<string | null> {
  try {
    const planCode = billingCycle === "annual" ? "a" : "m";
    const externalref = `co-${userId}-${planCode}-${Date.now()}`;
    const amount = AMOUNTS[billingCycle] ?? AMOUNTS.monthly;

    const res = await fetch(`${MOOLRE_BASE}/embed/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-PUBKEY": process.env.MOOLRE_API_PUBKEY!,
      },
      body: JSON.stringify({
        type: 1,
        amount,
        email,
        externalref,
        callback: `${APP_URL}/api/webhooks/moolre`,
        redirect: `${APP_URL}/pricing?success=true&ref=${encodeURIComponent(externalref)}`,
        reusable: 0,
        currency: "GHS",
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
        metadata: { userId, plan: billingCycle, type: "renewal" },
      }),
    });

    const data = await res.json();
    if (data.code !== "POS09") return null;
    return data.data?.url || data.url || data.data?.link || data.link || null;
  } catch {
    return null;
  }
}

function renewalEmailHtml(name: string, daysLeft: number, billingCycle: string, renewalUrl: string): string {
  const amount = AMOUNTS[billingCycle] ?? AMOUNTS.monthly;
  const period = billingCycle === "annual" ? "year" : "month";
  const firstName = name?.split(" ")[0] || "there";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
.logo { color: #a78bfa; font-size: 22px; font-weight: bold; text-align: center; display: block; margin-bottom: 32px; text-decoration: none; }
.card { background: rgba(13,13,24,0.8); border: 1px solid rgba(139,92,246,0.2); border-radius: 16px; padding: 32px; }
.top-stripe { height: 2px; background: linear-gradient(90deg, transparent, #8b5cf6, transparent); border-radius: 2px; margin-bottom: 28px; }
h2 { color: #fafafa; font-size: 22px; margin: 0 0 12px; }
.body-text { color: #a1a1aa; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
.highlight { color: #a78bfa; font-weight: 600; }
.cta-button { display: block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center; margin: 24px 0; }
.days-badge { display: inline-block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
.footer { text-align: center; padding-top: 28px; }
.footer-text { color: #52525b; font-size: 12px; line-height: 1.6; }
.footer-link { color: #8b5cf6; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <a href="${APP_URL}" class="logo">CareerOS</a>
  <div class="card">
    <div class="top-stripe"></div>
    <div class="days-badge">${daysLeft === 1 ? "Expires tomorrow" : `${daysLeft} days left`}</div>
    <h2>Your Premium plan is expiring soon</h2>
    <p class="body-text">Hey ${firstName}, your CareerOS Premium ${billingCycle} plan expires in <span class="highlight">${daysLeft === 1 ? "1 day" : `${daysLeft} days`}</span>. To keep your unlimited analyses, cover letters, and interview prep, renew below.</p>
    <p class="body-text">One tap on Mobile Money and you're set for another ${period}.</p>
    <a href="${renewalUrl}" class="cta-button">Renew Premium — GHS ${amount}/${period}</a>
    <p class="body-text" style="font-size:13px; color:#52525b;">If you don't renew, your account will revert to the free plan (3 analyses/month) on your expiry date. You won't lose any data.</p>
  </div>
  <div class="footer">
    <p class="footer-text">
      CareerOS · Built for African job seekers<br>
      <a href="${APP_URL}/pricing" class="footer-link">Manage subscription</a> · <a href="${APP_URL}/privacy" class="footer-link">Privacy</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

function expiredEmailHtml(name: string): string {
  const firstName = name?.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
.logo { color: #a78bfa; font-size: 22px; font-weight: bold; text-align: center; display: block; margin-bottom: 32px; text-decoration: none; }
.card { background: rgba(13,13,24,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; }
h2 { color: #fafafa; font-size: 22px; margin: 0 0 12px; }
.body-text { color: #a1a1aa; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
.cta-button { display: block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center; margin: 24px 0; }
.footer { text-align: center; padding-top: 28px; }
.footer-text { color: #52525b; font-size: 12px; line-height: 1.6; }
.footer-link { color: #8b5cf6; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <a href="${APP_URL}" class="logo">CareerOS</a>
  <div class="card">
    <h2>Your Premium plan has expired</h2>
    <p class="body-text">Hey ${firstName}, your CareerOS Premium plan has expired. Your account is now on the free plan — you still have access to 3 analyses per month and all your saved data.</p>
    <p class="body-text">Whenever you're ready, you can renew in seconds on Mobile Money.</p>
    <a href="${APP_URL}/pricing" class="cta-button">Renew Premium</a>
  </div>
  <div class="footer">
    <p class="footer-text">
      CareerOS · <a href="${APP_URL}/privacy" class="footer-link">Privacy</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const results = {
    expired: 0,
    reminded: 0,
    errors: [] as string[],
  };

  // ── 1. Expire lapsed subscriptions ──────────────────────────────────────
  const lapsed = await prisma.user.findMany({
    where: {
      isPremium: true,
      subscriptionStatus: "active",
      currentPeriodEnd: { lt: now },
    },
    select: { id: true, email: true, fullName: true },
  });

  for (const user of lapsed) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: false, subscriptionStatus: "expired" },
      });
      results.expired++;

      if (resend && user.email) {
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: "Your CareerOS Premium plan has expired",
          html: expiredEmailHtml(user.fullName || ""),
        });
      }
    } catch (err) {
      results.errors.push(`expire:${user.id}: ${err}`);
    }
  }

  // ── 2. Send renewal reminders (1-3 days before expiry) ──────────────────
  const nearExpiry = await prisma.user.findMany({
    where: {
      isPremium: true,
      subscriptionStatus: "active",
      currentPeriodEnd: { gte: now, lte: in3Days },
    },
    select: { id: true, email: true, fullName: true, billingCycle: true, currentPeriodEnd: true },
  });

  for (const user of nearExpiry) {
    try {
      if (!user.email || !user.billingCycle) continue;

      const msLeft = (user.currentPeriodEnd?.getTime() ?? now.getTime()) - now.getTime();
      const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      const renewalUrl = await createRenewalLink(user.id, user.email, user.billingCycle);
      if (!renewalUrl) {
        results.errors.push(`renewal-link:${user.id}: Moolre link creation failed`);
        continue;
      }

      if (resend) {
        await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: `Your CareerOS Premium expires in ${daysLeft === 1 ? "1 day" : `${daysLeft} days`}`,
          html: renewalEmailHtml(user.fullName || "", daysLeft, user.billingCycle, renewalUrl),
        });
      }

      results.reminded++;
    } catch (err) {
      results.errors.push(`remind:${user.id}: ${err}`);
    }
  }

  console.log("Subscription cron:", JSON.stringify(results));
  return NextResponse.json({ ok: true, ...results });
}
