import type { SimulationPackage } from "./ai/contracts";

const globalStore = globalThis as typeof globalThis & { __frcSimulationJobs?: Map<string, SimulationPackage> };
const store = globalStore.__frcSimulationJobs ?? new Map<string, SimulationPackage>();
if (!globalStore.__frcSimulationJobs) globalStore.__frcSimulationJobs = store;

export const setSimulationMemory = (value: SimulationPackage) => store.set(value.job_id, value);
export const getSimulationMemory = (jobId: string) => store.get(jobId);
