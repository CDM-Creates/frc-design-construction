import { getReportPlatformRepository } from "../../../../../lib/report-platform/repository";
import { renderStructuredReportPdf } from "../../../../../lib/report-platform/report-pack";
import { tokenMatches } from "../../../../../lib/report-platform/security";

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
  if (report.status !== "released") return Response.json({ error: "This report is not approved for download." }, { status: 409 });
  const bytes = await renderStructuredReportPdf(report.structuredReport);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="FRC_${report.id.slice(0, 8)}_Report.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
