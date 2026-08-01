import type { TaxTreatment } from "../planning-simulation/types";

export type PlatformMode = "test" | "production";

export type PlatformDataBackend = "node" | "cloudflare" | "supabase";

export function getPlatformMode(): PlatformMode {
  if (process.env.FRC_PLATFORM_MODE === "production") return "production";
  if (process.env.FRC_PLATFORM_MODE === "test") return "test";
  return process.env.NODE_ENV === "production" ? "production" : "test";
}

/** Business mode and hosting runtime are deliberately separate. */
export function getPlatformDataBackend(): PlatformDataBackend {
  if (process.env.FRC_DATA_BACKEND === "supabase") return "supabase";
  if (process.env.FRC_DATA_BACKEND === "cloudflare") return "cloudflare";
  if (process.env.FRC_DATA_BACKEND === "node") return "node";
  return process.env.CF_PAGES || process.env.CLOUDFLARE_WORKERS
    ? "cloudflare"
    : "node";
}

const configuredUrl = (value: string | undefined) => {
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    return "";
  }
};

export function getBusinessConfiguration() {
  const gstSetting = process.env.FRC_GST_REGISTERED;
  const taxTreatment: TaxTreatment =
    gstSetting === "true"
      ? "aud_including_gst"
      : gstSetting === "false"
        ? "gst_not_applicable"
        : "unconfigured_test_only";
  return {
    legalName: process.env.FRC_BUSINESS_LEGAL_NAME ?? "",
    tradingName: process.env.FRC_TRADING_NAME ?? "FRC Design & Construction",
    abn: process.env.FRC_ABN ?? "",
    gstRegistered: gstSetting === "true" ? true : gstSetting === "false" ? false : null,
    taxTreatment,
    currency: "AUD" as const,
    businessEmail: process.env.FRC_BUSINESS_EMAIL ?? "",
    headArchitectEmail: process.env.HEAD_ARCHITECT_EMAIL ?? "frcdesignconstruction@gmail.com",
    termsUrl: configuredUrl(process.env.FRC_TERMS_URL),
    privacyUrl: configuredUrl(process.env.FRC_PRIVACY_URL),
    refundPolicyUrl: configuredUrl(process.env.FRC_REFUND_POLICY_URL),
    reportLimitationsUrl: configuredUrl(process.env.FRC_REPORT_LIMITATIONS_URL),
    reviewerName: process.env.FRC_REVIEWER_NAME ?? "",
    reviewerRole: process.env.FRC_REVIEWER_ROLE ?? "",
    reviewerRegistrationJurisdiction: process.env.FRC_REVIEWER_REGISTRATION_JURISDICTION ?? "",
    reviewerRegistrationNumber: process.env.FRC_REVIEWER_REGISTRATION_NUMBER ?? "",
    clientBaseUrl: configuredUrl(process.env.FRC_CLIENT_BASE_URL),
  };
}

export type ReadinessCheck = {
  code: string;
  label: string;
  status: "ready" | "configured_unverified" | "mock_only" | "missing" | "unsafe_for_production";
  detail: string;
};

export function getProductionReadiness(): {
  livePaymentsAllowed: boolean;
  liveAiAllowed: boolean;
  checks: ReadinessCheck[];
} {
  const business = getBusinessConfiguration();
  const backend = getPlatformDataBackend();
  const durableDatabaseConfigured = backend === "cloudflare" || (
    backend === "supabase" && Boolean(process.env.SUPABASE_DATABASE_URL)
  );
  const durableStorageConfigured = backend === "cloudflare" || (
    backend === "supabase" && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
  const checks: ReadinessCheck[] = [
    { code: "database", label: "Database connection and migrations", status: durableDatabaseConfigured ? "configured_unverified" : "mock_only", detail: backend === "cloudflare" ? "Cloudflare D1 is selected; verify bindings, migrations and backups." : backend === "supabase" ? (durableDatabaseConfigured ? "Supabase Postgres is selected; schema creates automatically on first server connection." : "Supabase is selected but SUPABASE_DATABASE_URL is missing.") : "Node SQLite fallback is selected. Durable production retention still requires Supabase, D1 or another durable adapter." },
    { code: "private_storage", label: "Private document storage", status: durableStorageConfigured ? "configured_unverified" : "mock_only", detail: backend === "cloudflare" ? "Private R2 is selected; verify retention and malware-scanning controls." : backend === "supabase" ? (durableStorageConfigured ? "Private Supabase Storage is selected; verify retention and malware-scanning controls." : "Supabase is selected but its URL or server-only service-role key is missing.") : "Node private-storage fallback is selected. Durable production uploads still require Supabase Storage, R2 or another durable store." },
    { code: "upload_signing", label: "Authenticated file access", status: process.env.FILE_SIGNING_SECRET ? "configured_unverified" : "missing", detail: process.env.FILE_SIGNING_SECRET ? "Signing secret is present but not externally verified." : "FILE_SIGNING_SECRET is missing." },
    { code: "malware", label: "Malware scanning provider", status: "missing", detail: "No real production malware-scanner adapter is implemented. Mock screening is local-test-only and cannot satisfy launch readiness." },
    { code: "email", label: "Email provider", status: process.env.RESEND_API_KEY ? "configured_unverified" : "mock_only", detail: process.env.RESEND_API_KEY ? "Resend credential present; sending domain must be verified." : "Development notification logger only." },
    { code: "head_architect", label: "Head architect email", status: business.headArchitectEmail ? "ready" : "missing", detail: business.headArchitectEmail ? "Configured." : "HEAD_ARCHITECT_EMAIL is missing." },
    { code: "payment", label: "Payment provider", status: process.env.PAYMENT_PROVIDER === "stripe" && Boolean(process.env.STRIPE_SECRET_KEY) ? "configured_unverified" : "mock_only", detail: process.env.PAYMENT_PROVIDER === "stripe" && process.env.STRIPE_SECRET_KEY ? "Stripe Checkout is selected; run a verified test payment before launch." : "Mock payment provider only." },
    { code: "payment_webhook", label: "Payment webhook secret", status: process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET ? "configured_unverified" : "missing", detail: process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET ? "Present but unverified. Configure Stripe to POST to /api/payments/webhook." : "STRIPE_WEBHOOK_SECRET is missing." },
    { code: "payment_live", label: "Payment live mode", status: process.env.PAYMENTS_LIVE_ENABLED === "true" ? "unsafe_for_production" : "ready", detail: process.env.PAYMENTS_LIVE_ENABLED === "true" ? "Live payments must remain disabled until all checks pass." : "Live payments are disabled." },
    { code: "ai", label: "Report AI provider", status: process.env.REPORT_AI_PROVIDER === "openai" && process.env.REPORT_AI_ENABLED === "true" && Boolean(process.env.REPORT_AI_API_KEY || process.env.OPENAI_API_KEY) ? "configured_unverified" : "mock_only", detail: process.env.REPORT_AI_PROVIDER === "openai" && process.env.REPORT_AI_ENABLED === "true" ? "OpenAI report generation is enabled; complete staging evidence, cost and professional-review validation." : "Deterministic mock report generation is enabled." },
    { code: "document_ai", label: "Document relevance AI", status: process.env.DOCUMENT_AI_PROVIDER === "openai" && process.env.DOCUMENT_AI_ENABLED === "true" && process.env.DOCUMENT_AI_REQUIRED === "true" && Boolean(process.env.OPENAI_API_KEY || process.env.REPORT_AI_API_KEY) ? "configured_unverified" : "mock_only", detail: process.env.DOCUMENT_AI_ENABLED === "true" ? "Document AI is enabled; verify it only receives malware-cleared files and test false-positive handling." : "Document relevance AI is disabled and cannot block wrong uploads." },
    { code: "architectural_images", label: "Architectural visualisation provider", status: process.env.ARCHITECTURAL_IMAGE_PROVIDER && process.env.ARCHITECTURAL_IMAGE_PROVIDER !== "mock" ? "configured_unverified" : "mock_only", detail: process.env.ARCHITECTURAL_IMAGE_ENABLED === "true" ? "A live visual provider was enabled and requires output validation before launch." : "Deterministic mock visualisation provider only; live generation is disabled." },
    { code: "architectural_images_live", label: "Architectural visualisation live mode", status: process.env.ARCHITECTURAL_IMAGE_ENABLED === "true" ? "unsafe_for_production" : "ready", detail: process.env.ARCHITECTURAL_IMAGE_ENABLED === "true" ? "Keep live architectural images disabled until credentials, storage, moderation and review are verified." : "Live architectural image generation is disabled." },
    { code: "renderer", label: "PDF and ZIP renderer", status: "ready", detail: "Server-side PDF and ZIP generation is installed; production load and large-archive tests remain required." },
    { code: "legal_name", label: "Business legal name", status: business.legalName ? "ready" : "missing", detail: business.legalName ? "Configured." : "FRC_BUSINESS_LEGAL_NAME is missing." },
    { code: "abn", label: "ABN", status: /^\d{11}$/.test(business.abn.replace(/\s/g, "")) ? "ready" : "missing", detail: business.abn ? "ABN format must be confirmed." : "FRC_ABN is missing." },
    { code: "gst", label: "GST configuration", status: business.gstRegistered === null ? "missing" : "ready", detail: business.gstRegistered === null ? "FRC_GST_REGISTERED must be explicitly true or false." : "Configured." },
    ...([
      ["terms", "Terms URL", business.termsUrl],
      ["privacy", "Privacy URL", business.privacyUrl],
      ["refunds", "Refund-policy URL", business.refundPolicyUrl],
      ["limitations", "Report-limitations URL", business.reportLimitationsUrl],
      ["client_url", "Client base URL", business.clientBaseUrl],
    ] as const).map(([code, label, value]) => ({ code, label, status: value ? "ready" as const : "missing" as const, detail: value ? "Configured." : `${label} is missing.` })),
    { code: "reviewer", label: "Reviewer configuration", status: business.reviewerName && business.reviewerRole ? "configured_unverified" : "missing", detail: business.reviewerName && business.reviewerRole ? "Reviewer details present; legal title and registration must be verified." : "Reviewer name and role are incomplete." },
  ];
  const paymentRequired = ["database", "private_storage", "upload_signing", "malware", "document_ai", "email", "head_architect", "payment", "payment_webhook", "legal_name", "abn", "gst", "terms", "privacy", "refunds", "limitations", "client_url"];
  const aiRequired = ["database", "private_storage", "malware", "document_ai", "ai", "architectural_images", "renderer", "legal_name", "gst", "limitations"];
  const ready = (codes: string[]) => codes.every((code) => checks.find((check) => check.code === code)?.status === "ready");
  return {
    livePaymentsAllowed: process.env.PAYMENTS_LIVE_ENABLED === "true" && ready(paymentRequired),
    liveAiAllowed: process.env.REPORT_AI_ENABLED === "true" && ready(aiRequired),
    checks,
  };
}
