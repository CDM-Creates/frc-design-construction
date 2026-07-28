import { getSimulationMemory } from "../../../lib/simulation-memory";
import { readSimulationRecord } from "../../../lib/simulation-repository";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const memory = getSimulationMemory(jobId);
  if (memory) return Response.json(memory, { headers: { "Cache-Control": "no-store" } });
  const stored = await readSimulationRecord(jobId);
  if (stored) return Response.json(stored, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ error: "This simulation result is unavailable or has expired from temporary storage." }, { status: 404 });
}
