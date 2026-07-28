import { orchestrateSimulation } from "../../lib/ai/orchestrator";
import { sendArchitectSimulationEmail } from "../../lib/architect-email";
import { checkRateLimit } from "../../lib/rate-limit";
import { createEmptyProject, mergeProjectData, type CanonicalProject } from "../../lib/project-data";
import { storeProjectFiles } from "../../lib/project-files";
import { completeSimulationRecords, createSimulationRecords, persistUploadedDocumentRecords } from "../../lib/simulation-repository";
import { setSimulationMemory } from "../../lib/simulation-memory";

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function validateProject(input: unknown): CanonicalProject {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("The project brief is missing or invalid.");
  const project = mergeProjectData(createEmptyProject(), input as Partial<CanonicalProject>);
  project.client.name = text(project.client.name, 160);
  project.client.email = text(project.client.email, 240).toLowerCase();
  project.client.phone = text(project.client.phone, 80);
  project.property.address = text(project.property.address, 400);
  project.property.suburb = text(project.property.suburb, 120);
  project.property.postcode = text(project.property.postcode, 8).replace(/\D/g, "").slice(0, 4);
  project.simulation.client_description = text(project.simulation.client_description, 8000);
  project.simulation.additional_instructions = text(project.simulation.additional_instructions, 4000);

  if (!project.client.name || !project.client.email || !project.client.phone) throw new Error("Name, email and phone are required before generation.");
  if (!/^\S+@\S+\.\S+$/.test(project.client.email)) throw new Error("Enter a valid email address.");
  if (!project.property.suburb || project.property.postcode.length !== 4) throw new Error("A valid NSW suburb and postcode are required.");
  if (!project.simulation.client_description) throw new Error("Describe the home or development you want to create.");
  if (project.consent.concept_disclaimer_accepted !== true) throw new Error("Confirm the preliminary-concept disclaimer before generation.");
  project.consent.accepted_at ||= new Date().toISOString();
  project.metadata.updated_at = new Date().toISOString();
  return project;
}

export async function POST(request: Request) {
  const clientKey = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const limit = checkRateLimit(`simulation:${clientKey}`, Number(process.env.SIMULATION_RATE_LIMIT || 3));
  if (!limit.allowed) return Response.json({ error: "Too many simulation requests were submitted from this connection. Please try again after the rate-limit window resets." }, { status: 429 });

  try {
    const contentType = request.headers.get("content-type") || "";
    let rawProject: unknown;
    let files: File[] = [];
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const raw = formData.get("project");
      if (typeof raw !== "string") throw new Error("The project brief was not attached to the submission.");
      rawProject = JSON.parse(raw);
      files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    } else {
      const body = await request.json() as { project?: unknown } | unknown;
      rawProject = body && typeof body === "object" && !Array.isArray(body) && "project" in body ? (body as { project: unknown }).project : body;
    }

    const project = validateProject(rawProject);
    const jobId = crypto.randomUUID();
    project.id ||= crypto.randomUUID();

    if (files.length) {
      const uploaded = await storeProjectFiles(project.id, files, new URL(request.url).origin);
      project.simulation.uploaded_files = [...project.simulation.uploaded_files.filter((item) => !uploaded.some((next) => next.name === item.name)), ...uploaded];
      project.planning.planning_documents = uploaded.filter((item) => item.category === "planning_document" || item.category === "site_survey" || item.category === "existing_plan");
    }

    const records = await createSimulationRecords(jobId, project);
    project.id = records.projectId;
    await persistUploadedDocumentRecords(project.id, project.simulation.uploaded_files);

    const result = await orchestrateSimulation(jobId, project);
    setSimulationMemory(result);
    await completeSimulationRecords(result);

    const internalUrl = `${new URL(request.url).origin}/simulation-results/${jobId}`;
    const email = await sendArchitectSimulationEmail(result, internalUrl);

    return Response.json({ ...result, delivery: email }, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch (error) {
    console.error("Simulation request failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "The architectural concept could not be generated." }, { status: 400 });
  }
}
