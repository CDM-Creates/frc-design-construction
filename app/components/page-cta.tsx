import Link from "next/link";
import { siteConfig } from "../config/site";

export function PageCta({ eyebrow = "Start a project", heading = "Bring the site, the brief and the questions.", copy = "FRC will help you identify the information needed to move the project forward with clarity." }: { eyebrow?: string; heading?: string; copy?: string }) {
  return (
    <section className="page-cta" aria-labelledby="page-cta-title">
      <div>
        <span>{eyebrow}</span>
        <h2 id="page-cta-title">{heading}</h2>
      </div>
      <div>
        <p>{copy}</p>
        <Link href={siteConfig.quoteHref}>Request a Quote <span>→</span></Link>
        <a href={siteConfig.emailLink}>Contact the Lead Architect <span>↗</span></a>
      </div>
    </section>
  );
}
