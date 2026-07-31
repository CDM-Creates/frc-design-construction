import type { PlanningReportTemplate } from "./report-templates";

export type VerifiedPlanningReportDataPack = {
  simulationRequestId: string;
  planningFacts: Array<Record<string, unknown>>;
  sourceRegister: Array<Record<string, unknown>>;
  reportTemplate: PlanningReportTemplate;
  readiness: {
    readyForAiDraft: true;
    readyForProfessionalReview: boolean;
    reasons: string[];
  };
  routing: {
    architectReviewRequired: true;
    clientDeliveryBlockedUntilArchitectApproval: true;
  };
  [key: string]: unknown;
};

export function planningReportAiConfig() {
  return {
    enabled: process.env.ENABLE_PLANNING_REPORT_AI === "true",
    model:
      process.env.PLANNING_REPORT_MODEL ??
      process.env.FINAL_REPORT_MODEL ??
      process.env.OPENAI_TEXT_MODEL ??
      "",
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
}

/**
 * This is the deliberate OpenAI hand-off boundary.
 *
 * A future server-only report-draft route should call the OpenAI Responses API
 * from here, and only after `readyForAiDraft` is true. Never pass raw,
 * unreviewed property documents or let model output replace pricing, factual
 * source values, report routing, or the architect approval gate.
 */
export function buildPlanningReportDraftInstructions(
  dataPack: VerifiedPlanningReportDataPack,
) {
  return {
    system: [
      "You are the drafting assistant for FRC Design & Construction.",
      "Draft only from the verified structured facts and approved document extracts supplied.",
      "Never invent planning controls, property facts, prices, Council requirements or document content.",
      "Preserve explicit not-verified and missing-information statuses.",
      "Follow the supplied report template section order.",
      "Return a draft for FRC architect review, never a client-approved report.",
    ].join(" "),
    input: JSON.stringify(dataPack),
  };
}

