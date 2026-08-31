import { DOMAIN } from "@/config/x402";
import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
