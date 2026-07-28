import type { Metadata } from "next";
import { Suspense } from "react";
import { PageCta } from "../components/page-cta";
import { PortfolioExplorer } from "./portfolio-explorer";

export const metadata: Metadata = {
  title: "Architecture Portfolio",
  description: "A curated selection of residential, dual-occupancy, alteration, commercial and visualisation work by FRC Design & Construction.",
  openGraph: {
    title: "Architecture Portfolio | FRC Design & Construction",
    description: "Explore a curated selection of FRC residential and built-environment design work.",
  },
};

export default function PortfolioPage() {
  return (
    <main className="marketing-page portfolio-page">
      <header className="marketing-hero portfolio-hero">
        <span>Portfolio · Selected and ongoing work</span>
        <h1>Projects shaped<br />by <em>real briefs.</em></h1>
        <p>Residential, multi-dwelling, alteration, commercial and visualisation work developed through site-aware planning and clear architectural resolution.</p>
      </header>
      <section className="portfolio-introduction">
        <span>Curated practice archive</span>
        <p>Our portfolio presents a curated selection of completed and ongoing work. With a broader body of projects across residential, multi-dwelling, alteration and commercial design, not every project can be displayed online. Contact our team to discuss experience relevant to your site, brief and design goals.</p>
      </section>
      <section className="portfolio-browser" aria-label="FRC project portfolio">
        <Suspense fallback={<div className="portfolio-loading">Preparing the project archive…</div>}><PortfolioExplorer /></Suspense>
      </section>
      <PageCta eyebrow="Discuss a relevant project" heading="Looking for experience that fits your site?" copy="Tell FRC about the property, project type and design goals so the most relevant work can be discussed with you." />
    </main>
  );
}
