import "./globals.css";
import AppkitProvider from "@/component/AppkitProvider";
import { DOMAIN } from "@/config/x402";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

// Social crawlers need absolute image URLs. Prefer an explicit site URL, then
// the deployment URL Vercel injects, and fall back to localhost for dev.

export const metadata: Metadata = {
  metadataBase: new URL(DOMAIN),
  title: "X402 TOP AGENT",
  description: "Agent-Native Blockchain Gateway",
  openGraph: {
    title: "X402 TOP AGENT",
    description: "Agent-Native Blockchain Gateway",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "X402 TOP AGENT",
    description: "Agent-Native Blockchain Gateway",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");
  return (
    <html lang="en">
      <body>
        <AppkitProvider cookies={cookies}>{children}</AppkitProvider>
      </body>
    </html>
  );
}
