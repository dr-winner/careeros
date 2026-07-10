import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/about",
  "/pricing(.*)",
  "/employers(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known(.*)",
  "/monitoring(.*)",
  "/api/cron(.*)",
  "/api/webhooks(.*)",
  "/api/employer-waitlist(.*)",
  // Employers submit listings without an account; rate-limited by IP and
  // held as pending_review until an admin approves.
  "/api/jobs/create(.*)",
  // Anonymous landing-page fit preview; strict per-IP limit, no storage.
  "/api/fit-preview(.*)",
]);

const isLandingPage = createRouteMatcher(["/"]);

const REFERRAL_COOKIE = "careeros_ref";
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Persist ?ref=CAREER-XXXX so signup can credit the referrer even after
// the visitor navigates around before creating an account.
function withReferralCookie(request: Request, response: NextResponse): NextResponse {
  const ref = new URL(request.url).searchParams.get("ref");
  if (ref && /^CAREER-[A-Z0-9]{1,10}$/.test(ref)) {
    response.cookies.set(REFERRAL_COOKIE, ref, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

export const proxy = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Signed-in users hitting the landing page go straight to dashboard
  if (isLandingPage(request) && userId) {
    return withReferralCookie(request, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return withReferralCookie(request, NextResponse.next());
});

export default proxy;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!m)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
