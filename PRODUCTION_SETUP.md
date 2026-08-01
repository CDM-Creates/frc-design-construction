# FRC report platform production setup

The application can run locally without external accounts. Production services remain disabled until their environment variables are configured and verified.

## 1. Supabase database and private files

Create one Supabase project in the FRC business account. You do **not** need to paste or upload SQL. Set these server environment variables in Vercel:

```text
FRC_DATA_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_DATABASE_URL=postgresql://...transaction-pooler...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=frc-private-reports
```

On the first server connection the app applies its idempotent schema automatically. It also creates a private Storage bucket if it is missing. The secret key and database URL are server secrets and must never use a `NEXT_PUBLIC_` prefix. `SUPABASE_SERVICE_ROLE_KEY` remains supported only as a legacy fallback.

The database retains the order identity, client contact details, selected reports, frozen price/receipt basis, property-source register, client brief, evidence metadata, job state, report output and audit events. File bytes remain in private Storage rather than inside database rows.

## 2. OpenAI

Set the following only after billing and data-handling settings are approved:

```text
OPENAI_API_KEY=...
REPORT_AI_PROVIDER=openai
REPORT_AI_MODEL=gpt-5.6-sol
REPORT_AI_ENABLED=true
DOCUMENT_AI_PROVIDER=openai
DOCUMENT_AI_MODEL=gpt-5.6-terra
DOCUMENT_AI_ENABLED=true
DOCUMENT_AI_REQUIRED=true
PROPERTY_RESEARCH_AI_ENABLED=true
PROPERTY_RESEARCH_AI_MODEL=gpt-5.6-terra
```

Document intake runs after security screening. It classifies relevance and property mismatch; it does not manufacture missing certificates or professional documents. Public property research records URLs and unknowns. Final report generation is constrained by the selected report templates and evidence source IDs.

## 3. Stripe

Create a Stripe webhook for:

```text
https://YOUR_DOMAIN/api/payments/webhook
```

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. Then set:

```text
PAYMENT_PROVIDER=stripe
PAYMENTS_LIVE_ENABLED=true
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Run a Stripe test-mode purchase and webhook replay before replacing test keys with live keys.

## 4. Email and attachments

Verify the sending domain with Resend, then set:

```text
RESEND_API_KEY=...
QUOTE_FROM_EMAIL=FRC Website <reports@YOUR_VERIFIED_DOMAIN>
HEAD_ARCHITECT_EMAIL=frcdesignconstruction@gmail.com
```

After generation, the head architect receives the client contact details, selected reports, complete client brief, evidence register, cleared attachments within email limits, the AI report PDF and an order receipt PDF. Files omitted because of malware or email-size limits remain in private Storage and the order audit register.

## 5. Required launch checks

- Connect and verify a real malware-scanning provider. The current code intentionally reports this as a launch blocker until a provider is implemented and tested.
- Add long random values for `FILE_SIGNING_SECRET` and `ARCHITECT_REVIEW_TOKEN`.
- Complete ABN, GST, legal name, terms, privacy and refund settings in the environment.
- Confirm retention/deletion periods, consent wording, professional-review responsibility and report limitations with the business's legal and architectural advisers.
- Use Node 22, run `npm test`, `npm run lint`, and `npm run build`, then complete a real staging purchase from upload through email delivery.

No architecture/report AI can lawfully replace title documents, registered surveys, council certificates, consultant reports, professional design or approval. The workflow blocks required evidence instead of filling those gaps with invented content.
