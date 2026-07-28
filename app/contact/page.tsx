import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { siteConfig } from "../config/site";
import { PageCta } from "../components/page-cta";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Sheila Del Monte at FRC Design & Construction about a residential or built-environment design enquiry in Sydney, NSW.",
};

export default function ContactPage() {
  return (
    <main className="marketing-page contact-page">
      <header className="marketing-hero contact-hero">
        <span>Contact · Start with the project in front of you</span>
        <h1>Let’s discuss<br />the <em>next useful step.</em></h1>
        <p>Share a general question or a short project enquiry. For a detailed architectural quote, use the project starter so site and brief information carries through.</p>
      </header>
      <section className="contact-layout">
        <aside>
          <span>Lead Architect</span>
          <h2>{siteConfig.leadArchitect}</h2>
          <dl>
            <div><dt>Phone</dt><dd><a href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a></dd></div>
            <div><dt>Email</dt><dd><a href={siteConfig.emailLink}>{siteConfig.email}</a></dd></div>
            <div><dt>Location</dt><dd>{siteConfig.location}</dd></div>
          </dl>
          <Link href={siteConfig.quoteHref}>Request a Quote <span>↗</span></Link>
          <p>Social channels are being prepared. Current profile links will be added through the central site configuration when supplied.</p>
        </aside>
        <ContactForm />
      </section>
      <PageCta eyebrow="Detailed project enquiry" heading="Ready to provide the property and project brief?" copy="Use the FRC project starter to carry your site information, priorities and message into a structured quote request." />
    </main>
  );
}
