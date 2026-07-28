import Link from "next/link";

export default function SimulatorComingSoon() {
  return (
    <main className="simulator-coming-soon">
      <nav>
        <Link className="brand" href="/" aria-label="FRC Design and Construction home">
          <span className="brand-mark">FRC</span>
          <span>DESIGN &<br />CONSTRUCTION</span>
        </Link>
        <Link href="/#quote">Start a project <span>↗</span></Link>
      </nav>
      <section>
        <span>FRC · Property feasibility</span>
        <h1>Project simulator<br /><em>coming soon.</em></h1>
        <p>
          We are completing the source-traceable NSW property feasibility and
          architect handover workflow. For now, start with the Property →
          Ambition → Roadmap brief and send it directly to our lead architect.
        </p>
        <Link href="/#quote">Build your project brief <span>→</span></Link>
      </section>
      <footer>Preliminary feasibility only. Professional verification remains essential.</footer>
    </main>
  );
}
