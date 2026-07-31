import { getReportPlatformRepository } from "../../../../lib/report-platform/repository";
import { REPORT_BY_ID } from "../../../../lib/report-platform/report-catalogue";
import { tokenMatches } from "../../../../lib/report-platform/security";

export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const repository = await getReportPlatformRepository();
  const report = await repository.getFinalReport(reportId);
  if (!report) return Response.json({ error: "Report not found." }, { status: 404 });
  const order = await repository.getOrder(report.orderId);
  const token = request.headers.get("x-frc-order-token") ?? "";
  if (!order || (!(await tokenMatches(token, order.ownerHash)) && !(await tokenMatches(token, report.accessHash)))) {
    return Response.json({ error: "Report access denied." }, { status: 403 });
  }
  if (report.status !== "released") return Response.json({ error: "This report is awaiting professional release approval." }, { status: 409 });
  return Response.json({
    report: {
      ...report,
      accessHash: undefined,
    },
    testMode: order.isTest,
    pdfAvailable: Boolean(report.pdfReference),
    selectedReports: (order.scope.selectedReportIds ?? []).map((id) => ({
      id,
      name: REPORT_BY_ID.get(id)?.name ?? id,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
