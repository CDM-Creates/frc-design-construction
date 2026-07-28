# INOV8 / FRC Architecture Site

A cinematic architecture website with a shared client project brief, NSW site-analysis tools, automated quote delivery and a cloud-based multi-AI architectural concept workflow.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local address shown in the terminal.

## What is implemented

- One canonical project object shared by Property, Ambition, Roadmap, Quote and Simulation.
- Automatic carry-over through browser storage, so clients do not repeat information.
- Existing NSW property/site analysis retained.
- Premium simulation briefing form with contact, property, planning, design, roadmap and upload fields.
- Required final review and early-concept confirmation.
- Server-only provider-independent AI orchestration.
- Separate specialist tasks for property/site, architecture, interiors, room scheduling and image prompts.
- Final report synthesis using all specialist outputs.
- Configurable provider/model per task.
- Optional cloud image generation with independent failure handling.
- Cloudflare D1 tables for projects, inputs, jobs, AI tasks/outputs, images, reports, uploads and architect review requests.
- Optional Cloudflare R2 upload storage with signed application URLs.
- Completed-project email package sent through Resend.
- Premium client result page with galleries, room schedule, planning verification, assumptions, next steps and print-to-PDF support.
- Fallback report generation when an AI key, model or provider is unavailable.
- Rate limiting, input limits, file validation, prompt-injection boundaries and safe output rendering.

## OpenAI API key

Create the key through the secure OpenAI Platform flow, then add it only to the server environment:

```env
OPENAI_API_KEY=sk-proj-...
```

Never add the key to a React component, browser JavaScript, Git history or a public deployment variable.

## Multi-provider routing

The client pages do not know which provider is used. Each server task reads a provider and model from environment variables:

```env
PROPERTY_ANALYSIS_PROVIDER=openai
PROPERTY_ANALYSIS_MODEL=gpt-4.1-mini

DESIGN_CONCEPT_PROVIDER=router
DESIGN_CONCEPT_MODEL=anthropic/your-selected-model

INTERIOR_DESIGN_PROVIDER=router
INTERIOR_DESIGN_MODEL=google/your-selected-model

FINAL_REPORT_PROVIDER=openai
FINAL_REPORT_MODEL=gpt-4.1-mini
```

Installed provider adapters:

- `openai`: OpenAI Responses API using `OPENAI_API_KEY`.
- `router`: an OpenAI-compatible router endpoint using `AI_ROUTER_API_KEY` and `AI_ROUTER_BASE_URL`.

Adding a direct Anthropic or Google adapter only requires a new implementation inside `app/lib/ai/provider.ts`; the forms, orchestration and result page do not change.

## Image generation

Image generation is deliberately off by default to prevent unexpected usage charges:

```env
ENABLE_AI_IMAGES=true
IMAGE_PROVIDER=openai
EXTERIOR_IMAGE_MODEL=gpt-image-1
INTERIOR_IMAGE_MODEL=gpt-image-1
```

If an image fails, the written report still completes. If images are disabled, the result page shows the prepared image slots and status rather than failing the project.

## Email delivery

```env
RESEND_API_KEY=re_...
HEAD_ARCHITECT_EMAIL=head.architect@example.com
QUOTE_FROM_EMAIL="FRC Website <quotes@your-verified-domain.com>"
```

`QUOTE_FROM_EMAIL` must use a domain verified with the selected email provider.

## Cloudflare database and file storage

The hosting file binds:

- D1 database as `DB`
- R2 bucket as `PROJECT_FILES`

Create the real resources in the hosting control plane, then run or apply the generated migrations in `drizzle/`.

Generate a fresh migration after schema changes:

```bash
npm run db:generate
```

Set a strong signing secret so uploaded documents are only available through expiring links:

```env
FILE_SIGNING_SECRET=long-random-production-secret
```

When D1 or R2 is not connected, the application keeps a temporary runtime result and still generates the report, but persistent storage and durable file links require the cloud bindings.

## Production checks

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
```

## Important limitation

The AI-assisted concept study is preliminary design exploration only. It does not confirm zoning, permitted use, height, FSR, setbacks, heritage, hazards, approval eligibility, structure or what can legally be built. Those matters remain clearly marked for registered-professional verification throughout the result.
