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
]);

const isLandingPage = createRouteMatcher(["/"]);

export const proxy = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Signed-in users hitting the landing page go straight to dashboard
  if (isLandingPage(request) && userId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default proxy;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!m)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
