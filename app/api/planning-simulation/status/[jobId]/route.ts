import { getReportPlatformRepository } from "../../../../lib/report-platform/repository";
import { tokenMatches } from "../../../../lib/report-platform/security";
import type { OrderStatus, ReportJobStatusResponse } from "../../../../lib/report-platform/types";

const stages = [
  ["order_confirmed", "Order confirmed"],
  ["payment_verified", "Payment verified"],
  ["references_files_secured", "References and files secured"],
  ["property_identity_checked", "Property identity checked"],
  ["area_boundary_checked", "Land area and boundary status checked"],
  ["documents_analysed", "Documents analysed"],
  ["development_brief_analysed", "Development brief analysed"],
  ["report_sections_prepared", "Report sections prepared"],
  ["evidence_and_safety_validation", "Evidence and safety validation"],
  ["professional_review", "Professional review, where purchased"],
  ["report_pack_prepared", "Report pack prepared"],
  ["report_ready", "Report ready"],
] as const;

const visualStages = [
  ["development_brief_understood", "Development brief understood"],
  ["reference_material_reviewed", "Reference material reviewed"],
  ["property_constraints_mapped", "Property constraints mapped"],
  ["concept_direction_prepared", "Concept direction prepared"],
  ["constraint_diagrams_generated", "Constraint diagrams generated"],
  ["services_considerations_prepared", "Services considerations prepared"],
  ["visualisations_validated", "Visualisations validated"],
  ["visual_report_pack_assembled", "Report pack assembled"],
] as const;

const stageByStatus: Partial<Record<OrderStatus, number>> = {
  queued: 1,
  securing_files: 2,
  analysing_property: 4,
  analysing_documents: 5,
  generating_report: 7,
  automated_validation: 8,
  awaiting_professional_review: 9,
  changes_requested: 9,
  approved_for_release: 10,
  completed: 11,
  failed: 0,
};

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const repository = await getReportPlatformRepository();
  const job = await repository.getReportJob(jobId);
  if (!job) return Response.json({ error: "Report job not found." }, { status: 404 });
  const order = await repository.getOrder(job.orderId);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  const token = request.headers.get("x-frc-order-token") ?? "";
  const report = await repository.getFinalReportByJob(jobId);
  const authorised = await tokenMatches(token, order.ownerHash)
    || Boolean(report && await tokenMatches(token, report.accessHash));
  if (!authorised) return Response.json({ error: "Report status access denied." }, { status: 403 });
  const current = stageByStatus[job.status] ?? 0;
  const failed = job.status === "failed";
  const response: ReportJobStatusResponse = {
    job,
    order: (({ ownerHash: _ownerHash, ...safe }) => {
      void _ownerHash;
      return safe;
    })(order),
    stages: stages.map(([code, label], index) => ({
      code,
      label,
      state: failed && index === current ? "failed" : index < current ? "complete" : index === current ? (job.status === "changes_requested" ? "blocked" : "current") : "pending",
    })),
    visualStages: (order.scope.selectedReportIds?.length ?? 0) > 0
      ? visualStages.map(([code, label], index) => {
          const visualCurrent = job.status === "completed" ? 8
            : job.status === "approved_for_release" || job.status === "awaiting_professional_review" ? 7
              : job.status === "automated_validation" ? 6
                : job.status === "generating_report" ? Math.min(5, Math.max(0, ["development_brief_understood", "reference_material_reviewed", "property_constraints_mapped", "concept_direction_prepared", "constraint_diagrams_generated", "services_considerations_prepared"].indexOf(job.progressStage)))
                  : 0;
          return { code, label, state: index < visualCurrent ? "complete" as const : index === visualCurrent ? "current" as const : "pending" as const };
        })
      : undefined,
    missingDocuments: [],
    report: report?.status === "released"
      ? (({ accessHash: _accessHash, ...safe }) => {
          void _accessHash;
          return safe as typeof report;
        })(report)
      : null,
  };
  return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
}
