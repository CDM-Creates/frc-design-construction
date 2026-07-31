export const DISPUTE_ENTITLEMENTS = [
  "included_factual_correction",
  "clarification_request",
  "professional_review_upgrade",
  "paid_detailed_review",
  "administrative_complaint",
] as const;

export type DisputeEntitlement = typeof DISPUTE_ENTITLEMENTS[number];

export type ReportDispute = {
  id: string;
  orderId: string;
  reportId: string;
  disputedSectionCode: string;
  entitlementType: DisputeEntitlement;
  clientExplanation: string;
  supportingStorageReference: string | null;
  status: "submitted" | "triaged" | "awaiting_information" | "under_review" | "correction_approved" | "correction_rejected" | "completed";
  assignedReviewer: string | null;
  outcome: string | null;
  correctionRecord: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
};

export const INCLUDED_FACTUAL_CORRECTION_TOPICS = [
  "wrong_property",
  "transcription_error",
  "missing_uploaded_document",
  "incorrect_source_attribution",
  "obvious_generation_mistake",
] as const;

/**
 * Every order includes exactly one factual-correction request. A second
 * `included_factual_correction` for the same order must be routed to a paid
 * pathway rather than accepted, so we never imply unlimited free corrections.
 */
export function enforceSingleIncludedCorrection(input: {
  entitlementType: string;
  existingEntitlementTypes: string[];
}) {
  if (
    input.entitlementType === "included_factual_correction" &&
    input.existingEntitlementTypes.includes("included_factual_correction")
  ) {
    return {
      allowed: false,
      reason:
        "This order's included factual-correction request has already been used. Additional review is available through a clarification request, professional-review upgrade or paid detailed review.",
    };
  }
  return { allowed: true, reason: null };
}

export function validateDisputeSubmission(input: {
  reportId: string;
  orderId: string;
  sectionCode: string;
  explanation: string;
  entitlementType: string;
  reportSectionCodes: string[];
}) {
  const issues: string[] = [];
  if (!input.reportId || !input.orderId) issues.push("The dispute must identify its report and order.");
  if (!input.reportSectionCodes.includes(input.sectionCode)) issues.push("Select a section from the report being queried.");
  if (input.explanation.trim().length < 20) issues.push("Explain the concern in at least 20 characters.");
  if (!DISPUTE_ENTITLEMENTS.includes(input.entitlementType as DisputeEntitlement)) issues.push("Select a valid review pathway.");
  return { valid: issues.length === 0, issues };
}
