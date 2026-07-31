import { getPlatformMode } from "./config";

export type CheckoutSessionInput = {
  orderId: string;
  totalCents: number;
  currency: "AUD";
  idempotencyKey: string;
  returnBaseUrl: string;
};

export type CheckoutSessionResult = {
  provider: string;
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string;
  mode: "test" | "live";
};

export type VerifiedPaymentEvent = {
  providerEventId: string;
  orderId: string;
  eventType: "payment_succeeded" | "payment_failed" | "checkout_expired" | "refund_succeeded" | "partial_refund_succeeded";
  verified: boolean;
  amountCents: number;
  safeMetadata: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhook(input: { body: string; signature: string }): Promise<VerifiedPaymentEvent>;
  retrievePayment(input: { providerPaymentId: string }): Promise<Record<string, unknown>>;
  createRefund?(input: { orderId: string; amountCents?: number }): Promise<Record<string, unknown>>;
}

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function sign(payload: string) {
  const secret = process.env.PAYMENT_MOCK_SECRET || "frc-local-test-payment-secret-not-for-production";
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function createMockPaymentToken(input: {
  orderId: string;
  sessionId: string;
  amountCents: number;
  expiresAt: string;
}) {
  const payload = base64Url(encoder.encode(JSON.stringify(input)));
  return `${payload}.${await sign(payload)}`;
}

export async function verifyMockPaymentToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || await sign(payload) !== signature) throw new Error("Invalid mock checkout token.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    orderId: string;
    sessionId: string;
    amountCents: number;
    expiresAt: string;
  };
  if (new Date(data.expiresAt).getTime() < Date.now()) throw new Error("Mock checkout has expired.");
  return data;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckoutSession(input: CheckoutSessionInput) {
    const sessionId = `mock_checkout_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const token = await createMockPaymentToken({ orderId: input.orderId, sessionId, amountCents: input.totalCents, expiresAt });
    return {
      provider: this.name,
      sessionId,
      checkoutUrl: `${input.returnBaseUrl}/mock-checkout/${encodeURIComponent(sessionId)}#token=${token}`,
      expiresAt,
      mode: "test" as const,
    };
  }

  async verifyWebhook(input: { body: string; signature: string }) {
    const tokenData = await verifyMockPaymentToken(input.signature);
    const body = JSON.parse(input.body) as { outcome?: string };
    const eventType: VerifiedPaymentEvent["eventType"] =
      body.outcome === "success"
        ? "payment_succeeded"
        : body.outcome === "expired"
          ? "checkout_expired"
          : "payment_failed";
    return {
      providerEventId: `mock_event_${tokenData.sessionId}_${eventType}`,
      orderId: tokenData.orderId,
      eventType,
      verified: true,
      amountCents: tokenData.amountCents,
      safeMetadata: { sessionId: tokenData.sessionId, testMode: true },
    };
  }

  async retrievePayment(input: { providerPaymentId: string }) {
    return { provider: this.name, id: input.providerPaymentId, mode: "test" };
  }

  async createRefund(input: { orderId: string; amountCents?: number }) {
    return { provider: this.name, orderId: input.orderId, amountCents: input.amountCents ?? null, mode: "test" };
  }
}

export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "unconfigured";
  async createCheckoutSession(): Promise<CheckoutSessionResult> {
    throw new Error("Live payment checkout is not configured.");
  }
  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new Error("Live payment webhook verification is not configured.");
  }
  async retrievePayment(): Promise<Record<string, unknown>> {
    throw new Error("Live payment retrieval is not configured.");
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (getPlatformMode() === "test" && process.env.PAYMENTS_LIVE_ENABLED !== "true") {
    return new MockPaymentProvider();
  }
  return new UnconfiguredPaymentProvider();
}
