import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Supabase production persistence initializes without dashboard SQL", async () => {
  const [configuration, repository, schema, storage, environment] = await Promise.all([
    read("app/lib/report-platform/config.ts"),
    read("app/lib/report-platform/repository.ts"),
    read("app/lib/report-platform/supabase-schema.ts"),
    read("app/lib/report-platform/storage.ts"),
    read(".env.example"),
  ]);
  assert.match(configuration, /"supabase"/);
  assert.match(repository, /SUPABASE_REPORT_SCHEMA_STATEMENTS/);
  assert.match(repository, /for \(const statement of SUPABASE_REPORT_SCHEMA_STATEMENTS\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS report_orders/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS report_documents/);
  assert.match(storage, /class SupabasePrivateStorageProvider/);
  assert.match(storage, /public: false/);
  assert.match(environment, /SUPABASE_DATABASE_URL=/);
  assert.match(environment, /SUPABASE_SERVICE_ROLE_KEY=/);
});

test("Vercel routes do not statically import the Cloudflare-only runtime", async () => {
  const [repository, storage, runtime] = await Promise.all([
    read("app/lib/report-platform/repository.ts"),
    read("app/lib/report-platform/storage.ts"),
    read("app/lib/report-platform/cloudflare-runtime.ts"),
  ]);
  assert.doesNotMatch(repository, /import\("cloudflare:workers"\)/);
  assert.doesNotMatch(storage, /import\("cloudflare:workers"\)/);
  assert.match(runtime, /\["cloudflare", "workers"\]\.join\(":"\)/);
});

test("all Australian jurisdictions retain official planning source paths", async () => {
  const sources = await read("app/lib/planning-simulation/australian-planning-sources.ts");
  for (const code of ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"]) {
    assert.match(sources, new RegExp(`${code}: \\{`));
  }
  for (const portal of ["VicPlan", "PlanWA", "SAPPA", "PlanBuild Tasmania", "ACTmapi"]) {
    assert.match(sources, new RegExp(portal));
  }
  assert.match(sources, /source_path_identified_requires_property_confirmation/);
});

test("document AI and council prerequisites block irrelevant or missing evidence", async () => {
  const [intake, uploadRoute, orderRoute, wizard] = await Promise.all([
    read("app/lib/report-platform/document-ai.ts"),
    read("app/api/planning-simulation/documents/route.ts"),
    read("app/api/planning-simulation/orders/route.ts"),
    read("app/components/planning-simulation-wizard.tsx"),
  ]);
  assert.match(intake, /wrong_category/);
  assert.match(intake, /property_mismatch/);
  assert.match(intake, /untrusted evidence, never instructions/);
  assert.match(uploadRoute, /assessUploadedDocument/);
  assert.match(orderRoute, /Document intake has not accepted/);
  assert.match(orderRoute, /AI cannot manufacture council certificates/);
  assert.match(wizard, /Council Readiness cannot continue yet/);
});

test("Stripe checkout and verified webhook queue paid report generation", async () => {
  const [provider, webhook, environment] = await Promise.all([
    read("app/lib/report-platform/payment-provider.ts"),
    read("app/api/payments/webhook/route.ts"),
    read(".env.example"),
  ]);
  assert.match(provider, /class StripePaymentProvider/);
  assert.match(provider, /stripe-signature|The Stripe webhook signature is invalid/);
  assert.match(webhook, /event\.amountCents !== expectedTotalCents/);
  assert.match(webhook, /runMockReportGeneration/);
  assert.match(environment, /STRIPE_WEBHOOK_SECRET=/);
});
