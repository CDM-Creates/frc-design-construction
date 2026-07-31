import { ReportStatusClient } from "./report-status-client";

export default async function ReportStatusPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <ReportStatusClient jobId={jobId} />;
}
