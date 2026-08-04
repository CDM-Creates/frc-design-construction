export const APPROVED_MARKETING_COPY = {
  primaryValue: "Detailed planning intelligence without the cost and delay of beginning with a fully bespoke investigation.",
  price: "Estimated report costs are shown before you send a quote request. Final pricing is confirmed by FRC before work proceeds.",
  comparison: "Compare the report inclusions, evidence standards and deliverables with other professional quotations before making your decision.",
  savings: "Our report pathway is designed to reduce repeated research, document sorting and preliminary briefing work.",
  delivery:
    "An AI draft report is prepared first. Because AI drafting can be inconsistent, an FRC professional reviews it so you receive everything included in your quoted scope within approximately one week.",
  documents: "Use the information you already hold. Supplied plans, surveys and certificates are incorporated into the analysis rather than ignored or recreated.",
} as const;

export const PROHIBITED_MARKETING_CLAIMS = [
  "cheapest in Australia",
  "guaranteed cheaper than every architect",
  "all other firms charge more",
  "contains every piece of information you will ever need",
  "guaranteed approval",
  "guaranteed 10-minute delivery",
] as const;

export function getTurnaroundCopy() {
  return {
    targetEnabled: true,
    target:
      "Target delivery: approximately one week after FRC confirms your quote and has the information needed for your scope.",
    qualification:
      "Some reports may take longer where sources are unavailable, uploaded documents require additional processing, or conflicts need clarification.",
    professionalReview:
      "A draft is prepared first; an FRC professional then reviews it before release so the quoted scope is delivered.",
    guaranteed: false,
  };
}

export function getEvidenceBackedComparisonClaim() {
  const wording = process.env.FRC_COMPARISON_CLAIM_WORDING?.trim() ?? "";
  const source = process.env.FRC_COMPARISON_CLAIM_SOURCE?.trim() ?? "";
  const comparisonDate = process.env.FRC_COMPARISON_CLAIM_DATE?.trim() ?? "";
  const comparableService = process.env.FRC_COMPARISON_SERVICE_DEFINITION?.trim() ?? "";
  const expiresAt = process.env.FRC_COMPARISON_CLAIM_EXPIRES_AT?.trim() ?? "";
  const expiry = Date.parse(expiresAt);
  const valid = Boolean(wording && source && comparisonDate && comparableService && Number.isFinite(expiry) && expiry > Date.now());
  return valid ? { wording, source, comparisonDate, comparableService, expiresAt } : null;
}
