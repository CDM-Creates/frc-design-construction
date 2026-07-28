import type { Metadata } from "next";
import Link from "next/link";
import { PageCta } from "../components/page-cta";
import { siteConfig } from "../config/site";
import { services } from "../data/services";

export const metadata: Metadata = {
  title: "Architectural Services",
  description: "Residential, multi-dwelling, alteration, commercial, visualisation and planning-support services from FRC Design & Construction.",
};

export default function ServicesPage() {
  return (
    <main className="marketing-page services-page">
      <header className="marketing-hero services-hero">
        <span>Services · From site to coordinated information</span>
        <h1>Design support<br />with a <em>clear purpose.</em></h1>
        <p>Services are shaped around the project, the information available and the decisions required next—always subject to site constraints, planning controls and the agreed scope.</p>
      </header>
      <section className="services-index" aria-label="Service index">
        <span>Explore services</span>
        <nav>{services.map((service, index) => <a href={`#${service.id}`} key={service.id}><i>{String(index + 1).padStart(2, "0")}</i>{service.title}</a>)}</nav>
      </section>
      <section className="services-list">
        {services.map((service, index) => (
          <article id={service.id} key={service.id}>
            <span>{String(index + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}</span>
            <div><h2>{service.title}</h2><p className="service-intro">{service.introduction}</p></div>
            <div className="service-details">
              <section><h3>Who it suits</h3><p>{service.suitableFor}</p></section>
              <section><h3>What you receive</h3><ul>{service.receives.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section><h3>What happens next</h3><p>{service.nextStep}</p><Link href={siteConfig.quoteHref}>Request a Quote <span>→</span></Link></section>
            </div>
          </article>
        ))}
      </section>
      <PageCta heading="Not sure which service fits?" copy="Start with the site and the decision you are trying to make. FRC can help define an appropriate first scope." />
    </main>
  );
}
