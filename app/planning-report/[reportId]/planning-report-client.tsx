"use client";

import { useEffect, useState } from "react";
import type { StructuredPlanningReport } from "../../lib/report-platform/types";

type ReportResponse = {
  report?: { structuredReport: StructuredPlanningReport; status: string };
  testMode?: boolean;
  pdfAvailable?: boolean;
  selectedReports?: Array<{ id: string; name: string }>;
  error?: string;
};

function Table({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="planning-report-empty">No supported entries were generated in mock mode.</p>;
  const columns = Object.keys(rows[0]);
  return <div className="planning-report-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}

export function PlanningReportClient({ reportId }: { reportId: string }) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [error, setError] = useState("");
  const [access, setAccess] = useState("");
  const [downloading, setDownloading] = useState("");
  const [includeClientUploads, setIncludeClientUploads] = useState(false);
  const [disputeSection, setDisputeSection] = useState("");
  const [disputeExplanation, setDisputeExplanation] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const nextAccess = params.get("access") ?? "";
    queueMicrotask(() => setAccess(nextAccess));
    fetch(`/api/planning-simulation/reports/${reportId}`, { cache: "no-store", headers: { "X-FRC-Order-Token": nextAccess } })
      .then(async (response) => {
        const result = await response.json() as ReportResponse;
        if (!response.ok || !result.report) throw new Error(result.error || "The report could not be loaded.");
        setData(result);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "The report could not be loaded."));
  }, [reportId]);

  const secureDownload = async (
    kind: "pdf" | "pack",
    selectedReportId?: string,
  ) => {
    const downloadKey = selectedReportId
      ? `${kind}:${selectedReportId}`
      : kind;
    setDownloading(downloadKey);
    setActionStatus("");
    try {
      const queryParameters = new URLSearchParams();
      if (kind === "pdf" && selectedReportId) {
        queryParameters.set("selectedReportId", selectedReportId);
      }
      if (kind === "pack" && includeClientUploads) {
        queryParameters.set("includeClientUploads", "true");
        queryParameters.set("confirmOwnership", "true");
      }
      const query = queryParameters.size
        ? `?${queryParameters.toString()}`
        : "";
      const response = await fetch(
        `/api/planning-simulation/reports/${reportId}/${kind}${query}`,
        { headers: { "X-FRC-Order-Token": access } },
      );
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "The secure download could not be prepared.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `FRC_Report.${kind === "pdf" ? "pdf" : "zip"}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setActionStatus(caught instanceof Error ? caught.message : "The secure download could not be prepared.");
    } finally {
      setDownloading("");
    }
  };

  const submitDispute = async () => {
    setActionStatus("Submitting…");
    const response = await fetch(`/api/planning-simulation/reports/${reportId}/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-FRC-Order-Token": access },
      body: JSON.stringify({ sectionCode: disputeSection, explanation: disputeExplanation, entitlementType: "included_factual_correction" }),
    });
    const result = await response.json() as { error?: string; dispute?: { id: string } };
    if (!response.ok || !result.dispute) {
      setActionStatus(result.error || "The request could not be submitted.");
      return;
    }
    setActionStatus(`FRC review request received. Reference ${result.dispute.id.slice(0, 8).toUpperCase()}.`);
    setDisputeExplanation("");
  };

  if (error) return <main className="planning-report-state"><h1>Report unavailable.</h1><p>{error}</p></main>;
  if (!data?.report) return <main className="planning-report-state"><h1>Loading the FRC report.</h1></main>;
  const report = data.report.structuredReport;
  return (
    <main className="planning-report-document">
      <nav className="planning-report-toolbar"><span>FRC · Secure web report</span><div>{data.testMode && <b>Test order</b>}<button type="button" onClick={() => void secureDownload("pdf")} disabled={Boolean(downloading)}>{downloading === "pdf" ? "Preparing PDF…" : "Download combined PDF"}</button><button type="button" onClick={() => void secureDownload("pack")} disabled={Boolean(downloading)}>{downloading === "pack" ? "Preparing ZIP…" : "Download report ZIP"}</button><button type="button" onClick={() => window.print()}>Print</button></div></nav>
      {data.selectedReports?.length ? (
        <section className="planning-report-downloads" aria-labelledby="individual-report-downloads">
          <div>
            <span>Separate report files</span>
            <h2 id="individual-report-downloads">Download each selected report</h2>
            <p>Each PDF follows its own fixed FRC template and contains only the sections required for that report.</p>
          </div>
          <div>
            {data.selectedReports.map((selectedReport) => {
              const downloadKey = `pdf:${selectedReport.id}`;
              return (
                <button
                  type="button"
                  key={selectedReport.id}
                  onClick={() => void secureDownload("pdf", selectedReport.id)}
                  disabled={Boolean(downloading)}
                >
                  {downloading === downloadKey
                    ? `Preparing ${selectedReport.name}…`
                    : `Download ${selectedReport.name}`}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <section className="planning-report-upload-option">
        <label>
          <input
            type="checkbox"
            checked={includeClientUploads}
            onChange={(event) => setIncludeClientUploads(event.target.checked)}
          />
          <span>
            Include clean copies of the original client uploads in the ZIP. I
            confirm I am authorised to download and retain these documents.
          </span>
        </label>
        <p>
          Off by default. Quarantined, rejected or unavailable files are never
          included.
        </p>
      </section>
      <header className="planning-report-cover">
        <div><span>{report.reportStatus.replaceAll("_", " ")}</span><h1>{report.title}</h1><p>{report.propertyReference}</p></div>
        <aside><small>Report ID</small><strong>{report.reportId.slice(0, 8).toUpperCase()}</strong><dl><div><dt>Template</dt><dd>{report.templateVersion}</dd></div><div><dt>Pricing</dt><dd>{report.pricingVersion}</dd></div><div><dt>Generated</dt><dd>{new Date(report.generatedAt).toLocaleDateString("en-AU")}</dd></div></dl></aside>
        <div className="planning-report-watermark">{report.watermark}</div>
      </header>
      <section className="planning-report-notice"><strong>Important notice</strong><p>{report.limitations.join(" ")}</p></section>
      <section className="planning-report-contents"><span>Contents</span><ol>{report.sections.map((section) => <li key={section.code}><a href={`#${section.code}`}>{section.heading}</a></li>)}</ol></section>
      {report.sections.map((section, index) => <section className="planning-report-section" id={section.code} key={section.code}><header><span>{String(index + 1).padStart(2, "0")} · {section.status.replaceAll("_", " ")}</span><h2>{section.heading}</h2></header><p>{section.summary}</p>{section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{section.statements.length > 0 && <div className="planning-report-sources">{section.statements.map((statement, statementIndex) => <article key={`${statement.sourceId}-${statementIndex}`}><span>{statement.statementType.replaceAll("_", " ")}</span><p>{statement.text}</p><small>{statement.sourceStatus} · {statement.verificationState}</small></article>)}</div>}</section>)}
      {report.visualisations?.some((visual) => ["accepted", "approved"].includes(visual.status)) ? <section className="planning-report-section"><header><span>Concept visualisations</span><h2>Validated preliminary visual explanations</h2></header>{report.visualisations.filter((visual) => ["accepted", "approved"].includes(visual.status)).map((visual) => <article className="report-visual-card" key={visual.id}><h3>{visual.visualisationType.replaceAll("_", " ")}</h3><p>{visual.caption}</p><div className="report-visual-diagram" role="img" aria-label={`${visual.visualisationType.replaceAll("_", " ")} preliminary diagram`}><span>Existing / supported context</span><span>Preliminary concept zone</span></div><ul>{visual.legend.map((entry) => <li key={`${entry.status}-${entry.label}`}><b>{entry.colour}</b> {entry.label} · {entry.status.replaceAll("_", " ")}</li>)}</ul><small>{visual.disclaimer}</small><p><strong>Next action:</strong> {visual.recommendedNextAction}</p></article>)}</section> : null}
      <section className="planning-report-section"><header><span>Schedule</span><h2>Source and provenance register</h2></header><div className="planning-report-sources">{(report.sourceRegister ?? []).map((source, index) => {
        const sourceId = String(source.id ?? source.sourceId ?? `source-${index + 1}`);
        const sourceUrl = typeof source.sourceUrl === "string" && /^https:\/\//i.test(source.sourceUrl) ? source.sourceUrl : "";
        return <article key={`${sourceId}-${index}`}><span>{String(source.status ?? "source")}</span><p><strong>{String(source.name ?? sourceId)}</strong></p><small>{sourceId} · retrieved {String(source.retrievedAt ?? "not recorded")}</small>{sourceUrl && <p><a href={sourceUrl} target="_blank" rel="noreferrer">Open official source ↗</a></p>}</article>;
      })}</div></section>
      <section className="planning-report-section"><header><span>Schedule</span><h2>Document register</h2></header><Table rows={report.documentRegister} /></section>
      <section className="planning-report-section"><header><span>Schedule</span><h2>Planning-control matrix</h2></header><Table rows={report.planningControlMatrix} /></section>
      <section className="planning-report-section"><header><span>Schedule</span><h2>Risk register</h2></header><Table rows={report.riskRegister} /></section>
      <section className="planning-report-section"><header><span>Schedule</span><h2>Action plan</h2></header><Table rows={report.actionPlan} /></section>
      {report.optionComparison.length > 0 && <section className="planning-report-section"><header><span>Schedule</span><h2>Options comparison</h2></header><Table rows={report.optionComparison} /></section>}
      {report.professionalReviewRecord && Object.keys(report.professionalReviewRecord).length > 0 && <section className="planning-report-section"><header><span>Professional release</span><h2>Professional review record</h2></header><Table rows={[report.professionalReviewRecord]} /></section>}
      <section className="planning-report-section report-dispute-panel"><header><span>FRC review pathway</span><h2>Questions about a finding?</h2></header><p>Every completed report includes a clear pathway to query or dispute a finding. Your concern and the relevant report section can be sent directly to FRC for review.</p><p>We will review the cited source, the information supplied and the report reasoning. Where a correction is justified, the report will be revised and the change recorded.</p><label><span>Report section</span><select value={disputeSection} onChange={(event) => setDisputeSection(event.target.value)}><option value="">Select a section</option>{report.sections.map((section) => <option value={section.code} key={section.code}>{section.heading}</option>)}</select></label><label><span>Explain the factual concern</span><textarea value={disputeExplanation} onChange={(event) => setDisputeExplanation(event.target.value)} rows={5} /></label><button type="button" onClick={() => void submitDispute()}>Send section to FRC for review</button>{actionStatus && <p role="status">{actionStatus}</p>}</section>
      <footer className="planning-report-footer"><strong>FRC Design & Construction</strong><span>{report.confidentialityNotice}</span><small>Report {report.reportId} · Order {report.orderId}</small></footer>
    </main>
  );
}
