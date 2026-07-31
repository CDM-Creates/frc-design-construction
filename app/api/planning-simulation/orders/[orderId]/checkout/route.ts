import { getPaymentProvider } from "../../../../../lib/report-platform/payment-provider";
import { getReportPlatformRepository } from "../../../../../lib/report-platform/repository";
import { tokenMatches } from "../../../../../lib/report-platform/security";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const accessToken = request.headers.get("x-frc-order-token") ?? "";
    const repository = await getReportPlatformRepository();
    const order = await repository.getOrder(orderId);
    if (!order || !(await tokenMatches(accessToken, order.ownerHash))) {
      return Response.json({ error: "Order authorisation failed." }, { status: 403 });
    }
    if (order.status !== "ready_for_checkout" || !order.priceSnapshot?.totalCents) {
      throw new Error(order.tailoredQuote ? "Tailored engagements do not use automatic checkout." : "The order is not ready for checkout.");
    }
    const provider = getPaymentProvider();
    const baseUrl = new URL(request.url).origin;
    const session = await provider.createCheckoutSession({
      orderId,
      totalCents: order.priceSnapshot.totalCents,
      currency: "AUD",
      idempotencyKey: order.priceSnapshot.snapshotId,
      returnBaseUrl: baseUrl,
    });
    order.paymentStatus = "awaiting";
    order.updatedAt = new Date().toISOString();
    await repository.saveOrder(order);
    await repository.transitionOrder(orderId, "awaiting_payment", "system", { provider: provider.name, sessionId: session.sessionId });
    return Response.json({ session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Checkout could not be created." }, { status: 400 });
  }
}
