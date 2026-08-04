/**
 * Stripe / mock checkout is disabled. The simulator is a quote-request pathway.
 * See docs/QUOTE-SYSTEM.md.
 */
export async function POST() {
  return Response.json(
    {
      error:
        "Online checkout is disabled. Use Send quote request on /simulator — FRC will confirm the engagement by email.",
    },
    { status: 410 },
  );
}
