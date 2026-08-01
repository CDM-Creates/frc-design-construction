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

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY is missing or invalid.");
  return key;
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const stripeError = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : {};
    throw new Error(typeof stripeError.message === "string" ? stripeError.message : `Stripe request failed (${response.status}).`);
  }
  return payload;
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createCheckoutSession(input: CheckoutSessionInput) {
    if (!Number.isInteger(input.totalCents) || input.totalCents < 50) throw new Error("The Stripe amount is invalid.");
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 30 * 60;
    const form = new URLSearchParams({
      mode: "payment",
      client_reference_id: input.orderId,
      success_url: `${input.returnBaseUrl}/simulator?payment=success&orderId=${encodeURIComponent(input.orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.returnBaseUrl}/simulator?payment=cancelled&orderId=${encodeURIComponent(input.orderId)}`,
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(input.totalCents),
      "line_items[0][price_data][product_data][name]": "FRC planning report package",
      "line_items[0][quantity]": "1",
      "metadata[orderId]": input.orderId,
      "payment_intent_data[metadata][orderId]": input.orderId,
      expires_at: String(expiresAtSeconds),
    });
    const session = await stripeRequest("/checkout/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": input.idempotencyKey },
      body: form,
    });
    if (typeof session.id !== "string" || typeof session.url !== "string") throw new Error("Stripe did not return a checkout URL.");
    return {
      provider: this.name,
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(Number(session.expires_at ?? expiresAtSeconds) * 1000).toISOString(),
      mode: (stripeSecretKey().startsWith("sk_live_") ? "live" : "test") as "live" | "test",
    };
  }

  async verifyWebhook(input: { body: string; signature: string }) {
    const secret = (process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET)?.trim() ?? "";
    if (!secret.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET is missing or invalid.");
    const fields = input.signature.split(",").map((part) => part.split("=", 2));
    const timestamp = fields.find(([key]) => key === "t")?.[1] ?? "";
    const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
    if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("The Stripe webhook timestamp is invalid or expired.");
    const expected = await hmacHex(secret, `${timestamp}.${input.body}`);
    if (!signatures.some((signature) => constantTimeEqual(signature, expected))) throw new Error("The Stripe webhook signature is invalid.");
    const event = JSON.parse(input.body) as { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
    const object = event.data?.object ?? {};
    const metadata = object.metadata && typeof object.metadata === "object" ? object.metadata as Record<string, unknown> : {};
    const orderId = String(metadata.orderId ?? object.client_reference_id ?? "");
    if (!event.id || !orderId) throw new Error("The verified Stripe event does not identify an FRC order.");
    const eventType: VerifiedPaymentEvent["eventType"] =
      event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded"
        ? "payment_succeeded"
        : event.type === "checkout.session.expired"
          ? "checkout_expired"
          : event.type === "charge.refunded"
            ? Number(object.amount_refunded ?? 0) < Number(object.amount ?? 0) ? "partial_refund_succeeded" : "refund_succeeded"
            : "payment_failed";
    return {
      providerEventId: event.id,
      orderId,
      eventType,
      verified: true,
      amountCents: Number(object.amount_total ?? object.amount ?? object.amount_refunded ?? 0),
      safeMetadata: { stripeEventType: event.type ?? "unknown", objectId: object.id ?? null, paymentStatus: object.payment_status ?? null },
    };
  }

  async retrievePayment(input: { providerPaymentId: string }) {
    return stripeRequest(`/checkout/sessions/${encodeURIComponent(input.providerPaymentId)}`);
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENTS_LIVE_ENABLED !== "true") {
    return new MockPaymentProvider();
  }
  if (process.env.PAYMENT_PROVIDER === "stripe") return new StripePaymentProvider();
  return new UnconfiguredPaymentProvider();
}
