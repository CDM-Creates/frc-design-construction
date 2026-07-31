import { getBusinessConfiguration, getPlatformMode } from "./config";
import { getReportPlatformRepository } from "./repository";
import type { DocumentRecord, NotificationRecord, ReportJob, ReportOrder } from "./types";

export type NotificationMessage = {
  type: string;
  recipient: string;
  subject: string;
  html: string;
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

export function getNotificationProvider(): NotificationProvider {
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
  return recordAndSend(input.order, {
    type: input.conflicts.length ? "safety_escalation" : input.order.professionalReviewRequired ? "professional_review_order" : "ai_report_order",
    recipient: business.headArchitectEmail,
    subject: `${prefix} ${input.order.client.name || input.order.id} — ${property}`,
    html: `<h1>${escapeHtml(prefix)}</h1><p>Order ${escapeHtml(input.order.id)} · Job ${escapeHtml(input.job.id)}</p><p>${escapeHtml(property)}</p><p>Payment: ${escapeHtml(input.order.paymentStatus)} · Documents: ${input.documents.length} · Professional review: ${input.order.professionalReviewRequired ? "required" : "not purchased"}</p>`,
  });
}

export async function sendClientReportReadyNotification(input: {
  order: ReportOrder;
  reportId: string;
  jobId: string;
  accessFragment: string;
}) {
  const business = getBusinessConfiguration();
  if (!input.order.client.email) return null;
  const reviewed = input.order.reportType === "frc_professionally_reviewed" || input.order.reportType === "council_readiness";
  const subject = "Your FRC report pack is ready";
  const base = business.clientBaseUrl || "http://localhost:3000";
  return recordAndSend(input.order, {
    type: reviewed ? "reviewed_report_ready" : "preliminary_report_ready",
    recipient: input.order.client.email,
    subject,
    html: `<h1>${escapeHtml(subject)}</h1><p>Hi ${escapeHtml(input.order.client.name)},</p><p>Your FRC report pack for ${escapeHtml(String(input.order.property.clientSuppliedAddress ?? "your property"))} is ready.</p><p>You can view your reports online or securely download the complete ZIP package.</p><p><a href="${escapeHtml(`${base}/report-status/${input.jobId}#access=${input.accessFragment}`)}">View reports and download report pack</a></p><p>Report status: ${reviewed ? "Professionally reviewed" : "Preliminary AI-assisted"}.</p><p>You do not need to keep the original generation page open.</p><p>Please review the report limitations and outstanding-information schedule before relying on the findings for further design, purchase or submission decisions.</p><p>Regards,<br>FRC Design &amp; Construction</p>`,
  });
}
