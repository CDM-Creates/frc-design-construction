"use client";

import { useRef, useState } from "react";
import type { DocumentCategoryDefinition } from "../lib/planning-simulation/document-categories";

export type UploadedDocumentSummary = {
  id: string;
  category: string;
  filename: string;
  safeFilename: string;
  mimeType: string;
  byteSize: number;
  author: string | null;
  issueDate: string | null;
  revision: string | null;
  clientNote: string | null;
  uploadedAt: string;
  status: string;
  malwareScanStatus: string;
  automatedInterpretationEligible: boolean;
  validationAccepted: boolean;
  intakeAssessment: {
    result?: string;
    summary?: string;
    detectedDocumentType?: string;
    warnings?: string[];
  } | null;
};

type PendingUpload = {
  key: string;
  file: File;
  progress: number;
  state: "queued" | "uploading" | "failed";
  error: string;
};

const size = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentUploadPanel(props: {
  category: DocumentCategoryDefinition;
  documents: UploadedDocumentSummary[];
  premiumIncluded: boolean;
  premiumSelected: boolean;
  onPremiumChange: (selected: boolean) => void;
  ensureDraft: () => Promise<{ orderId: string; accessToken: string }>;
  onUploaded: (document: UploadedDocumentSummary) => void;
  onRemoved: (documentId: string) => void;
  onBusyChange: (busy: boolean) => void;
  propertyAddress: string;
  selectedReportIds: string[];
}) {
  const isSitePhoto = props.category.code === "site_photographs";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [author, setAuthor] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [revision, setRevision] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [removing, setRemoving] = useState("");
  const [panelError, setPanelError] = useState("");

  const sendFile = async (item: PendingUpload) => {
    props.onBusyChange(true);
    setPending((current) => current.map((entry) => entry.key === item.key ? { ...entry, state: "uploading", progress: 0, error: "" } : entry));
    try {
      const credentials = await props.ensureDraft();
      const form = new FormData();
      form.set("orderId", credentials.orderId);
      form.set("accessToken", credentials.accessToken);
      form.set("category", props.category.code);
      form.set("author", author);
      form.set("issueDate", issueDate);
      form.set("revision", revision);
      form.set("clientNote", clientNote);
      form.set("propertyAddress", props.propertyAddress);
      form.set("selectedReportIds", props.selectedReportIds.join(","));
      form.set("file", item.file);
      const document = await new Promise<UploadedDocumentSummary>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/planning-simulation/documents");
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          setPending((current) => current.map((entry) => entry.key === item.key ? { ...entry, progress } : entry));
        };
        xhr.onerror = () => reject(new Error("The upload connection failed."));
        xhr.onload = () => {
          let result: { document?: UploadedDocumentSummary; error?: string } = {};
          try {
            result = JSON.parse(xhr.responseText) as typeof result;
          } catch {
            // The error below gives the user a stable retry message.
          }
          if (xhr.status < 200 || xhr.status >= 300 || !result.document) {
            reject(new Error(result.error || "The document upload failed."));
            return;
          }
          resolve(result.document);
        };
        xhr.send(form);
      });
      props.onUploaded(document);
      setPending((current) => current.filter((entry) => entry.key !== item.key));
    } catch (error) {
      setPending((current) => current.map((entry) => entry.key === item.key ? {
        ...entry,
        state: "failed",
        error: error instanceof Error ? error.message : "The upload failed.",
      } : entry));
    } finally {
      props.onBusyChange(false);
    }
  };

  const queueFiles = (files: File[]) => {
    const remaining = Math.max(0, 10 - props.documents.length - pending.length);
    const next = files.slice(0, remaining).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      progress: 0,
      state: "queued" as const,
      error: "",
    }));
    setPending((current) => [...current, ...next]);
    for (const item of next) void sendFile(item);
  };

  const remove = async (documentId: string) => {
    props.onBusyChange(true);
    setRemoving(documentId);
    setPanelError("");
    try {
      const credentials = await props.ensureDraft();
      const response = await fetch(`/api/planning-simulation/documents/${documentId}`, {
        method: "DELETE",
        headers: { "X-FRC-Order-Token": credentials.accessToken },
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The document could not be removed.");
      props.onRemoved(documentId);
    } catch (error) {
      setPanelError(
        error instanceof Error
          ? error.message
          : "The document could not be removed.",
      );
    } finally {
      setRemoving("");
      props.onBusyChange(false);
    }
  };

  return (
    <div className="document-upload-panel">
      <div className="document-upload-intro">
        <div>
          <strong>Secure upload · {props.category.label}</strong>
          <p>{props.category.description}</p>
        </div>
        <span>{props.documents.length}/10 files</span>
      </div>

      <div className="document-metadata-fields">
        <label><span>{isSitePhoto ? "Direction faced (optional)" : "Author (optional)"}</span><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder={isSitePhoto ? "North, south, toward rear boundary…" : "Author or consultant"} /></label>
        <label><span>{isSitePhoto ? "Capture date (optional)" : "Issue date (optional)"}</span><input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></label>
        <label><span>{isSitePhoto ? "Area shown (optional)" : "Revision (optional)"}</span><input value={revision} onChange={(event) => setRevision(event.target.value)} placeholder={isSitePhoto ? "Front, rear, side, internal or aerial" : "P2, Rev C…"} /></label>
        <label className="wide"><span>{isSitePhoto ? "Approximate capture location and note" : "Client note (optional)"}</span><input value={clientNote} onChange={(event) => setClientNote(event.target.value)} placeholder={isSitePhoto ? "Where the photo was taken and what it shows" : "Anything FRC should know about this file"} /></label>
      </div>

      <div
        className={`document-drop-zone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          queueFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={props.category.multiple}
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.dwg,.dxf"
          onChange={(event) => {
            queueFiles(Array.from(event.target.files ?? []));
            event.currentTarget.value = "";
          }}
        />
        <span>Drop files here</span>
        <p>{props.category.acceptedFormats} · up to 25 MB each</p>
        {props.category.manualOnlyFormats && <small>{props.category.manualOnlyFormats}</small>}
        <button type="button" onClick={() => inputRef.current?.click()}>Choose files</button>
      </div>

      {props.category.premiumUpgradeCode && (
        props.premiumIncluded ? (
          <div className="document-premium-option included">
            <span>
              <strong>{props.category.premiumLabel}</strong>
              <small>Included in the selected report price — no separate document-analysis fee</small>
            </span>
          </div>
        ) : (
          <label className="document-premium-option">
            <input type="checkbox" checked={props.premiumSelected} onChange={(event) => props.onPremiumChange(event.target.checked)} />
            <span>
              <strong>{props.category.premiumLabel}</strong>
              <small>+A${Math.round((props.category.premiumFeeCents ?? 0) / 100).toLocaleString("en-AU")} · charged for substantial interpretation, not merely for uploading</small>
            </span>
          </label>
        )
      )}

      <div className="document-file-list" aria-live="polite">
        {props.documents.map((document) => (
          <article key={document.id} className={`uploaded ${document.validationAccepted ? "validated" : "needs-review"}`}>
            <div><span>{document.validationAccepted ? "Accepted for intake" : "Needs attention"}</span><strong title={document.filename}>{document.filename}</strong><small>{size(document.byteSize)} · {document.mimeType} · {document.automatedInterpretationEligible ? "AI-readable" : "Manual review only"}</small>{document.intakeAssessment?.summary && <small>{document.intakeAssessment.summary}</small>}{document.intakeAssessment?.detectedDocumentType && <small>Detected: {document.intakeAssessment.detectedDocumentType}</small>}{document.intakeAssessment?.warnings?.map((warning) => <small key={warning}>{warning}</small>)}</div>
            <button type="button" onClick={() => void remove(document.id)} disabled={removing === document.id}>{removing === document.id ? "Removing…" : "Remove"}</button>
          </article>
        ))}
        {pending.map((item) => (
          <article key={item.key} className={item.state}>
            <div><span>{item.state === "failed" ? "Upload failed" : "Uploading"}</span><strong title={item.file.name}>{item.file.name}</strong><small>{item.error || `${size(item.file.size)} · ${item.progress}%`}</small></div>
            {item.state === "failed" && <button type="button" onClick={() => void sendFile(item)}>Retry</button>}
            {item.state === "uploading" && <progress max={100} value={item.progress}>{item.progress}%</progress>}
          </article>
        ))}
      </div>

      {!props.documents.length && !pending.length && (
        <p className="document-awaiting-message">You marked this document as available. Upload at least one file or untick the document.</p>
      )}
      {panelError && <p className="document-awaiting-message" role="alert">{panelError}</p>}
      <p className="document-security-note">Files remain private and no permanent public URL is created. When enabled, security screening runs first and AI relevance checking starts automatically on upload. Production can use private Supabase Storage or the private R2 binding; launch remains blocked until malware scanning is verified.</p>
    </div>
  );
}
