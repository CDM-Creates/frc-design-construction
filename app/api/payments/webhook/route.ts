import { after } from "next/server";
import { getPaymentProvider } from "../../../lib/report-platform/payment-provider";
import { createQueuedMockReportJob, runMockReportGeneration } from "../../../lib/report-platform/report-generation";
import { getReportPlatformRepository } from "../../../lib/report-platform/repository";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const provider = getPaymentProvider();
    if (provider.name !== "stripe") throw new Error("The Stripe webhook is not enabled.");
    const event = await provider.verifyWebhook({ body, signature });
    const repository = await getReportPlatformRepository();
    let order = await repository.getOrder(event.orderId);
    if (!order || !order.priceSnapshot?.totalCents) throw new Error("The paid order could not be found.");
    const expectedTotalCents = order.priceSnapshot.totalCents;
    const result = await repository.addPaymentEvent({
      providerEventId: event.providerEventId,
      orderId: event.orderId,
      provider: provider.name,
      eventType: event.eventType,
      verified: event.verified,
      safeMetadata: event.safeMetadata,
      processingStatus: "received",
      idempotencyKey: event.providerEventId,
      createdAt: new Date().toISOString(),
    });
    if (result === "duplicate") return Response.json({ received: true, duplicate: true });

    if (event.eventType === "refund_succeeded" || event.eventType === "partial_refund_succeeded") {
      order.paymentStatus = event.eventType === "refund_succeeded" ? "refunded" : "partially_refunded";
      order.updatedAt = new Date().toISOString();
      await repository.saveOrder(order);
      if (["completed", "approved_for_release"].includes(order.status)) {
        await repository.transitionOrder(order.id, event.eventType === "refund_succeeded" ? "refunded" : "partially_refunded", "stripe", { providerEventId: event.providerEventId });
      }
      return Response.json({ received: true });
    }
    if (order.status !== "awaiting_payment") throw new Error("The order is not awaiting payment.");
    order = await repository.transitionOrder(order.id, "payment_processing", "stripe", { providerEventId: event.providerEventId });
    if (event.eventType === "checkout_expired") {
      order.paymentStatus = "expired";
      order.updatedAt = new Date().toISOString();
      await repository.saveOrder(order);
      await repository.transitionOrder(order.id, "payment_expired", "stripe");
      return Response.json({ received: true });
    }
    if (event.eventType === "payment_failed") {
      order.paymentStatus = "failed";
      order.updatedAt = new Date().toISOString();
      await repository.saveOrder(order);
      await repository.transitionOrder(order.id, "awaiting_payment", "stripe", { recoverable: true });
      return Response.json({ received: true });
    }
    if (event.amountCents !== expectedTotalCents) throw new Error("Verified Stripe payment amount does not match the frozen order total.");
    order.paymentStatus = "paid";
    order.updatedAt = new Date().toISOString();
    await repository.saveOrder(order);
    await repository.transitionOrder(order.id, "paid", "stripe", { providerEventId: event.providerEventId });
    const job = await createQueuedMockReportJob(order.id);
    after(async () => {
      try {
        await runMockReportGeneration(order.id, job.id);
      } catch (error) {
        console.error("[report-generation] Paid report generation failed", error);
      }
    });
    return Response.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] Rejected event", error);
    return Response.json({ error: "Webhook rejected." }, { status: 400 });
  }
}
