import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Website Terms", description: "Terms applying to use of the FRC Design & Construction website." };

export default function TermsPage() {
  return <LegalPage eyebrow="Legal · Terms" title="Website Terms" introduction="These concise terms describe the intended use of the FRC Design & Construction website.">
    <h2>General information</h2><p>Website content is general information and an introduction to FRC’s design services. It does not create a professional appointment or replace project-specific advice.</p>
    <h2>Project tools and estimates</h2><p>Property screens, capacity calculations, fee guides and process descriptions are preliminary decision-support tools. They depend on the information supplied and require professional verification before reliance.</p>
    <h2>Project imagery and documents</h2><p>Images, drawings and folios are presented for viewing in connection with FRC’s work. They must not be treated as construction documents for another site or project.</p>
    <h2>External services</h2><p>Links and public-data services may change or become unavailable. FRC does not control third-party websites or guarantee the currency of information they provide.</p>
    <h2>Changes</h2><p>Website content and these terms may be updated as the practice, services and technical integrations develop.</p>
  </LegalPage>;
}
