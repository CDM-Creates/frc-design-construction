import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("uses one canonical project brief across the client journey", async () => {
  const [projectData, home, simulator] = await Promise.all([
    read("app/lib/project-data.ts"),
    read("app/page.tsx"),
    read("app/page.tsx"),
  ]);

  for (const section of ["client", "property", "planning", "ambition", "roadmap", "simulation", "consent"]) {
    assert.match(projectData, new RegExp(`\\b${section}\\b`), `Canonical project is missing ${section}.`);
  }
  assert.match(home, /writeStoredProject/);
  assert.match(simulator, /readStoredProject/);
  assert.match(simulator, /Request a quote/);
  assert.match(simulator, /carried-forward project details are correct/);
});

test("keeps provider credentials server-side and routes specialist tasks independently", async () => {
  const [provider, orchestrator, simulationRoute, clientPage, simulatorPage] = await Promise.all([
    read("app/lib/ai/provider.ts"),
    read("app/lib/ai/orchestrator.ts"),
    read("app/api/simulation/route.ts"),
    read("app/page.tsx"),
    read("app/page.tsx"),
  ]);

  assert.match(provider, /process\.env\.OPENAI_API_KEY/);
  assert.match(provider, /AI_ROUTER_API_KEY/);
  for (const task of ["PROPERTY_ANALYSIS_MODEL", "DESIGN_CONCEPT_MODEL", "INTERIOR_DESIGN_MODEL", "ROOM_SCHEDULE_MODEL", "IMAGE_PROMPT_MODEL", "FINAL_REPORT_MODEL"]) {
    assert.match(orchestrator, new RegExp(task), `Orchestrator is missing ${task}.`);
  }
  assert.match(simulationRoute, /orchestrateSimulation/);
  assert.doesNotMatch(clientPage, /OPENAI_API_KEY|AI_ROUTER_API_KEY/);
  assert.doesNotMatch(simulatorPage, /OPENAI_API_KEY|AI_ROUTER_API_KEY/);
});

test("defines persistence, secure files, failure handling and final report delivery", async () => {
  const [schema, files, orchestrator, email, result] = await Promise.all([
    read("db/schema.ts"),
    read("app/lib/project-files.ts"),
    read("app/lib/ai/orchestrator.ts"),
    read("app/lib/architect-email.ts"),
    read("app/simulation-results/[jobId]/results-client.tsx"),
  ]);

  for (const table of ["projects", "projectInputs", "simulationJobs", "aiTasks", "aiOutputs", "generatedImages", "finalReports", "uploadedDocuments", "architectReviewRequests"]) {
    assert.match(schema, new RegExp(`export const ${table}`), `Schema is missing ${table}.`);
  }
  assert.match(files, /FILE_SIGNING_SECRET/);
  assert.match(files, /10 \* 1024 \* 1024/);
  assert.match(orchestrator, /fallback/);
  assert.match(email, /lead architect handover/);
  assert.match(result, /Print \/ save handover/);
  assert.match(result, /planning_information_requiring_verification/);
});
