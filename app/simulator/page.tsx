import Link from "next/link";
import { PlanningSimulationWizard } from "../components/planning-simulation-wizard";

export default function SimulatorPage() {
  return (
    <main className="planning-simulator-page">
      <nav className="planning-site-nav">
        <Link className="brand" href="/" aria-label="FRC Design and Construction home">
          <span className="brand-mark">FRC</span>
          <span>DESIGN &<br />CONSTRUCTION</span>
        </Link>
        <div>
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
          <Link href="/portfolio">Portfolio</Link>
        </div>
        <Link href="/#quote">Start a project <span>↗</span></Link>
      </nav>
      <PlanningSimulationWizard />
      <footer className="planning-footer">
        <span>FRC Design & Construction</span>
        <p>
          Send a quote request with estimated catalogue costs. An AI draft is prepared first;
          an FRC professional reviews it so your quoted scope is delivered within approximately one week.
          If you are having issues or enquiries, please call{" "}
          <a href="tel:+61410988624">0410 988 624</a> or email{" "}
          <a href="mailto:frcdesignconstruction@gmail.com">frcdesignconstruction@gmail.com</a>{" "}
          and we will get back to you.
        </p>
      </footer>
    </main>
  );
}
