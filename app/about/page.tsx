import type { Metadata } from "next";
import { PageCta } from "../components/page-cta";
import { siteConfig } from "../config/site";

export const metadata: Metadata = {
  title: "About",
  description: "Meet FRC Design & Construction and learn about its site-aware, client-centred approach to architectural design and coordination.",
};

export default function AboutPage() {
  return (
    <main className="marketing-page about-page">
      <header className="marketing-hero about-hero">
        <span>About · FRC Design & Construction</span>
        <h1>Architecture begins<br />with <em>careful listening.</em></h1>
        <p>FRC approaches each project through the relationship between site, brief, planning context and the way people need a place to work or live.</p>
      </header>
      <section className="about-introduction">
        <div><span>The practice</span><h2>Thoughtful design.<br />Practical resolution.</h2></div>
        <div><p>FRC Design & Construction provides considered residential and built-environment design support from early site conversations through concept development, documentation and coordination.</p><p>The approach is client-centred and evidence-aware: understand what is known, identify what requires verification, then develop a design response that can be communicated clearly to the people involved.</p></div>
      </section>
      <section className="about-principles">
        <article><span>01</span><h2>Listen before drawing</h2><p>Understand the client’s priorities, the way the project needs to perform and the questions the design must answer.</p></article>
        <article><span>02</span><h2>Read the site carefully</h2><p>Use available planning and property information as an early screen, then identify the surveys, documents and consultant advice required.</p></article>
        <article><span>03</span><h2>Coordinate the resolution</h2><p>Develop practical information and support communication with relevant consultants, certifiers, authorities and project teams where required.</p></article>
      </section>
      <section className="lead-architect">
        <div aria-hidden="true"><span>FRC</span></div>
        <div>
          <span>Lead Architect</span>
          <h2>{siteConfig.leadArchitect}</h2>
          <p className="lead-bio">Professional biography to be supplied.</p>
          <p>Project enquiries can be directed to Sheila for an initial discussion about the site, brief and the most useful next step.</p>
          <a href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a>
          <a href={siteConfig.emailLink}>{siteConfig.email}</a>
          <address>{siteConfig.location}</address>
        </div>
      </section>
      <PageCta heading="Planning a project in Sydney?" copy="Share the site, your ideas and the questions you need to resolve with FRC’s lead architect." />
    </main>
  );
}
