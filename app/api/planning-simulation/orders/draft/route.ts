import { checkRateLimit } from "../../../../lib/rate-limit";
import { getReportPlatformRepository } from "../../../../lib/report-platform/repository";
import { createAccessToken, hashAccessToken } from "../../../../lib/report-platform/security";

export async function POST(request: Request) {
  const client = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = checkRateLimit(`report-draft:${client}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) return Response.json({ error: "Too many draft orders were requested." }, { status: 429 });
  try {
    const accessToken = createAccessToken();
    const repository = await getReportPlatformRepository();
    const order = await repository.createDraftOrder(await hashAccessToken(accessToken));
    return Response.json({
      orderId: order.id,
      accessToken,
      status: order.status,
      testMode: order.isTest,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The secure draft could not be created." }, { status: 503 });
  }
}
