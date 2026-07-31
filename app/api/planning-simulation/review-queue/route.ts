import { getReportPlatformRepository } from "../../../lib/report-platform/repository";

export async function GET(request: Request) {
  const configured = process.env.ARCHITECT_REVIEW_TOKEN ?? "";
  const supplied = request.headers.get("x-architect-token") ?? "";
  if (!configured || supplied !== configured) return Response.json({ error: "Reviewer authorisation required." }, { status: 401 });
  const repository = await getReportPlatformRepository();
  const queue = await repository.listReviewQueue();
  return Response.json({
    queue: queue.map(({ order, job, report }) => ({
      order: { ...order, ownerHash: undefined },
      job,
      report: report ? { ...report, accessHash: undefined } : null,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
