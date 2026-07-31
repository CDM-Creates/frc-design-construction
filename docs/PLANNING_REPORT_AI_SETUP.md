# FRC planning-report AI hand-off

The platform currently uses a deterministic mock provider. It prepares and persists the same structured input/output package expected by a future OpenAI-backed adapter, but it does not send client data or files to OpenAI.

## Provider boundary

Keep every OpenAI call server-side in `app/lib/report-platform/report-ai-provider.ts`. A future adapter must:

1. Implement the existing `ReportAiProvider` interface.
2. Accept only `FrcReportGenerationInputV2` / `FRC_REPORT_GENERATION_INPUT_V2`.
3. Use structured outputs matching `FRC_REPORT_SCHEMA_V2`.
4. Preserve frozen template `FRC_REPORT_TEMPLATES_2026_02` and prompt `FRC_REPORT_PROMPTS_2026_02` metadata.
5. Store provider, model, prompt and schema versions with every job.
6. Validate citations and evidence status before persisting each section.
7. Preserve `missing`, `unavailable`, `conflict`, `lookup_failed` and `requires professional review` states instead of guessing.
8. Keep professionally verified and council-readiness reports blocked until an authorised reviewer approves release.

Never put the API key in a React component, browser request, report JSON, Git history or public file.

## Server environment

For local development, copy `.env.example` to ignored `.env.local` and replace only server-side placeholders:

```env
OPENAI_API_KEY=sk-proj-your-real-key
REPORT_AI_PROVIDER=openai
REPORT_AI_MODEL=your-approved-model
REPORT_AI_ENABLED=false
```

Do not put a real key in `.env.example`. Keep `REPORT_AI_ENABLED=false` until the provider, structured-output validation, privacy review, cost controls and report evals pass. Hosted values must be private runtime variables and must never use the `NEXT_PUBLIC_` prefix.

## Prepared templates

`app/lib/report-platform/report-template-registry.ts` defines one fixed template for each of the 15 catalogue reports. All templates contain the 25-section FRC evidence baseline plus the complete report-specific section set. Development reports add concept, constraint and services visualisation modules. Conditional modules cover large sites, purchased document analysis, professional review records and council readiness.

Every order freezes selected template IDs, names, versions, required section codes and conditional section codes. Later registry changes therefore cannot silently alter a released report or its individual PDF.

## Online facts before generation

Server code—not the model—retrieves and persists the available official NSW address, cadastral, zoning, LEP, height, FSR, minimum-lot-size, heritage, bushfire and flood results before an order can be confirmed. Source URLs/statuses and retrieval dates flow into the generation package and final source register. A service failure remains unknown and generates an investigation action.

Title, registered survey, Section 10.7, service-location evidence and council DCP details are not fabricated. They remain missing, require upload/order, or route to professional confirmation.

## Safety contract

OpenAI may draft and explain. It may not:

- match an address or choose the cadastral lot;
- determine or alter the official source result;
- calculate or change pricing;
- add products from free text;
- convert an unavailable source into a negative finding;
- rely on an uploaded technical document unless analysis is included or purchased;
- claim surveyed boundaries from mapping;
- approve a report for release;
- send a report directly to a client.

Any report sold as FRC reviewed or council-ready requires a recorded human approval and release decision.
