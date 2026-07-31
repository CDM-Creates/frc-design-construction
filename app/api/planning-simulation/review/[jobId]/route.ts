import { getBusinessConfiguration } from "../../../../lib/report-platform/config";
import { sendClientReportReadyNotification } from "../../../../lib/report-platform/notification-provider";
import { getReportPlatformRepository } from "../../../../lib/report-platform/repository";
import { createAccessToken, hashAccessToken } from "../../../../lib/report-platform/security";

function authorised(request: Request) {
  const configured = process.env.ARCHITECT_REVIEW_TOKEN ?? "";
  const supplied = request.headers.get("x-architect-token") ?? "";
  return Boolean(configured && supplied === configured);
}

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!authorised(request)) return Response.json({ error: "Reviewer authorisation required." }, { status: 401 });
  const { jobId } = await context.params;
  const repository = await getReportPlatformRepository();
  const job = await repository.getReportJob(jobId);
  if (!job) return Response.json({ error: "Report job not found." }, { status: 404 });
  const order = await repository.getOrder(job.orderId);
  const report = await repository.getFinalReportByJob(jobId);
  const documents = await repository.listDocuments(job.orderId);
  const events = await repository.listOrderEvents(job.orderId);
  return Response.json({ order: order ? { ...order, ownerHash: undefined } : null, job, report: report ? { ...report, accessHash: undefined } : null, documents: documents.map((document) => ({ ...document, storageReference: undefined })), events });
}

export async function PATCH(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!authorised(request)) return Response.json({ error: "Reviewer authorisation required." }, { status: 401 });
  try {
    const { jobId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const action = body.action;
    if (!["approve", "request_changes"].includes(String(action))) throw new Error("Choose approve or request changes.");
    const reviewerName = typeof body.reviewerName === "string" ? body.reviewerName.trim().slice(0, 160) : "";
    const reviewerRole = typeof body.reviewerRole === "string" ? body.reviewerRole.trim().slice(0, 160) : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 5000) : "";
    if (!reviewerName || !reviewerRole || !notes) throw new Error("Reviewer name, role and notes are required.");
    const repository = await getReportPlatformRepository();
    const job = await repository.getReportJob(jobId);
    if (!job || !["awaiting_professional_review", "changes_requested"].includes(job.status)) throw new Error("This report is not awaiting review.");
    const order = await repository.getOrder(job.orderId);
    const report = await repository.getFinalReportByJob(jobId);
    if (!order || !report) throw new Error("The review package is incomplete.");
    if (action === "request_changes") {
      if (order.status === "awaiting_professional_review") await repository.transitionOrder(order.id, "changes_requested", "frc_reviewer", { reviewerName, notes });
      job.status = "changes_requested";
      job.progressStage = "professional_review";
      await repository.saveReportJob(job);
      return Response.json({ status: "changes_requested" });
    }
    const business = getBusinessConfiguration();
    const reportAccessToken = createAccessToken();
    report.accessHash = await hashAccessToken(reportAccessToken);
    report.status = "released";
    report.releasedAt = new Date().toISOString();
    report.version += 1;
    report.reviewerRecord = {
      reviewerName,
      reviewerRole,
      notes,
      reviewedAt: report.releasedAt,
      registrationJurisdiction: business.reviewerRegistrationJurisdiction || null,
      registrationNumber: business.reviewerRegistrationNumber || null,
    };
    report.structuredReport.reportStatus = "frc_professionally_reviewed";
    report.structuredReport.watermark = "FRC professionally reviewed";
    report.structuredReport.lastRevisedAt = report.releasedAt;
    report.structuredReport.visualisations = report.structuredReport.visualisations?.map((visual) =>
      visual.status === "awaiting_professional_review"
        ? { ...visual, status: "approved", professionalReviewStatus: "approved" }
        : visual,
    );
    await repository.saveFinalReport(report);
    if (order.status === "changes_requested") await repository.transitionOrder(order.id, "awaiting_professional_review", "frc_reviewer", { revisionReviewed: true });
    await repository.transitionOrder(order.id, "approved_for_release", "frc_reviewer", { reviewerName, reviewerRole });
    const completedOrder = await repository.transitionOrder(order.id, "completed", "system");
    job.status = "completed";
    job.progressStage = "report_ready";
    job.completedAt = report.releasedAt;
    await repository.saveReportJob(job);
    await sendClientReportReadyNotification({ order: completedOrder, reportId: report.id, jobId, accessFragment: reportAccessToken });
    return Response.json({ status: "completed", reportId: report.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The review could not be saved." }, { status: 400 });
  }
}
