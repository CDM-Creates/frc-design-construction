/**
 * Stripe webhooks are disabled. The simulator is a quote-request pathway.
 * See docs/QUOTE-SYSTEM.md.
 */
export async function POST() {
  return Response.json(
    {
      error:
        "Stripe webhooks are disabled. Property-report quotes are emailed to FRC; no card payment flow is active.",
    },
    { status: 410 },
  );
}
