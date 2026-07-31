# FRC planning-report AI hand-off

The report platform currently uses a deterministic mock provider. It prepares and persists the same structured input/output package expected by a future OpenAI-backed adapter, but it does not send client data or files to OpenAI.

## Where the API belongs

Keep the OpenAI call server-side. The provider boundary is:

`app/lib/report-platform/report-ai-provider.ts`

A future OpenAI adapter should:

1. Implement the existing `ReportAiProvider` interface.
2. Accept only the versioned `FrcReportGenerationInputV1` package.
3. Use structured outputs matching `FRC_REPORT_SCHEMA_V1`.
4. Store the provider, model, prompt and schema versions with each job.
5. Validate citations and evidence status before persisting each section.
6. Preserve `missing`, `unavailable`, `conflict` and `requires professional review` states instead of guessing.
7. Send every completed report order to the configured FRC architect notification address.
8. Keep professionally verified and council-readiness reports blocked until an authorised reviewer approves release.

Never put the API key in a React component, browser request, report JSON, Git history or public file.

## Server environment names

For local development, copy `.env.example` to the ignored `.env.local` file and replace only the server-side placeholders. The future adapter should read:

```env
OPENAI_API_KEY=sk-proj-your-real-key
REPORT_AI_PROVIDER=openai
REPORT_AI_MODEL=your-approved-model
REPORT_AI_ENABLED=false
```

Do not put a real key in `.env.example`. Keep `REPORT_AI_ENABLED=false` until the OpenAI provider implementation, structured-output validation, privacy review, cost controls and report evals have passed. The current code fails safely if production is selected before a real provider exists.

For the hosted site, configure the same values as private runtime environment variables in the hosting control plane. Never prefix these names with `NEXT_PUBLIC_`.

## Prepared report templates

`app/lib/planning-simulation/report-templates.ts` builds four templates:

- preliminary property-planning report;
- architect planning and design handover;
- council-submission readiness report;
- tailored planning-scope brief.

Every template includes the 32-section core structure, property identity, source provenance, planning framework, LEP and DCP controls, site analysis, environmental screening, title and services, document review, development-item assessments, missing information, risk register, recommendations, architect verification, disclaimer and appendices.

Item-specific sections come from `app/lib/planning-simulation/development-items.ts`. Combined projects receive a combined-site section; alternatives receive an options-comparison section. Council reports receive drawing-compliance and submission-checklist sections.

## Safety contract

OpenAI may draft and explain. It may not:

- match an address;
- determine Lot/DP, land area, council, zoning or mapped controls;
- calculate or alter pricing;
- add a development item from client notes;
- convert an unavailable source into a negative finding;
- approve a report for client release;
- send a report directly to a client.

All completed orders create an architect notification. Any report sold as FRC verified or council-ready also requires the recorded human approval step before client release.
