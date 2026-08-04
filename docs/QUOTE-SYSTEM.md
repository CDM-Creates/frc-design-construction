# FRC property-report quote system

This is the preferred client pathway for `/simulator`.

## Intent

Clients select catalogue reports at the published prices, upload what they already hold, and **send a quote request** to FRC. No Stripe checkout and no OpenAI generation run from this flow.

## Delivery promise (client-facing)

> An AI draft report is prepared first. Because AI drafting can be inconsistent, an FRC professional reviews it so you receive everything included in your quoted scope within approximately one week.

## Email routing

Quotes go to:

```env
QUOTE_TO_EMAIL=frcdesignconstruction@gmail.com
```

Fallback (older deploys): `HEAD_ARCHITECT_EMAIL`.

From address: `QUOTE_FROM_EMAIL`. Delivery uses Resend (`RESEND_API_KEY`). Without Resend, the simulator quote is logged locally so the request is still recorded.

## Flow

1. Client completes `/simulator` steps (property → reports → documents → price → review).
2. `POST /api/planning-simulation/orders` freezes catalogue pricing and marks the order as `tailored_quote_requested` (no payment).
3. `POST /api/planning-simulation/orders/[orderId]/send-quote` emails FRC the client, property, selected reports, and quoted total.
4. FRC replies to the client to confirm engagement / invoice. Report work is handled offline by FRC — not auto-started by payment webhooks.

Homepage architectural quotes still use `POST /api/quote-request` and the same `QUOTE_TO_EMAIL` helper.

## Key files

| File | Role |
|------|------|
| `app/components/planning-simulation-wizard.tsx` | Quote UX (Send quote request) |
| `app/lib/report-platform/quote-delivery.ts` | Recipient + turnaround copy |
| `app/api/planning-simulation/orders/[orderId]/send-quote/route.ts` | Emails the simulator quote |
| `app/api/quote-request/route.ts` | Homepage quote email |
| `app/lib/report-platform/report-catalogue.ts` | Catalogue prices (professional-review add-on not offered) |
| `app/simulator/page.tsx` | Simulator framing |

## Explicitly out of scope for this pathway

- Stripe / mock checkout payment
- Automatic OpenAI report generation after payment
- Purchasable “professional review” / priority-review upgrades (review is part of the one-week delivery promise instead)
