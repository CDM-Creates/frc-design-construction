"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stage = { code: string; label: string; state: "complete" | "current" | "pending" | "blocked" | "failed" };
type StatusResponse = {
  job: { id: string; status: string; progressStage: string; failureReason: string | null };
  order: {
    id: string;
    reportType: string;
    professionalReviewRequired: boolean;
    isTest: boolean;
    client: { email: string };
  };
  stages: Stage[];
  visualStages?: Stage[];
  report: { id: string; status: string } | null;
  error?: string;
};

function StageList({ stages }: { stages: Stage[] }) {
  return <section className="report-status-stages">{stages.map((stage, index) => <article className={stage.state} key={stage.code}><i>{stage.state === "complete" ? "✓" : index + 1}</i><div><span>{stage.state}</span><strong>{stage.label}</strong></div></article>)}</section>;
}

export function ReportStatusClient({ jobId }: { jobId: string }) {
  const [access, setAccess] = useState("");
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const next = params.get("access") ?? window.sessionStorage.getItem(`frcReportJobAccess:${jobId}`) ?? "";
    if (next) window.sessionStorage.setItem(`frcReportJobAccess:${jobId}`, next);
    queueMicrotask(() => setAccess(next));
  }, [jobId]);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/planning-simulation/status/${jobId}`, {
        cache: "no-store",
        headers: { "X-FRC-Order-Token": access },
      });
      const result = await response.json() as StatusResponse;
      if (!response.ok) throw new Error(result.error || "The report status could not be loaded.");
      if (cancelled) return;
      setData(result);
      setError("");
    };
    const refresh = () => {
      void load().catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "The report status could not be loaded.");
        }
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 2_500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [access, jobId]);

  if (!access) return <main className="report-status-page"><section className="report-status-state"><span>FRC · Secure report status</span><h1>Access link required.</h1><p>Open the secure link supplied after checkout.</p><Link href="/simulator">Return to the simulator</Link></section></main>;
  if (error) return <main className="report-status-page"><section className="report-status-state"><span>FRC · Secure report status</span><h1>Status unavailable.</h1><p>{error}</p></section></main>;
  if (!data) return <main className="report-status-page"><section className="report-status-state"><span>FRC · Report workflow</span><h1>Loading your persistent status.</h1></section></main>;

  const awaitingReview = data.job.status === "awaiting_professional_review" || data.job.status === "changes_requested";
  const complete = data.job.status === "completed";
  const failed = data.job.status === "failed";
  return (
    <main className="report-status-page">
      <header>
        <div><span>FRC · {data.order.isTest ? "Test order" : "Planning report"}</span><h1>{complete ? "Your FRC report pack is ready." : awaitingReview ? "Your draft is with FRC for professional verification." : failed ? "Your report needs attention." : data.visualStages?.length ? "Your report and concept visualisations are being prepared." : "Your report is being prepared."}</h1><p>{awaitingReview ? "A professionally reviewed report cannot be released until an authorised FRC reviewer approves it." : failed ? data.job.failureReason : "You do not need to keep this page open. Your report will continue processing securely in the background, and we will email you as soon as it is ready."}</p></div>
        <aside><small>Job reference</small><strong>{jobId.slice(0, 8).toUpperCase()}</strong><span>{data.job.status.replaceAll("_", " ")}</span></aside>
      </header>
      <section className="report-status-contact"><span>We’ll take it from here.</span><h2>Need to step away?</h2><p>You do not need to keep this page open. Your report will continue processing securely, and we will email you when it is ready.</p><small>Updates will be sent to {data.order.client.email}.</small></section>
      <StageList stages={data.stages} />
      {data.visualStages?.length ? <section><h2>Concept visualisation workflow</h2><StageList stages={data.visualStages} /></section> : null}
      {data.report && <section className="report-ready-card"><span>{data.report.status === "awaiting_review" ? "Preliminary draft" : "Report ready"}</span><h2>{data.report.status === "awaiting_review" ? "Review copy available with a visible pending-review watermark." : "Your FRC report pack is ready."}</h2><Link href={`/planning-report/${data.report.id}#access=${access}`}>View reports online <span>→</span></Link><p>From the secure report you can download the PDF and ZIP pack, view the source register and outstanding information, query a finding, request professional verification, request an architectural quote, or contact FRC.</p></section>}
    </main>
  );
}
