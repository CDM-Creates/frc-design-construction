/**
 * Mock Stripe payment is disabled. The simulator is a quote-request pathway.
 * See docs/QUOTE-SYSTEM.md.
 */
export async function POST() {
  return Response.json(
    {
      error:
        "Mock payment is disabled. Use Send quote request on /simulator — no Stripe or card payment is taken here.",
    },
    { status: 410 },
  );
}
