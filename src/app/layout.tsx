import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: "CareerOS — Your AI Career Agent",
  description:
    "Stop applying blind. CareerOS uses AI to analyze your CV fit, optimize your application, and prepare you for interviews — built for Ghana and Africa.",
  keywords: ["career", "job search", "AI", "CV", "Ghana", "Africa", "interview prep"],
  authors: [{ name: "CareerOS" }],
  metadataBase: new URL("https://careeros.live"),
  icons: {
    icon: "/logo.svg",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ServiceWorkerRegistration />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
