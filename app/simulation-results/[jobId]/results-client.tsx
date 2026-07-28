"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SimulationPackage } from "../../lib/ai/contracts";

const List = ({ items }: { items: string[] }) => <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;

export default function ResultsClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<SimulationPackage | null>(null);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/simulation/${jobId}`, { cache: "no-store" });
        if (response.ok) {
          const result = await response.json() as SimulationPackage;
          setData(result);
          sessionStorage.setItem(`frc-simulation:${jobId}`, JSON.stringify(result));
          return;
        }
        const stored = sessionStorage.getItem(`frc-simulation:${jobId}`);
        if (stored) {
          setData(JSON.parse(stored) as SimulationPackage);
          return;
        }
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "The simulation result could not be loaded.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The simulation result could not be loaded.");
      }
    };
    void load();
  }, [jobId]);

  const requestReview = async () => {
    setReviewStatus("Sending…");
    const response = await fetch("/api/architect-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    const result = await response.json() as { error?: string };
    setReviewStatus(response.ok ? "Review requested" : result.error || "Could not send request");
  };

  if (error) return <main className="results-page"><section className="results-state"><span>FRC · Simulation</span><h1>Result unavailable.</h1><p>{error}</p><Link href="/simulator">Return to the simulator →</Link></section></main>;
  if (!data) return <main className="results-page"><section className="results-state"><i className="analysis-spinner" /><span>FRC · Architectural simulation</span><h1>Loading the concept study.</h1><p>The complete project brief, specialist outputs and final report are being assembled.</p></section></main>;

  const report = data.final_report;
  const completedImages = data.generated_images.filter((image) => image.status === "complete" && image.image_url);

  return (
    <main className="results-page">
      <nav className="results-nav"><Link className="brand" href="/"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></Link><div><span className={`results-status ${data.status}`}>{data.status === "complete" ? "Concept complete" : "Concept completed with notes"}</span><Link href="/simulator">Update project details</Link></div></nav>

      <header className="results-cover">
        <div><span>AI-assisted concept study · {new Date(data.completed_at || data.created_at).toLocaleDateString("en-AU")}</span><h1>{report.project_title}</h1><p>{report.cover_statement}</p></div>
        <aside><small>Project reference</small><strong>{jobId.slice(0, 8).toUpperCase()}</strong><dl>{Object.entries(report.client_and_property_details).slice(0, 6).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></aside>
      </header>

      <section className="results-actions">
        <button type="button" onClick={requestReview}>{reviewStatus || "Request architect review"}<span>↗</span></button>
        <Link href="/#quote">Request a formal quote <span>↗</span></Link>
        <button type="button" onClick={() => window.print()}>Download concept report <span>↓</span></button>
        <Link href="/simulator">Update project details <span>→</span></Link>
      </section>

      <section className="results-intro">
        <article><span>01 / Client vision</span><h2>The brief in the client’s words.</h2><p>{report.client_vision}</p></article>
        <article className="results-summary-card"><span>02 / Project summary</span><p>{report.project_summary}</p></article>
      </section>

      {completedImages.length > 0 ? <section className="results-gallery"><header><span>03 / Concept gallery</span><h2>One project.<br /><em>One visual language.</em></h2></header><div>{completedImages.map((image) => <figure key={image.key}><img src={image.image_url} alt={`${image.title} architectural concept`} /><figcaption><b>{image.title}</b><small>{image.category}</small></figcaption></figure>)}</div></section> : <section className="results-gallery empty"><header><span>03 / Concept gallery</span><h2>Written report complete.<br /><em>Images pending.</em></h2><p>Image generation is disabled, unavailable or awaiting its configured provider. The written project package has still completed.</p></header><div>{data.generated_images.map((image) => <article key={image.key}><b>{image.title}</b><p>{image.status === "skipped" ? "Image generation is disabled in the environment." : image.error_message || "Pending provider response."}</p></article>)}</div></section>}

      <section className="results-two-column">
        <article><span>04 / Site opportunities</span><h2>Work with the land.</h2><List items={report.site_opportunities} /></article>
        <article className="warning"><span>05 / Potential constraints</span><h2>Verify before design freeze.</h2><List items={report.potential_site_constraints} /></article>
      </section>

      <section className="results-design-direction">
        <header><span>06 / Recommended direction</span><h2>Architecture shaped<br /><em>around the brief.</em></h2></header>
        <div><article><h3>Overall direction</h3><p>{report.recommended_architectural_direction}</p></article><article><h3>Exterior design</h3><p>{report.exterior_design}</p></article><article><h3>Interior design</h3><p>{report.interior_design}</p></article><article><h3>Spatial arrangement</h3><p>{report.preliminary_spatial_arrangement}</p></article></div>
      </section>

      <section className="results-room-schedule"><header><span>07 / Preliminary room schedule</span><h2>Spaces, relationships<br /><em>and early area ranges.</em></h2><p>All areas are preliminary suggestions and must be tested through measured concept design.</p></header><div className="room-table"><div className="room-row room-head"><b>Space</b><b>Location</b><b>Area</b><b>Purpose</b><b>Design notes</b></div>{report.room_schedule.map((room, index) => <div className="room-row" key={`${room.space_name}-${index}`}><strong>{room.space_name}</strong><span>{room.suggested_location}</span><span>{room.approximate_area_range}</span><span>{room.main_purpose}<small>{room.relationship_to_nearby_spaces}</small></span><span>{room.design_notes}</span></div>)}</div></section>

      <section className="results-three-column"><article><span>08 / Materials</span><List items={report.material_and_colour_palette} /></article><article><span>09 / Sustainability</span><List items={report.sustainability_opportunities} /></article><article><span>10 / Accessibility</span><List items={report.accessibility_considerations} /></article></section>

      <section className="results-verification"><header><span>11 / Planning safety</span><h2>Not verified means<br /><em>not verified.</em></h2><p>No AI output on this page is a planning certificate or confirmation of what can legally be built.</p></header><List items={report.planning_information_requiring_verification} /></section>

      <section className="results-four-grid"><article><span>Assumptions</span><List items={report.assumptions} /></article><article><span>Missing information</span><List items={report.missing_information} /></article><article><span>Questions for the client</span><List items={report.questions_for_client} /></article><article><span>Professional investigations</span><List items={report.required_professional_investigations} /></article></section>

      <section className="results-next"><div><span>12 / Recommended next steps</span><h2>Turn the concept<br /><em>into an architectural project.</em></h2></div><ol>{report.recommended_next_steps.map((step, index) => <li key={step}><i>{String(index + 1).padStart(2, "0")}</i><span>{step}</span></li>)}</ol></section>

      <section className="results-disclaimer"><b>Architectural disclaimer</b><p>{report.architectural_disclaimer}</p>{report.provider_notes.length > 0 && <details><summary>Provider and fallback notes</summary><List items={report.provider_notes} /></details>}</section>

      <footer className="results-footer"><Link className="brand" href="/"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></Link><p>Concept intelligence for better architectural decisions.<br />Professional verification remains essential.</p><span>© 2026 FRC Design & Construction</span></footer>
    </main>
  );
}
