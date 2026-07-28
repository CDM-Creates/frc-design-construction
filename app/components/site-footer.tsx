"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "../config/site";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "About", href: "/about" },
      { label: "Our Process", href: "/process" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Custom Home Design", href: "/services#custom-home-design" },
      { label: "Single-Storey Homes", href: "/services#single-storey-homes" },
      { label: "Double-Storey Homes", href: "/services#double-storey-homes" },
      { label: "Duplexes", href: "/services#duplex-design" },
      { label: "Granny Flats", href: "/services#granny-flats" },
      { label: "Extensions & Alterations", href: "/services#extensions-alterations" },
      { label: "Townhouses & Multi-Dwelling", href: "/services#townhouses-multi-dwelling" },
      { label: "Commercial Design", href: "/services#commercial-design" },
      { label: "3D Visualisation", href: "/services#visualisation" },
    ],
  },
  {
    title: "Start a Project",
    links: [
      { label: "Request a Quote", href: siteConfig.quoteHref },
      { label: "Project Enquiry", href: "/contact?type=project" },
      { label: "Initial Consultation", href: "/process#initial-consultation" },
      { label: "What to Prepare", href: "/process#what-to-prepare" },
      { label: "Frequently Asked Questions", href: "/process#frequently-asked-questions" },
    ],
  },
  { title: "Legal", links: siteConfig.legalLinks },
];

const projectTags = [
  { label: "New Homes", href: "/portfolio?category=Custom%20Homes" },
  { label: "Single-Storey", href: "/services#single-storey-homes" },
  { label: "Double-Storey", href: "/services#double-storey-homes" },
  { label: "Duplexes", href: "/portfolio?category=Duplexes" },
  { label: "Granny Flats", href: "/services#granny-flats" },
  { label: "Renovations", href: "/portfolio?category=Extensions%20%26%20Alterations" },
  { label: "Extensions", href: "/portfolio?category=Extensions%20%26%20Alterations" },
  { label: "Townhouses", href: "/services#townhouses-multi-dwelling" },
  { label: "Commercial", href: "/portfolio?category=Commercial" },
  { label: "3D Visualisation", href: "/portfolio?category=3D%20Visualisations" },
];

const benefits = [
  "Design shaped around your site and brief",
  "Clear communication throughout the design process",
  "Residential and development-focused design services",
  "Coordination with relevant consultants",
  "Practical documentation approach",
  "Visualisation to support design decisions",
  "Consideration of planning controls from the outset",
  "Direct project enquiry access",
];

export function SiteFooter() {
  const [openGroups, setOpenGroups] = useState<string[]>(["Explore"]);
  const toggle = (title: string) => setOpenGroups((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);

  return (
    <footer className="frc-footer">
      <section className="frc-footer-intro">
        <div className="frc-footer-brand">
          <span>{siteConfig.companyName}</span>
          <h2>{siteConfig.footer.brandLine}</h2>
          <p>{siteConfig.footer.brandDescription}</p>
        </div>
        <div className="frc-footer-enquiry">
          <span>Project enquiry</span>
          <h3>{siteConfig.footer.enquiryHeading}</h3>
          <p>{siteConfig.footer.enquiryCopy}</p>
          <div><Link href={siteConfig.quoteHref}>Request a Quote <span>→</span></Link><a href={siteConfig.emailLink}>Contact the Lead Architect <span>↗</span></a></div>
        </div>
      </section>

      <section className="frc-footer-main">
        <div className="frc-footer-contact">
          <span>Direct contact</span>
          <h3>{siteConfig.leadArchitect}</h3>
          <p>{siteConfig.leadArchitectRole}</p>
          <a href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a>
          <a href={siteConfig.emailLink}>{siteConfig.email}</a>
          <address>{siteConfig.location}</address>
          <div className="frc-socials" aria-label="Social media availability">
            {Object.entries(siteConfig.socialLinks).map(([network, href]) => href
              ? <a key={network} href={href} target="_blank" rel="noreferrer">{network === "linkedIn" ? "LinkedIn" : network[0].toUpperCase() + network.slice(1)}</a>
              : <span key={network}>{network === "linkedIn" ? "LinkedIn" : network[0].toUpperCase() + network.slice(1)} <small>Coming soon</small></span>)}
          </div>
        </div>

        <nav className="frc-footer-nav" aria-label="Footer navigation">
          {footerGroups.map((group) => {
            const expanded = openGroups.includes(group.title);
            const id = `footer-${group.title.toLowerCase().replaceAll(" ", "-")}`;
            return (
              <div key={group.title}>
                <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => toggle(group.title)}>{group.title}<span>{expanded ? "−" : "+"}</span></button>
                <div id={id} className={expanded ? "open" : ""}>{group.links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</div>
              </div>
            );
          })}
        </nav>
      </section>

      <section className="frc-footer-detail">
        <div>
          <span>Project types</span>
          <div className="frc-project-tags">{projectTags.map((tag) => <Link href={tag.href} key={tag.label}>{tag.label}</Link>)}</div>
        </div>
        <div>
          <span>Why clients work with FRC</span>
          <ul>{benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
        </div>
        <div className="frc-design-notes">
          <span>Design Notes</span>
          <h3>Design Notes launching soon.</h3>
          <p>{siteConfig.footer.designNotes}</p>
        </div>
      </section>

      <div className="frc-footer-bottom">
        <span>© 2026 {siteConfig.companyName}. All rights reserved.</span>
        <p>{siteConfig.footer.serviceStatement}</p>
        <nav aria-label="Footer legal links">{siteConfig.legalLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav>
      </div>
      <Link className="frc-mobile-quote" href={siteConfig.quoteHref}>Request a Quote <span>→</span></Link>
    </footer>
  );
}
