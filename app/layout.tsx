import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "./components/site-chrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://frc-design-construction.phoebe-ritumalta.chatgpt.site"),
  title: {
    default: "FRC Design & Construction | Sydney Architecture",
    template: "%s | FRC Design & Construction",
  },
  description: "Considered residential and built-environment design, planning support and documentation in Sydney, NSW.",
  openGraph: {
    title: "FRC Design & Construction — Thoughtful design, practical resolution",
    description: "Considered residential and built-environment design, planning support and documentation in Sydney, NSW.",
    images: ["/og-v2.png"],
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "FRC Design & Construction — Thoughtful design, practical resolution",
    description: "Considered residential and built-environment design, planning support and documentation in Sydney, NSW.",
    images: ["/og-v2.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SiteChrome>{children}</SiteChrome></body>
    </html>
  );
}
