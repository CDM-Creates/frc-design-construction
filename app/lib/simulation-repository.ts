import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { aiOutputs, aiTasks, finalReports, generatedImages, projectInputs, projects, simulationJobs, uploadedDocuments } from "../../db/schema";
import type { CanonicalProject, UploadedProjectDocument } from "./project-data";
import type { SimulationPackage } from "./ai/contracts";
import { calculateSiteCapacity } from "./ai/site-capacity";

export async function createSimulationRecords(jobId: string, project: CanonicalProject) {
  const now = new Date().toISOString();
  const projectId = project.id || crypto.randomUUID();
  try {
    const db = getDb();
    await db.insert(projects).values({
      id: projectId,
      clientName: project.client.name,
      clientEmail: project.client.email,
      propertyAddress: project.property.address,
      propertySuburb: project.property.suburb,
      status: "processing",
      createdAt: project.metadata.created_at || now,
      updatedAt: now,
    }).onConflictDoUpdate({ target: projects.id, set: { status: "processing", updatedAt: now } });
    await db.insert(projectInputs).values({ id: crypto.randomUUID(), projectId, version: 1, payloadJson: JSON.stringify({ ...project, id: projectId }), createdAt: now });
    await db.insert(simulationJobs).values({ id: jobId, projectId, status: "processing", createdAt: now, startedAt: now });
    return { persisted: true, projectId };
  } catch (error) {
    console.warn("Simulation database is not configured or migration is missing; using runtime fallback.", error);
    return { persisted: false, projectId };
  }
}


export async function persistUploadedDocumentRecords(projectId: string, documents: UploadedProjectDocument[]) {
  if (!documents.length) return true;
  const now = new Date().toISOString();
  try {
    const db = getDb();
    for (const document of documents) {
      await db.insert(uploadedDocuments).values({
        id: document.id,
        projectId,
        category: document.category,
        filename: document.name,
        mimeType: document.type,
        sizeBytes: document.size,
        storageKey: document.storageKey,
        createdAt: now,
      }).onConflictDoNothing();
    }
    return true;
  } catch (error) {
    console.warn("Uploaded document metadata could not be persisted.", error);
    return false;
  }
}

export async function completeSimulationRecords(result: SimulationPackage) {
  const now = new Date().toISOString();
  try {
    const db = getDb();
    await db.update(simulationJobs).set({ status: result.status, completedAt: result.completed_at || now }).where(eq(simulationJobs.id, result.job_id));
    for (const task of result.task_statuses) {
      const taskId = crypto.randomUUID();
      await db.insert(aiTasks).values({
        id: taskId,
        jobId: result.job_id,
        taskType: task.task,
        provider: task.provider,
        model: task.model,
        status: task.status,
        errorMessage: task.error,
        createdAt: result.created_at,
        completedAt: result.completed_at || now,
      });
      const taskOutput = task.task === "final_report"
        ? result.final_report
        : task.task === "site_capacity"
          ? result.specialist.site_capacity
          : task.task === "property_analysis"
          ? result.specialist.property_analysis
          : task.task === "architectural_direction"
            ? result.specialist.architectural_direction
            : task.task === "interior_direction"
              ? result.specialist.interior_direction
              : task.task === "room_schedule"
                ? result.specialist.room_schedule
                : result.specialist.image_prompts;
      await db.insert(aiOutputs).values({ id: crypto.randomUUID(), taskId, outputJson: JSON.stringify(taskOutput), createdAt: now });
    }
    for (const image of result.generated_images) {
      await db.insert(generatedImages).values({
        id: crypto.randomUUID(), jobId: result.job_id, imageKey: image.key, title: image.title, category: image.category,
        provider: image.provider, model: image.model, originalPrompt: image.prompt, status: image.status,
        imageUrl: image.image_url, errorMessage: image.error_message, createdAt: now,
      });
    }
    await db.insert(finalReports).values({ id: crypto.randomUUID(), jobId: result.job_id, reportJson: JSON.stringify(result.final_report), createdAt: now });
    await db.update(projects).set({ status: result.status, updatedAt: now }).where(eq(projects.id, result.project.id || ""));
    return true;
  } catch (error) {
    console.warn("Simulation result could not be persisted; runtime copy remains available.", error);
    return false;
  }
}

export async function readSimulationRecord(jobId: string): Promise<SimulationPackage | null> {
  try {
    const db = getDb();
    const [job] = await db.select().from(simulationJobs).where(eq(simulationJobs.id, jobId)).limit(1);
    if (!job) return null;
    const [input] = await db.select().from(projectInputs).where(eq(projectInputs.projectId, job.projectId)).limit(1);
    const [report] = await db.select().from(finalReports).where(eq(finalReports.jobId, jobId)).limit(1);
    const images = await db.select().from(generatedImages).where(eq(generatedImages.jobId, jobId));
    const tasks = await db.select().from(aiTasks).where(eq(aiTasks.jobId, jobId));
    if (!input || !report) return null;
    const project = JSON.parse(input.payloadJson) as CanonicalProject;
    const storedReport = JSON.parse(report.reportJson) as Partial<SimulationPackage["final_report"]>;
    const siteCapacity = storedReport.site_capacity || calculateSiteCapacity(project);
    const finalReport = {
      ...storedReport,
      site_capacity: siteCapacity,
      room_schedule: storedReport.room_schedule || siteCapacity.room_schedule,
    } as SimulationPackage["final_report"];

    return {
      job_id: job.id,
      status: job.status as SimulationPackage["status"],
      created_at: job.createdAt,
      completed_at: job.completedAt || undefined,
      project,
      specialist: {
        site_capacity: siteCapacity,
        property_analysis: { section: "Stored output", summary: "Specialist output stored separately.", recommendations: [], assumptions: [], items_to_verify: [], missing_information: [], confidence_notes: [] },
        architectural_direction: { section: "Stored output", summary: "Specialist output stored separately.", recommendations: [], assumptions: [], items_to_verify: [], missing_information: [], confidence_notes: [] },
        interior_direction: { section: "Stored output", summary: "Specialist output stored separately.", recommendations: [], assumptions: [], items_to_verify: [], missing_information: [], confidence_notes: [] },
        room_schedule: finalReport.room_schedule,
        image_prompts: images.map((image) => ({ key: image.imageKey, title: image.title, category: image.category as "exterior" | "interior", prompt: image.originalPrompt })),
      },
      final_report: finalReport,
      generated_images: images.map((image) => ({
        key: image.imageKey, title: image.title, category: image.category as "exterior" | "interior", prompt: image.originalPrompt,
        provider: image.provider, model: image.model, status: image.status as "complete" | "failed" | "skipped", image_url: image.imageUrl || undefined, error_message: image.errorMessage || undefined,
      })),
      task_statuses: tasks.map((task) => ({ task: task.taskType, provider: task.provider, model: task.model, status: task.status, error: task.errorMessage || undefined })),
    };
  } catch (error) {
    console.warn("Stored simulation could not be read.", error);
    return null;
  }
}
