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
        <p>Preliminary property-planning assessment only. Professional verification remains essential.</p>
      </footer>
    </main>
  );
}
