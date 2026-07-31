# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single Next.js 16 / React 19 app (TypeScript, App Router) for the FRC / INOV8 architecture site. The whole product (marketing pages, NSW site analysis, AI concept simulation, and the `/simulator` planning-report platform) runs from one process. Frontend and backend API routes both live under `app/`.

### Runtime & tooling
- Node 22 and npm (see `engines.node: "22.x"` and `package-lock.json`). Do not use pnpm/yarn.
- The startup update script runs `npm install` and creates `.env.local` from `.env.example` if it is missing. `.env.local` is gitignored, so if it is absent just re-copy `.env.example`.

### Running / building / testing (see `README.md` and `package.json` scripts)
- Dev server: `npm run dev` (native `next dev` on port 3000). This is the primary way to run and test the product locally.
- `npm run build` is native `next build` (NOT `vinext build`). Keep it that way. The Cloudflare Workers path (`dev:cloudflare` / `build:cloudflare` via vinext + wrangler) is optional and not needed for local development or testing.
- Lint: `npm run lint` (only `<img>` warnings, 0 errors expected).
- Tests: `npm test` (full `node --test`, 58 tests) or `npm run test:report-platform` (20 tests) for the planning-report platform only.

### Local test-mode behavior (non-obvious)
- `.env.example` ships in full test mode: mock payments, mock report AI, images off, live payments off. Live OpenAI text/images, Resend email, and live payments only activate when real credentials/flags are supplied; none are required to run the app end to end.
- The `/simulator` planning flow persists to a local SQLite file at `.frc-local/report-platform.sqlite` and stores uploads under `.frc-private-storage/` (both gitignored, auto-created on first API hit). To reset the simulator/order state for a clean run, delete these two directories.
- The simulation DB in `db/index.ts` (Cloudflare D1) is intentionally unavailable under plain `next dev`; simulation results fall back to an in-memory store (`app/lib/simulation-memory.ts`). This is expected, not a bug.
- Property lookup on `/simulator` and homepage site analysis call live NSW government ArcGIS APIs, so those steps need outbound network access.
- Admin pages (`/admin/report-platform-readiness`, `/admin/report-reviews`) and architect overrides are gated by `ARCHITECT_REVIEW_TOKEN`.
