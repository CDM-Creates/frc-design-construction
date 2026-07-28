import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";
import { siteConfig } from "../config/site";

export const metadata: Metadata = { title: "Accessibility", description: "FRC Design & Construction’s approach to accessible website use and contact alternatives." };

export default function AccessibilityPage() {
  return <LegalPage eyebrow="Website · Accessibility" title="Accessibility" introduction="FRC aims to make this website clear, keyboard-usable and readable across common devices and assistive technologies.">
    <h2>Using the website</h2><p>Navigation, menus, forms, filters and accordions are designed for keyboard operation. Essential information is not intended to depend on animation, and reduced-motion preferences are respected.</p>
    <h2>Alternative contact</h2><p>If a website feature is difficult to use, contact FRC by phone at <a href={siteConfig.phoneLink}>{siteConfig.phoneDisplay}</a> or email at <a href={siteConfig.emailLink}>{siteConfig.email}</a>.</p>
    <h2>Feedback</h2><p>Please identify the page, device or task involved when reporting an accessibility problem so it can be reviewed.</p>
  </LegalPage>;
}
