import { buildReportPack } from "../../../../../lib/report-platform/report-pack";
import { getReportPlatformRepository } from "../../../../../lib/report-platform/repository";
import { tokenMatches } from "../../../../../lib/report-platform/security";

export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const repository = await getReportPlatformRepository();
  const report = await repository.getFinalReport(reportId);
  if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
  const order = await repository.getOrder(report.orderId);
  const token = request.headers.get("x-frc-order-token") ?? "";
  if (!order || (!(await tokenMatches(token, order.ownerHash)) && !(await tokenMatches(token, report.accessHash)))) {
    return Response.json({ error: "Report-pack access denied." }, { status: 403 });
  }
  if (report.status !== "released") return Response.json({ error: "This report pack is not approved for release." }, { status: 409 });
  const configuredHours = Number(process.env.FRC_REPORT_PACK_EXPIRY_HOURS ?? 168);
  const expiryHours = Number.isFinite(configuredHours) && configuredHours > 0 ? Math.min(configuredHours, 24 * 365) : 168;
  const releasedAt = Date.parse(report.releasedAt ?? report.structuredReport.generatedAt);
  if (!Number.isFinite(releasedAt) || Date.now() > releasedAt + expiryHours * 60 * 60 * 1_000) {
    return Response.json({ error: "This report-pack link has expired. Contact FRC for a refreshed secure link." }, { status: 410 });
  }
  const documents = await repository.listDocuments(order.id);
  const url = new URL(request.url);
  const includeClientUploads = url.searchParams.get("includeClientUploads") === "true";
  if (includeClientUploads) {
    return Response.json({ error: "Client-upload copies require a separate explicit ownership confirmation and storage read. They remain excluded by default." }, { status: 409 });
  }
  const selectedReportIds = order.scope.selectedReportIds ?? [];
  const pack = await buildReportPack({
    orderId: order.id,
    suburb: String(order.property.suburb ?? "Property"),
    selectedReportIds,
    report: report.structuredReport,
    documents,
    visualisations: report.structuredReport.visualisations ?? [],
    includeClientUploads: false,
    professionalReviewStatus: report.structuredReport.reportStatus,
    reviewerRecord: report.reviewerRecord ?? null,
  });
  await repository.addOrderEvent({
    id: crypto.randomUUID(),
    orderId: order.id,
    eventType: "report_pack_downloaded",
    actor: "client",
    metadata: { reportId, fileCount: pack.manifest.files.length, byteSize: pack.bytes.byteLength },
    createdAt: new Date().toISOString(),
  });
  return new Response(new Blob([new Uint8Array(pack.bytes)], { type: "application/zip" }), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${pack.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
