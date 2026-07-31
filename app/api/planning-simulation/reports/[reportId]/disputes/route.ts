import { validateDisputeSubmission, type DisputeEntitlement, type ReportDispute } from "../../../../../lib/report-platform/disputes";
import { getReportPlatformRepository } from "../../../../../lib/report-platform/repository";
import { tokenMatches } from "../../../../../lib/report-platform/security";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const repository = await getReportPlatformRepository();
  const report = await repository.getFinalReport(reportId);
  if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
  const order = await repository.getOrder(report.orderId);
  const token = request.headers.get("x-frc-order-token") ?? "";
  if (!order || (!(await tokenMatches(token, order.ownerHash)) && !(await tokenMatches(token, report.accessHash)))) {
    return Response.json({ error: "Report access denied." }, { status: 403 });
  }
  const body = await request.json() as Record<string, unknown>;
  const sectionCode = clean(body.sectionCode, 160);
  const explanation = clean(body.explanation, 5_000);
  const entitlementType = clean(body.entitlementType, 80);
  const validation = validateDisputeSubmission({
    reportId,
    orderId: order.id,
    sectionCode,
    explanation,
    entitlementType,
    reportSectionCodes: report.structuredReport.sections.map((section) => section.code),
  });
  if (!validation.valid) return Response.json({ error: validation.issues.join(" ") }, { status: 400 });
  const dispute: ReportDispute = {
    id: crypto.randomUUID(),
    orderId: order.id,
    reportId,
    disputedSectionCode: sectionCode,
    entitlementType: entitlementType as DisputeEntitlement,
    clientExplanation: explanation,
    supportingStorageReference: null,
    status: "submitted",
    assignedReviewer: null,
    outcome: null,
    correctionRecord: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  await repository.createDispute(dispute);
  await repository.addOrderEvent({
    id: crypto.randomUUID(),
    orderId: order.id,
    eventType: "report_dispute_submitted",
    actor: "client",
    metadata: { disputeId: dispute.id, reportId, sectionCode, entitlementType },
    createdAt: dispute.createdAt,
  });
  return Response.json({ dispute: { ...dispute, supportingStorageReference: undefined } }, { status: 201 });
}
