import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/service-worker-registration";
import { PostHogProvider } from "@/components/posthog-provider";

export const metadata: Metadata = {
  title: "CareerOS — Your AI Career Agent",
  description:
    "Stop applying blind. CareerOS uses AI to analyze your CV fit, optimize your application, and prepare you for interviews — built for Ghana and Africa.",
  keywords: ["career", "job search", "AI", "CV", "Ghana", "Africa", "interview prep"],
  authors: [{ name: "CareerOS" }],
  metadataBase: new URL("https://careeros.live"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
