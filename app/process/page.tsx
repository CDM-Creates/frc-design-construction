import type { Metadata } from "next";
import { PageCta } from "../components/page-cta";
import { processStages } from "../data/services";

export const metadata: Metadata = {
  title: "Our Architectural Process",
  description: "See how FRC approaches consultation, site review, concept design, documentation, approvals and construction support.",
};

export default function ProcessPage() {
  return (
    <main className="marketing-page process-page">
      <header className="marketing-hero process-hero">
        <span>Our Process · A legible path forward</span>
        <h1>From first question<br />to <em>resolved information.</em></h1>
        <p>Every project follows the information it needs. These stages describe a typical design path, not a fixed promise or a one-size-fits-all programme.</p>
      </header>
      <section className="process-variation">
        <span>Project-specific by design</span>
        <p>The sequence and scope may vary depending on project type, site constraints, planning requirements, consultant requirements and the client’s agreed scope.</p>
      </section>
      <section className="process-timeline">
        {processStages.map((stage, index) => (
          <details id={stage.id} key={stage.id} open={index === 0}>
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{stage.title}</h2>
              <p>{stage.summary}</p>
              <i aria-hidden="true">+</i>
            </summary>
            <div><span>Typical stage outputs</span><ul>{stage.outputs.map((output) => <li key={output}>{output}</li>)}</ul><p>Deliverables are confirmed in the agreed scope and coordinated with relevant consultants where required.</p></div>
          </details>
        ))}
      </section>
      <section className="process-prepare" id="what-to-prepare">
        <div><span>What to prepare</span><h2>A useful first conversation starts with what you already know.</h2></div>
        <ul><li>Property address and available title information</li><li>Survey, existing plans or property reports if available</li><li>Photos of the site or existing building</li><li>The accommodation, use or outcome you are considering</li><li>Priorities, constraints and questions you want resolved</li></ul>
      </section>
      <section className="process-faq" id="frequently-asked-questions">
        <span>Frequently asked questions</span>
        <details><summary>Do I need a survey before the first conversation?</summary><p>No. Bring the information you have. FRC can identify which verified documents are needed before measured design decisions are made.</p></details>
        <details><summary>Can FRC guarantee an approval pathway?</summary><p>No. The pathway depends on the proposal, current controls, verified property information and authority or certifier requirements.</p></details>
        <details><summary>Does every project need every stage?</summary><p>No. The appropriate stages and consultant inputs are defined around the project and the agreed appointment.</p></details>
      </section>
      <PageCta eyebrow="Begin with a conversation" heading="Start with the decision in front of you." copy="FRC can review the site, brief and available documents to help define the most useful next stage." />
    </main>
  );
}
