"use client";

import { useState } from "react";

type QueueItem = {
  order: {
    id: string;
    client: { name: string; email: string };
    property: Record<string, unknown>;
    priority: boolean;
    paymentStatus: string;
    priceSnapshot: { totalCents: number; lineItems: Array<{ publicLabel: string; amountCents: number }> } | null;
    scope: { selectedItems: Array<{ code: string }> };
  };
  job: { id: string; status: string; createdAt: string };
  report: { id: string; structuredReport: { sections: Array<{ code: string; heading: string; status: string }> } } | null;
};

export function ReportReviewQueueClient() {
  const [token, setToken] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [message, setMessage] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const response = await fetch("/api/planning-simulation/review-queue", { cache: "no-store", headers: { "X-Architect-Token": token } });
    const result = await response.json() as { queue?: QueueItem[]; error?: string };
    if (!response.ok) return setMessage(result.error || "The queue could not be loaded.");
    setQueue(result.queue ?? []);
    setMessage(`${result.queue?.length ?? 0} review item(s) loaded.`);
  };

  const action = async (jobId: string, value: "approve" | "request_changes") => {
    const response = await fetch(`/api/planning-simulation/review/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Architect-Token": token },
      body: JSON.stringify({ action: value, reviewerName, reviewerRole, notes }),
    });
    const result = await response.json() as { error?: string; status?: string };
    setMessage(response.ok ? `Review ${result.status}.` : result.error || "The review action failed.");
    if (response.ok) await load();
  };

  return (
    <main className="planning-admin-page review-queue-page">
      <header><div><span>FRC · Protected operations</span><h1>Professional review queue.</h1><p>Only paid professional-review orders and safety escalations belong in the urgent queue. AI-only reports do not appear here unless escalated.</p></div><aside><label><span>Reviewer access token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label><button type="button" onClick={() => void load()}>Load queue</button><small>{message}</small></aside></header>
      <section className="reviewer-identity-fields"><label><span>Reviewer name</span><input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} /></label><label><span>Reviewer role</span><input value={reviewerRole} onChange={(event) => setReviewerRole(event.target.value)} placeholder="Use a legally accurate role" /></label><label className="wide"><span>Professional notes / required changes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label></section>
      <section className="review-queue-list">{queue.map((item) => <article key={item.job.id} className={item.order.priority ? "priority" : ""}><header><div><span>{item.order.priority ? "Priority review" : "Ordinary review"}</span><h2>{String(item.order.property.clientSuppliedAddress ?? "Private property")}</h2></div><b>{item.job.status.replaceAll("_", " ")}</b></header><dl><div><dt>Client</dt><dd>{item.order.client.name} · {item.order.client.email}</dd></div><div><dt>Payment</dt><dd>{item.order.paymentStatus}</dd></div><div><dt>Order / job</dt><dd>{item.order.id} / {item.job.id}</dd></div><div><dt>Frozen total</dt><dd>{item.order.priceSnapshot ? `A$${(item.order.priceSnapshot.totalCents / 100).toLocaleString("en-AU")}` : "Unavailable"}</dd></div></dl>{item.report && <div className="review-section-list">{item.report.structuredReport.sections.map((section) => <span key={section.code}>{section.heading}<small>{section.status.replaceAll("_", " ")}</small></span>)}</div>}<div className="review-actions"><button type="button" onClick={() => void action(item.job.id, "request_changes")}>Request changes</button><button type="button" onClick={() => void action(item.job.id, "approve")}>Approve final release</button></div></article>)}{!queue.length && <p className="planning-empty">Load the protected queue to view pending work.</p>}</section>
    </main>
  );
}
