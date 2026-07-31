# FRC report platform implementation plan

## Existing architecture

The site is a Next.js 16 App Router application using React 19, TypeScript, Drizzle SQLite/D1 schema definitions, server route handlers, an existing NSW site-analysis route, Resend email code and a server-side multi-provider AI boundary. The planning simulator already has a seven-step FRC-branded wizard, a development-item catalogue, deterministic pricing route, source registry and report-template scaffolding.

The previous planning workflow had three material gaps: document upload storage was deliberately disabled, scope confirmation returned a browser-held data pack instead of a persistent order, and the report/payment lifecycle did not exist.

## Files changed

- `app/components/planning-simulation-wizard.tsx`: premium fees, document availability, per-document uploads, checkout review and consent capture.
- `app/globals.css`: upload, checkout, status, report, print and internal-review layouts.
- `app/lib/planning-simulation/*`: versioned pricing, document catalogue and expanded report templates.
- `db/schema.ts`: persistent report-platform tables.
- `.env.example`, `README.md` and report-platform documentation.

## New platform modules and routes

- `app/lib/report-platform/*`: business configuration, readiness checks, repository, private storage, malware-scanner boundary, payment adapter, report-AI adapter, workflow transitions, report generation, notifications and evidence coverage.
- `/api/planning-simulation/orders/*`: draft order, immutable order confirmation and checkout.
- `/api/planning-simulation/documents/*`: authenticated private upload, read and removal.
- `/api/planning-simulation/mock-payment`: verified test payment events.
- `/api/planning-simulation/status/*` and `/api/planning-simulation/reports/*`: secure persistent status and report access.
- `/mock-checkout/*`, `/report-status/*` and `/planning-report/*`: complete client test journey.
- `/admin/report-reviews` and `/admin/report-platform-readiness`: protected operational surfaces.

## Database changes

The migration introduces report orders, order events, documents, payment events, report jobs, report sections, final planning reports and notifications. Every record uses explicit identifiers, timestamps, indexes and foreign keys. Provider event IDs and idempotency keys are unique. Price snapshots are stored as immutable JSON with their pricing version and input hash.

Local test mode uses an ignored SQLite database so a real order survives refresh and server restart. Hosted production uses the bound D1 database through the same repository contract. The migration bundle is deployed with the site and still requires a post-deployment binding/migration check before live provider activation.

## Pricing architecture

`FRC_REPORT_PRICING_2026_01` is the only pricing source. All amounts are integer cents. Each billable development item has an explicit mapping; categories are filters only. The server applies document-analysis upgrades, the once-only A$350 coordination fee, professional and council minimum engagements and tailored-quotation rules. Browser totals are ignored when the order snapshot is frozen.

## Upload architecture

Each selected document category expands in place and blocks progression until at least one file succeeds. Local test files use ignored private filesystem storage; hosted files use the private `PROJECT_FILES` R2 binding. Metadata alone is persisted in D1. File validation covers extension, reported MIME, signature, size, category limits, order limit, safe filenames and SHA-256. Authenticated access uses an order token hash. A real malware-scanning provider remains a production launch requirement.

## Payment-provider boundary

`PaymentProvider` supports checkout creation, webhook verification, payment retrieval and optional refunds. `MockPaymentProvider` creates a signed, expiring test checkout. Report generation starts only after the server verifies and persists a payment event. `UnconfiguredPaymentProvider` fails safely and live mode stays disabled.

## AI-provider boundary

`ReportAiProvider` supports section generation, validation and report synthesis. `MockReportAiProvider` produces deterministic schema-valid sections and never asserts unsupported planning facts. `UnconfiguredReportAiProvider` fails safely. The structured input package excludes payment-card data and contains the frozen price, evidence register, missing documents, report template and professional-review requirement.

## Report templates

Four versioned FRC templates share a 32-part report structure, item-specific sections and deterministic registers. The web report uses the FRC visual system and print-ready A4 CSS. A production PDF renderer remains an adapter and launch requirement; local testing uses browser Print / Save as PDF.

## Professional review and notifications

Paid verification, council-readiness and safety escalations route to the protected review queue. AI-only reports complete after automated validation. Reviewed reports cannot be released until an authorised reviewer records their name, role and notes. Notification records survive delivery failure; local mode logs them through a mock provider.

## Testing strategy

Unit tests cover pricing rules, missing price mappings, minimums, tailored scopes, status transitions, upload validation and mock AI safety. Integration tests exercise server-owned pricing and order workflow boundaries. Production build, lint and responsive browser checks cover desktop, mobile, upload panels, checkout, status and print-report overflow.
