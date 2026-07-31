import { PlanningReportClient } from "./planning-report-client";

export default async function PlanningReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <PlanningReportClient reportId={reportId} />;
}
