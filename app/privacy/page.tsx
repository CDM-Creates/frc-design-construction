import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "How FRC Design & Construction handles information supplied through this website." };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal · Privacy" title="Privacy Policy" introduction="This page explains the practical handling of information submitted through the FRC website.">
    <h2>Information supplied by you</h2><p>FRC may receive contact details, project descriptions, property information and documents that you choose to submit through an enquiry or project workflow.</p>
    <h2>How information is used</h2><p>Submitted information is used to respond to your enquiry, understand the requested project context and prepare an appropriate next-step discussion. It is not intended for unrelated marketing.</p>
    <h2>Property and planning information</h2><p>Address-based tools may request information from third-party public spatial services. Preliminary results are not a planning certificate, survey or professional verification.</p>
    <h2>Storage and service providers</h2><p>Website hosting, database, file storage and email-delivery providers may process information to operate the requested functionality. Avoid submitting sensitive information that is not needed for the enquiry.</p>
    <h2>Your request</h2><p>Contact FRC if you wish to ask about information you submitted or request that it be reviewed or removed, subject to any legitimate record-keeping requirements.</p>
  </LegalPage>;
}
