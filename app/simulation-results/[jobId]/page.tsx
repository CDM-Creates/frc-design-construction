import ResultsClient from "./results-client";

export default async function SimulationResultsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <ResultsClient jobId={jobId} />;
}
