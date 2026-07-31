# FRC report platform implementation plan

This plan records the completed phased implementation and the remaining production-only integrations. It does not authorise live payment or live AI credentials.

## Phase 1 — completed

- Inspected the Next.js 16/React 19 repository and preserved existing site functionality.
- Added report-platform D1/SQLite schemas and migrations for orders, events, documents, payments, jobs, sections, final reports, notifications, references, disputes and review records.
- Added the 15-product catalogue and foundation launch pricing `FRC_REPORT_PRICING_2026_02`.
- Added customer type, decision objective, report recommendation/selection and transparent price interfaces.
- Aligned compatibility pricing to the A$695 core, A$2,195 reviewed minimum and A$3,500 council minimum.

## Phase 2 — completed

- Added SSRF-safe reference URLs, written briefs and secure uploaded references.
- Added authenticated private uploads, type/signature/hash/limit checks and server register reconciliation.
- Fixed the uploaded-file Continue race and removal busy/error state.
- Added official NSW property research persistence, mapped/client area separation, conflict handling and indicative boundary rules.
- Added server-owned order/payment/job transitions, idempotent confirmation/checkout and queued post-payment generation.
- Added polling status and protected professional-review pages.

## Phase 3 — completed

- Added `FRC_REPORT_GENERATION_INPUT_V2`, `FRC_REPORT_SCHEMA_V2`, frozen template snapshots and source register.
- Defined the 25 common sections plus the complete report-specific section set for every catalogue report.
- Added deterministic mock generation using trusted online facts, scoped document facts, references and client motivation.
- Added schema/template/order/evidence/source/retrieval-date/prohibited-claim validation.

## Phase 4 — completed

- Added server-only concept-visual provider and mock boundary.
- Added concept, before/after, constraint, comparison, plumbing and services schemas.
- Added deterministic SVG/PDF-native visual explanations and safety validation.
- Routed asserted sensitive visuals to human review and preserved unknown/service limitations.

## Phase 5 — completed

- Added secure web reports, combined PDF, one frozen-template PDF per selected report and ZIP report packs.
- Added source/document/risk/action schedules, accepted visuals, review/council records and a consistent manifest.
- Added explicit opt-in clean client-upload copies; default remains excluded.
- Added idempotent mock completion email, notification records and section-specific dispute workflow.
- Added production readiness checks and fail-closed provider boundaries.

## Phase 6 — verification

Run and record:

```powershell
npx tsc --noEmit
npm run lint
node --test --test-isolation=none
npm run build
npm run db:verify
```

Fix introduced errors before handoff. Keep all live provider flags disabled.

## Remaining production integrations

- business/legal/GST/refund confirmation;
- deployed D1 migration and backup verification;
- R2 retention/access verification;
- malware scanner;
- production email/domain;
- live payment adapter and secrets;
- live OpenAI adapter, model selection, privacy review, cost limits and evals;
- optional live image provider;
- identity-aware administrator/reviewer access;
- final realistic report visual QA and large-pack load testing.
