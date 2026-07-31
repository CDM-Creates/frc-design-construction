export const APPROVED_MARKETING_COPY = {
  primaryValue: "Detailed planning intelligence without the cost and delay of beginning with a fully bespoke investigation.",
  price: "Transparent report pricing is shown before payment, with no charge simply for uploading documents.",
  comparison: "Compare the report inclusions, evidence standards and deliverables with other professional quotations before making your decision.",
  savings: "Our report platform is designed to reduce repeated research, document sorting and preliminary briefing work.",
  delivery: "Eligible AI-assisted reports can often be prepared within approximately 10–20 minutes once payment, uploads and source checks are complete.",
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
  const targetEnabled = process.env.FRC_AI_TURNAROUND_TARGET_ENABLED !== "false";
  return {
    targetEnabled,
    target: targetEnabled
      ? "Target generation time: approximately 10–20 minutes after payment, successful file processing and access to the required property sources."
      : "",
    qualification: "Some reports may take longer where sources are unavailable, uploaded documents require additional processing, conflicts are detected or professional review is selected.",
    professionalReview: "Professional-review timing begins after the AI-assisted draft and all required information are available.",
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
