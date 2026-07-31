import { after } from "next/server";
import { getPaymentProvider } from "../../../lib/report-platform/payment-provider";
import {
  createQueuedMockReportJob,
  runMockReportGeneration,
} from "../../../lib/report-platform/report-generation";
import { getReportPlatformRepository } from "../../../lib/report-platform/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; outcome?: "success" | "failed" | "expired" };
    if (!body.token || !["success", "failed", "expired"].includes(body.outcome ?? "")) throw new Error("A valid mock payment outcome is required.");
    const provider = getPaymentProvider();
    if (provider.name !== "mock") throw new Error("Mock checkout is disabled.");
    const event = await provider.verifyWebhook({ body: JSON.stringify({ outcome: body.outcome }), signature: body.token });
    const repository = await getReportPlatformRepository();
    let order = await repository.getOrder(event.orderId);
    if (!order || !order.priceSnapshot?.totalCents) throw new Error("The mock order could not be found.");
    const expectedAmountCents = order.priceSnapshot.totalCents;
    const eventResult = await repository.addPaymentEvent({
      providerEventId: event.providerEventId,
      orderId: event.orderId,
      provider: provider.name,
      eventType: event.eventType,
      verified: event.verified,
      safeMetadata: event.safeMetadata,
      processingStatus: "generation_queued",
      idempotencyKey: event.providerEventId,
      createdAt: new Date().toISOString(),
    });
    if (eventResult === "duplicate") {
      const paidOrderId = order.id;
      const existingJobs = await repository.listReportJobs(paidOrderId);
      const existingJob = existingJobs[0] ?? (
        order.paymentStatus === "paid"
          ? await createQueuedMockReportJob(paidOrderId)
          : null
      );
      if (existingJob?.status === "queued") {
        after(async () => {
          try {
            await runMockReportGeneration(paidOrderId, existingJob.id);
          } catch (error) {
            console.error("[report-generation] Queued mock report failed", error);
          }
        });
      }
      return Response.json({ duplicate: true, jobId: existingJob?.id ?? null });
    }
    if (order.status !== "awaiting_payment") throw new Error("The order is not awaiting payment.");
    order = await repository.transitionOrder(order.id, "payment_processing", "mock_payment_provider");
    if (event.eventType === "checkout_expired") {
      order.paymentStatus = "expired";
      order.updatedAt = new Date().toISOString();
      await repository.saveOrder(order);
      await repository.transitionOrder(order.id, "payment_expired", "mock_payment_provider");
      return Response.json({ outcome: "expired" });
    }
    if (event.eventType === "payment_failed") {
      order.paymentStatus = "failed";
      order.updatedAt = new Date().toISOString();
      await repository.saveOrder(order);
      await repository.transitionOrder(order.id, "awaiting_payment", "mock_payment_provider", { recoverable: true });
      return Response.json({ outcome: "failed", recoverable: true });
    }
    if (event.amountCents !== expectedAmountCents) throw new Error("Verified payment amount does not match the frozen price snapshot.");
    order.paymentStatus = "paid";
    order.updatedAt = new Date().toISOString();
    await repository.saveOrder(order);
    await repository.transitionOrder(order.id, "paid", "mock_payment_provider", { providerEventId: event.providerEventId });
    const job = await createQueuedMockReportJob(order.id);
    after(async () => {
      try {
        await runMockReportGeneration(order.id, job.id);
      } catch (error) {
        console.error("[report-generation] Queued mock report failed", error);
      }
    });
    return Response.json({
      outcome: "success",
      jobId: job.id,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Mock payment could not be processed." }, { status: 400 });
  }
}
