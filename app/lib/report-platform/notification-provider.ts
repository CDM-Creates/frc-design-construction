import { getBusinessConfiguration, getPlatformMode } from "./config";
import { getReportPlatformRepository } from "./repository";
import { renderStructuredReportPdf } from "./report-pack";
import { REPORT_BY_ID } from "./report-catalogue";
import { getPrivateStorageProvider } from "./storage";
import type { DocumentRecord, FinalReportRecord, NotificationRecord, ReportJob, ReportOrder } from "./types";

export type NotificationMessage = {
  type: string;
  recipient: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
};

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<{ sent: boolean; providerReference: string | null; failureReason: string | null }>;
}

export class MockNotificationProvider implements NotificationProvider {
  readonly name = "mock-notification-log";
  async send() {
    return { sent: true, providerReference: `mock_email_${crypto.randomUUID()}`, failureReason: null };
  }
}

export class UnconfiguredNotificationProvider implements NotificationProvider {
  readonly name = "unconfigured";
  async send() {
    return { sent: false, providerReference: null, failureReason: "Email provider is not configured." };
  }
}

export class ResendNotificationProvider implements NotificationProvider {
  readonly name = "resend";
  async send(message: NotificationMessage) {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    const from = process.env.QUOTE_FROM_EMAIL ?? "";
    if (!apiKey || !from) return { sent: false, providerReference: null, failureReason: "Resend sender configuration is incomplete." };
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.recipient],
          reply_to: message.replyTo || undefined,
          subject: message.subject,
          html: message.html,
          attachments: message.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            content_type: attachment.contentType,
          })),
        }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
      return response.ok
        ? { sent: true, providerReference: result.id ?? null, failureReason: null }
        : { sent: false, providerReference: null, failureReason: result.message ?? `Resend returned HTTP ${response.status}.` };
    } catch (error) {
      return { sent: false, providerReference: null, failureReason: error instanceof Error ? error.message : "Resend delivery failed." };
    }
  }
}

export function getNotificationProvider(): NotificationProvider {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const configured = /^re_[A-Za-z0-9_-]+$/.test(apiKey) && !apiKey.includes("your") && Boolean(process.env.QUOTE_FROM_EMAIL);
  if (configured) return new ResendNotificationProvider();
  return getPlatformMode() === "test" ? new MockNotificationProvider() : new UnconfiguredNotificationProvider();
}

async function recordAndSend(order: ReportOrder, message: NotificationMessage) {
  const repository = await getReportPlatformRepository();
  if (await repository.hasNotification(order.id, message.type)) return null;
  const provider = getNotificationProvider();
  const createdAt = new Date().toISOString();
  const result = await provider.send(message);
  const notification: NotificationRecord = {
    id: crypto.randomUUID(),
    orderId: order.id,
    type: message.type,
    recipient: message.recipient,
    subject: message.subject,
    status: result.sent ? (provider.name === "mock-notification-log" ? "mock_logged" : "sent") : "failed",
    providerReference: result.providerReference,
    retryCount: 0,
    failureReason: result.failureReason,
    createdAt,
    sentAt: result.sent ? createdAt : null,
  };
  await repository.addNotification(notification);
  return notification;
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export async function sendInternalOrderNotification(input: {
  order: ReportOrder;
  job: ReportJob;
  documents: DocumentRecord[];
  conflicts: unknown[];
  report: FinalReportRecord;
}) {
  const business = getBusinessConfiguration();
  if (!business.headArchitectEmail) return null;
  const prefix = input.order.professionalReviewRequired
    ? input.order.priority
      ? "[URGENT / PRIORITY — PAID FRC REVIEW]"
      : "[URGENT — PAID FRC REVIEW]"
    : input.conflicts.length
      ? "[URGENT — REPORT SAFETY ESCALATION]"
      : "[NEW AI REPORT ORDER]";
  const property = String(input.order.property.clientSuppliedAddress ?? "Private property reference");
  const selectedReports = (input.order.scope.selectedReportIds ?? []).map((id) => REPORT_BY_ID.get(id)?.name ?? id);
  const generatedPdf = await renderStructuredReportPdf(input.report.structuredReport);
  const attachments: NotificationMessage["attachments"] = [{
    filename: `FRC-${input.order.id}-AI-report.pdf`,
    content: Buffer.from(generatedPdf).toString("base64"),
    contentType: "application/pdf",
  }];
  const storage = getPrivateStorageProvider();
  let attachmentBytes = generatedPdf.byteLength;
  const omittedFiles: string[] = [];
  for (const document of input.documents) {
    if (document.malwareScanStatus !== "clean") {
      omittedFiles.push(`${document.originalFilename} (not attached: malware clearance unavailable)`);
      continue;
    }
    const stored = await storage.get(document.storageReference);
    if (!stored || attachments.length >= 11 || attachmentBytes + stored.bytes.byteLength > 20 * 1024 * 1024) {
      omittedFiles.push(`${document.originalFilename} (not attached: unavailable or email-size limit)`);
      continue;
    }
    attachments.push({
      filename: document.safeFilename,
      content: Buffer.from(stored.bytes).toString("base64"),
      contentType: stored.contentType,
    });
    attachmentBytes += stored.bytes.byteLength;
  }
  const handover = escapeHtml(JSON.stringify(input.order.scope.clientBrief ?? {
    projectMotivation: input.order.scope.projectMotivation,
    references: input.order.scope.referenceMaterials,
    notes: input.order.scope.notes,
  }, null, 2));
  const documentRows = input.documents.map((document) => `<li>${escapeHtml(document.originalFilename)} · ${escapeHtml(document.category)} · ${escapeHtml(document.status)} · malware ${escapeHtml(document.malwareScanStatus)}</li>`).join("");
  return recordAndSend(input.order, {
    type: input.conflicts.length ? "safety_escalation" : input.order.professionalReviewRequired ? "professional_review_order" : "ai_report_order",
    recipient: business.headArchitectEmail,
    subject: `${prefix} ${input.order.client.name || input.order.id} — ${property}`,
    replyTo: input.order.client.email,
    attachments,
    html: `<div style="font-family:Arial,sans-serif;color:#17221d"><h1>${escapeHtml(prefix)}</h1><p><b>Order:</b> ${escapeHtml(input.order.id)} · <b>Job:</b> ${escapeHtml(input.job.id)}</p><p><b>Client:</b> ${escapeHtml(input.order.client.name)} · ${escapeHtml(input.order.client.email)} · ${escapeHtml(input.order.client.phone)}</p><p><b>Property:</b> ${escapeHtml(property)}</p><p><b>Paid:</b> ${escapeHtml(input.order.paymentStatus)} · <b>Server total:</b> A$${escapeHtml(((input.order.priceSnapshot?.totalCents ?? 0) / 100).toLocaleString("en-AU"))}</p><h2>Requested reports</h2><ul>${selectedReports.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul><h2>Client documents</h2><ul>${documentRows || "<li>No client files supplied.</li>"}</ul>${omittedFiles.length ? `<p><b>Secure-file note:</b> ${escapeHtml(omittedFiles.join("; "))}. They remain in the private order register and were not emailed without malware clearance.</p>` : ""}<h2>Complete architect and AI handover</h2><pre style="white-space:pre-wrap;padding:16px;background:#f1f2ed;border:1px solid #ccd0c8">${handover}</pre><p>The generated AI report PDF is attached. Treat preliminary findings and unverified sources according to the report limitations.</p></div>`,
  });
}

export async function sendClientReportReadyNotification(input: {
  order: ReportOrder;
  reportId: string;
  jobId: string;
  accessFragment: string;
  reportNames?: string[];
}) {
  const business = getBusinessConfiguration();
  if (!input.order.client.email) return null;
  const reviewed = input.order.reportType === "frc_professionally_reviewed" || input.order.reportType === "council_readiness";
  const reportNames = (input.reportNames ?? []).filter((name) => typeof name === "string" && name.trim().length);
  const subject = reportNames.length === 1
    ? `Your FRC ${reportNames[0]} is ready`
    : "Your FRC report pack is ready";
  const base = business.clientBaseUrl || "http://localhost:3000";
  const secureLink = `${base}/report-status/${input.jobId}#access=${input.accessFragment}`;
  const reportList = reportNames.length
    ? `<p>The report pack includes:</p><ul>${reportNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`
    : "";
  return recordAndSend(input.order, {
    type: reviewed ? "reviewed_report_ready" : "preliminary_report_ready",
    recipient: input.order.client.email,
    subject,
    html: `<h1>${escapeHtml(subject)}</h1><p>Hi ${escapeHtml(input.order.client.name)},</p><p>Your FRC report pack for ${escapeHtml(String(input.order.property.clientSuppliedAddress ?? "your property"))} is ready.</p>${reportList}<p>You can view your reports online or securely download the complete ZIP package.</p><p><a href="${escapeHtml(secureLink)}">View reports</a></p><p><a href="${escapeHtml(secureLink)}">Download report pack</a></p><p>Report status: ${reviewed ? "Professionally reviewed" : "Preliminary AI-assisted"}.</p><p>You do not need to keep the original generation page open.</p><p>Please review the report limitations and outstanding-information schedule before relying on the findings for further design, purchase or submission decisions.</p><p>Regards,<br>FRC Design &amp; Construction</p>`,
  });
}
