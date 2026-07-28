import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  aiOutputs,
  aiTasks,
  architectOverrides,
  finalReports,
  generatedImages,
  projectInputs,
  projects,
  simulationJobs,
  siteCapacityPackages,
  uploadedDocuments,
} from "../../db/schema";
import type { CanonicalProject, UploadedProjectDocument } from "./project-data";
import { createEmptyProject, mergeProjectData } from "./project-data";
import type { ArchitectOverrideRecord, SectionOutput, SimulationPackage } from "./ai/contracts";
import { calculateSiteCapacity } from "./ai/site-capacity";

const emptySection = (section: string): SectionOutput => ({
  section,
  summary: "No stored specialist narrative was available.",
  recommendations: [],
  assumptions: [],
  items_to_verify: [],
  missing_information: [],
  confidence_notes: [],
});

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
    console.warn("Simulation database is not configured or a migration is missing; using runtime fallback.", error);
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
                : task.task === "household_programme"
                  ? result.specialist.room_programme
                  : result.specialist.image_prompts;
      await db.insert(aiOutputs).values({ id: crypto.randomUUID(), taskId, outputJson: JSON.stringify(taskOutput), createdAt: now });
    }
    for (const image of result.generated_images) {
      await db.insert(generatedImages).values({
        id: crypto.randomUUID(),
        jobId: result.job_id,
        imageKey: image.key,
        title: image.title,
        category: image.category,
        provider: image.provider,
        model: image.model,
        originalPrompt: image.prompt,
        status: image.status,
        imageUrl: image.image_url,
        errorMessage: image.error_message,
        createdAt: now,
      });
    }
    await db.insert(siteCapacityPackages).values({
      id: crypto.randomUUID(),
      jobId: result.job_id,
      calculatorVersion: result.specialist.site_capacity.calculator_version,
      calculationStatus: result.specialist.site_capacity.status,
      packageJson: JSON.stringify(result.specialist.site_capacity),
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: siteCapacityPackages.jobId,
      set: {
        calculatorVersion: result.specialist.site_capacity.calculator_version,
        calculationStatus: result.specialist.site_capacity.status,
        packageJson: JSON.stringify(result.specialist.site_capacity),
        updatedAt: now,
      },
    });
    for (const override of result.specialist.site_capacity.architect_overrides) await persistOverrideRow(result.job_id, override);
    await db.insert(finalReports).values({ id: crypto.randomUUID(), jobId: result.job_id, reportJson: JSON.stringify(result.final_report), createdAt: now });
    await db.update(projects).set({ status: result.status, updatedAt: now }).where(eq(projects.id, result.project.id || ""));
    return true;
  } catch (error) {
    console.warn("Simulation result could not be persisted; runtime copy remains available.", error);
    return false;
  }
}

async function persistOverrideRow(jobId: string, override: ArchitectOverrideRecord) {
  const db = getDb();
  await db.insert(architectOverrides).values({
    id: override.id,
    jobId,
    field: override.field,
    originalMappedValueJson: override.original_mapped_value === undefined ? null : JSON.stringify(override.original_mapped_value),
    originalClientValueJson: override.original_client_value === undefined ? null : JSON.stringify(override.original_client_value),
    architectEnteredValueJson: JSON.stringify(override.architect_entered_value),
    selectedValueJson: JSON.stringify(override.selected_value),
    sourceDocument: override.source_document,
    editor: override.editor,
    reason: override.reason,
    verified: override.verified,
    createdAt: override.timestamp,
  }).onConflictDoNothing();
}

export async function persistArchitectRevision(jobId: string, project: CanonicalProject, result: SimulationPackage) {
  const now = new Date().toISOString();
  const db = getDb();
  for (const override of project.architect.overrides) await persistOverrideRow(jobId, override);
  await db.insert(projectInputs).values({
    id: crypto.randomUUID(),
    projectId: project.id || "",
    version: 2,
    payloadJson: JSON.stringify(project),
    createdAt: now,
  });
  await db.insert(siteCapacityPackages).values({
    id: crypto.randomUUID(),
    jobId,
    calculatorVersion: result.final_report.site_capacity.calculator_version,
    calculationStatus: result.final_report.site_capacity.status,
    packageJson: JSON.stringify(result.final_report.site_capacity),
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: siteCapacityPackages.jobId,
    set: {
      calculatorVersion: result.final_report.site_capacity.calculator_version,
      calculationStatus: result.final_report.site_capacity.status,
      packageJson: JSON.stringify(result.final_report.site_capacity),
      updatedAt: now,
    },
  });
  await db.insert(finalReports).values({ id: crypto.randomUUID(), jobId, reportJson: JSON.stringify(result.final_report), createdAt: now });
}

export async function readSimulationRecord(jobId: string): Promise<SimulationPackage | null> {
  try {
    const db = getDb();
    const [job] = await db.select().from(simulationJobs).where(eq(simulationJobs.id, jobId)).limit(1);
    if (!job) return null;
    const inputs = await db.select().from(projectInputs).where(eq(projectInputs.projectId, job.projectId));
    const reports = await db.select().from(finalReports).where(eq(finalReports.jobId, jobId));
    const [capacityPackage] = await db.select().from(siteCapacityPackages).where(eq(siteCapacityPackages.jobId, jobId)).limit(1);
    const images = await db.select().from(generatedImages).where(eq(generatedImages.jobId, jobId));
    const tasks = await db.select().from(aiTasks).where(eq(aiTasks.jobId, jobId));
    if (!inputs.length || !reports.length) return null;
    const input = [...inputs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const report = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const project = mergeProjectData(createEmptyProject(), JSON.parse(input.payloadJson) as Partial<CanonicalProject>);
    const storedReport = JSON.parse(report.reportJson) as SimulationPackage["final_report"];
    const siteCapacity = capacityPackage
      ? JSON.parse(capacityPackage.packageJson) as SimulationPackage["final_report"]["site_capacity"]
      : storedReport.site_capacity || calculateSiteCapacity(project);
    const specialist: SimulationPackage["specialist"] = {
      site_capacity: siteCapacity,
      property_analysis: emptySection("Property and site analysis"),
      architectural_direction: emptySection("Architectural direction"),
      interior_direction: emptySection("Interior direction"),
      room_programme: siteCapacity.room_programme,
      image_prompts: images.map((image) => ({ key: image.imageKey, title: image.title, category: image.category as "exterior" | "interior", prompt: image.originalPrompt })),
    };
    for (const task of tasks) {
      const [output] = await db.select().from(aiOutputs).where(eq(aiOutputs.taskId, task.id)).limit(1);
      if (!output) continue;
      const parsed = JSON.parse(output.outputJson) as unknown;
      if (task.taskType === "property_analysis") specialist.property_analysis = parsed as SectionOutput;
      if (task.taskType === "architectural_direction") specialist.architectural_direction = parsed as SectionOutput;
      if (task.taskType === "interior_direction") specialist.interior_direction = parsed as SectionOutput;
      if (task.taskType === "image_prompts" && Array.isArray(parsed)) specialist.image_prompts = parsed as SimulationPackage["specialist"]["image_prompts"];
    }
    const finalReport = {
      ...storedReport,
      report_version: 2,
      site_capacity: siteCapacity,
      planning_sources: Object.values(siteCapacity.planning_values),
      household_profile: siteCapacity.household_profile,
      room_programme: siteCapacity.room_programme,
      floor_totals: siteCapacity.floor_allocations,
      brief_fit_result: siteCapacity.programme_fit,
      development_pathways: siteCapacity.development_pathways,
      warnings: siteCapacity.warnings,
      architect_notes: siteCapacity.architect_notes,
    } satisfies SimulationPackage["final_report"];
    return {
      job_id: job.id,
      status: job.status as SimulationPackage["status"],
      created_at: job.createdAt,
      completed_at: job.completedAt || undefined,
      project,
      specialist,
      final_report: finalReport,
      generated_images: images.map((image) => ({
        key: image.imageKey,
        title: image.title,
        category: image.category as "exterior" | "interior",
        prompt: image.originalPrompt,
        provider: image.provider,
        model: image.model,
        status: image.status as "complete" | "failed" | "skipped",
        image_url: image.imageUrl || undefined,
        error_message: image.errorMessage || undefined,
      })),
      task_statuses: tasks.map((task) => ({ task: task.taskType, provider: task.provider, model: task.model, status: task.status, error: task.errorMessage || undefined })),
    };
  } catch (error) {
    console.warn("Stored simulation could not be read.", error);
    return null;
  }
}
