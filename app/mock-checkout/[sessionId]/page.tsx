import { MockCheckoutClient } from "./mock-checkout-client";

export default async function MockCheckoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <MockCheckoutClient sessionId={sessionId} />;
}
