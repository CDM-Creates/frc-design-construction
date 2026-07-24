import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FRC Design & Construction — Architecture with real-world resolve",
  description: "Architecture, planning and documentation for considered homes and developments across Australia.",
  openGraph: {
    title: "FRC Design + Construction — From drawing to reality",
    description: "Considered architecture, approvals and documentation for homes and developments.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FRC Design + Construction — From drawing to reality",
    description: "Considered architecture, approvals and documentation for homes and developments.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
