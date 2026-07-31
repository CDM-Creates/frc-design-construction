import Link from "next/link";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { PLANNING_SOURCE_SEEDS } from "../../lib/planning-simulation/planning-sources";

export const dynamic = "force-dynamic";

export default async function PlanningSourcesAdminPage() {
  const user = await requireChatGPTUser("/admin/planning-sources");

  return (
    <main className="planning-admin-page">
      <header>
        <div>
          <span>FRC · Internal planning administration</span>
          <h1>Official source register.</h1>
          <p>
            Landing pages are kept separate from tested service endpoints.
            Nothing becomes an automated production source until its access,
            licence, schema, fallback and verification date are recorded.
          </p>
        </div>
        <aside>
          <span>Signed in</span>
          <strong>{user.displayName}</strong>
          <Link href="/simulator">Open simulator ↗</Link>
        </aside>
      </header>

      <section className="planning-admin-summary">
        <div><span>Seeded sources</span><strong>{PLANNING_SOURCE_SEEDS.length}</strong></div>
        <div><span>Connected services</span><strong>{PLANNING_SOURCE_SEEDS.filter((source) => source.integrationStatus === "connected").length}</strong></div>
        <div><span>Manual / paid</span><strong>{PLANNING_SOURCE_SEEDS.filter((source) => source.integrationStatus === "manual_or_paid_order" || source.integrationStatus === "manual_upload").length}</strong></div>
        <div><span>Service discovery</span><strong>{PLANNING_SOURCE_SEEDS.filter((source) => source.integrationStatus === "requires_service_discovery").length}</strong></div>
      </section>

      <section className="planning-admin-list" aria-label="Planning source registry">
        {PLANNING_SOURCE_SEEDS.map((source) => (
          <article key={source.sourceKey}>
            <div>
              <span>{source.sourceKey}</span>
              <h2>{source.sourceName}</h2>
              <p>{source.notes}</p>
            </div>
            <dl>
              <div><dt>Authority</dt><dd>{source.authorityName}</dd></div>
              <div><dt>Category</dt><dd>{source.category.replaceAll("_", " ")}</dd></div>
              <div><dt>Type</dt><dd>{source.serviceType.replaceAll("_", " ")}</dd></div>
              <div><dt>Access</dt><dd>{source.isPaid ? "Paid or disbursement" : "Public starting point"}</dd></div>
              <div><dt>Service URL</dt><dd>{source.serviceUrl ?? "Not configured"}</dd></div>
              <div><dt>Status</dt><dd>{source.integrationStatus.replaceAll("_", " ")}</dd></div>
            </dl>
            <footer>
              <a href={source.publicUrl} target="_blank" rel="noreferrer">Open official website ↗</a>
              <span>Endpoint testing and enable/disable controls are intentionally locked until database persistence is connected.</span>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

