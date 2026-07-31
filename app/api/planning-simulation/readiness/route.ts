import { getProductionReadiness } from "../../../lib/report-platform/config";

export async function GET(request: Request) {
  const configured = process.env.ARCHITECT_REVIEW_TOKEN ?? "";
  const supplied = request.headers.get("x-architect-token") ?? "";
  if (!configured || supplied !== configured) return Response.json({ error: "Administrator authorisation required." }, { status: 401 });
  return Response.json(getProductionReadiness(), { headers: { "Cache-Control": "private, no-store" } });
}
