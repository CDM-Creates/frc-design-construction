import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Disclaimer", description: "Important limitations applying to FRC website content, property screens and project tools." };

export default function DisclaimerPage() {
  return <LegalPage eyebrow="Legal · Disclaimer" title="Website Disclaimer" introduction="FRC’s website helps organise an early project conversation; it does not replace verified project information or professional advice.">
    <h2>No approval guarantee</h2><p>Planning pathways, development potential and approval outcomes depend on current legislation, verified site information, the proposal and relevant authority or certifier assessment.</p>
    <h2>No survey or planning certificate</h2><p>Mapped parcel information and planning layers are preliminary. Confirm title, survey, easements, controls, hazards, servicing and applicable legislation before design, purchase or construction decisions.</p>
    <h2>No fixed quote</h2><p>Any fee or project-cost guide is indicative only. A fee proposal requires review of the project brief, site, information available, scope and consultant requirements.</p>
    <h2>Project imagery</h2><p>Visualisations communicate design intent and may not represent constructed conditions, final selections or approval outcomes unless expressly confirmed for a particular project.</p>
  </LegalPage>;
}
