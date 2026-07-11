import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/service-worker-registration";
import { PostHogProvider } from "@/components/posthog-provider";

export const metadata: Metadata = {
  title: "CareerOS — Your AI Career Agent",
  description:
    "Stop applying blind. CareerOS uses AI to analyze your CV fit, optimize your application, and prepare you for interviews — built for African job seekers.",
  keywords: ["career", "job search", "AI", "CV", "Ghana", "Africa", "interview prep"],
  authors: [{ name: "CareerOS" }],
  metadataBase: new URL("https://careeros.live"),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/svg/careeros-mark.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CareerOS",
  },
  openGraph: {
    title: "CareerOS — Your AI Career Agent",
    description: "Stop applying blind. Know your fit before you apply.",
    url: "https://careeros.live",
    siteName: "CareerOS",
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS — Your AI Career Agent",
    description: "Stop applying blind. Know your fit before you apply.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PostHogProvider>
            <ServiceWorkerRegistration />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
