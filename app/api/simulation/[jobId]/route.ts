import { getSimulationMemory } from "../../../lib/simulation-memory";
import { setSimulationMemory } from "../../../lib/simulation-memory";
import { calculateSiteCapacity } from "../../../lib/ai/site-capacity";
import type { HouseholdProfile, PlanningValueKey } from "../../../lib/ai/contracts";
import type { ProjectRoomOverride } from "../../../lib/project-data";
import { persistArchitectRevision, readSimulationRecord } from "../../../lib/simulation-repository";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const memory = getSimulationMemory(jobId);
  if (memory) return Response.json(memory, { headers: { "Cache-Control": "no-store" } });
  const stored = await readSimulationRecord(jobId);
  if (stored) return Response.json(stored, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ error: "This simulation result is unavailable or has expired from temporary storage." }, { status: 404 });
}

type ArchitectRevisionBody = {
  editor?: string;
  reason?: string;
  sourceDocument?: string;
  verified?: boolean;
  values?: Partial<Record<PlanningValueKey | "surveyed_site_area", string | number | boolean | null>>;
  lotType?: string;
  frontBoundaryConfirmed?: boolean;
  householdProfile?: HouseholdProfile;
  architectNotes?: string[];
  roomOverrides?: ProjectRoomOverride[];
};

const allowedFields = new Set<PlanningValueKey | "surveyed_site_area">([
  "surveyed_site_area", "site_width", "site_depth", "fsr", "site_coverage",
  "front_setback", "rear_setback", "left_side_setback", "right_side_setback",
  "landscaped_area", "private_open_space", "height_limit", "permitted_storeys",
  "minimum_lot_size", "heritage", "flooding", "bushfire",
]);

export async function PATCH(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const configuredToken = process.env.ARCHITECT_REVIEW_TOKEN;
  const suppliedToken = request.headers.get("x-architect-token") || "";
  if (!configuredToken || suppliedToken !== configuredToken) {
    return Response.json({ error: "Architect authorisation is required." }, { status: 401 });
  }
  const { jobId } = await context.params;
  const current = getSimulationMemory(jobId) || await readSimulationRecord(jobId);
  if (!current) return Response.json({ error: "The simulation result could not be found." }, { status: 404 });
  const body = await request.json() as ArchitectRevisionBody;
  const editor = String(body.editor || "").trim().slice(0, 160);
  const reason = String(body.reason || "").trim().slice(0, 1000);
  if (!editor || !reason) return Response.json({ error: "Architect name and reason for change are required." }, { status: 400 });
  const project = current.project;
  const now = new Date().toISOString();
  for (const [field, entered] of Object.entries(body.values || {})) {
    if (!allowedFields.has(field as PlanningValueKey | "surveyed_site_area") || entered === "" || entered === null) continue;
    const mapped = project.planning.source_values[field]?.value
      ?? (field === "surveyed_site_area" ? project.property.mapped_site_area : null);
    const client = field === "surveyed_site_area"
      ? project.property.client_site_area || project.property.site_area
      : null;
    project.architect.overrides.push({
      id: crypto.randomUUID(),
      field,
      original_mapped_value: mapped,
      original_client_value: client,
      architect_entered_value: entered,
      selected_value: entered,
      source_document: String(body.sourceDocument || "").trim().slice(0, 500) || undefined,
      editor,
      timestamp: now,
      reason,
      verified: body.verified === true,
    });
  }
  if (["standard", "corner", "battleaxe", "tapered", "irregular"].includes(body.lotType || "")) project.architect.confirmed_lot_type = body.lotType || "";
  if (typeof body.frontBoundaryConfirmed === "boolean") project.architect.front_boundary_confirmed = body.frontBoundaryConfirmed;
  if (["efficient", "comfortable", "generous"].includes(body.householdProfile || "")) project.architect.household_profile = body.householdProfile as HouseholdProfile;
  if (Array.isArray(body.architectNotes)) project.architect.notes = body.architectNotes.map((note) => String(note).trim().slice(0, 2000)).filter(Boolean).slice(0, 30);
  if (Array.isArray(body.roomOverrides)) {
    project.architect.room_overrides = body.roomOverrides
      .filter((item) => typeof item?.room_id === "string")
      .map((item) => ({
        room_id: item.room_id.slice(0, 120),
        floor: item.floor?.slice(0, 80),
        recommended_width_m: typeof item.recommended_width_m === "number" && item.recommended_width_m > 0 ? item.recommended_width_m : undefined,
        recommended_depth_m: typeof item.recommended_depth_m === "number" && item.recommended_depth_m > 0 ? item.recommended_depth_m : undefined,
        locked: item.locked,
        priority: item.priority,
      }));
  }
  project.metadata.updated_at = now;
  const capacity = calculateSiteCapacity(project);
  const updated = {
    ...current,
    project,
    completed_at: now,
    specialist: { ...current.specialist, site_capacity: capacity, room_programme: capacity.room_programme },
    final_report: {
      ...current.final_report,
      site_capacity: capacity,
      planning_sources: Object.values(capacity.planning_values),
      household_profile: capacity.household_profile,
      room_programme: capacity.room_programme,
      floor_totals: capacity.floor_allocations,
      brief_fit_result: capacity.programme_fit,
      development_pathways: capacity.development_pathways,
      warnings: capacity.warnings,
      architect_notes: capacity.architect_notes,
    },
  };
  setSimulationMemory(updated);
  try {
    await persistArchitectRevision(jobId, project, updated);
  } catch (error) {
    console.error("Architect revision persistence failed", error);
    return Response.json({ error: "The revision was calculated but could not be saved. Check the D1 migration." }, { status: 500 });
  }
  return Response.json(updated, { headers: { "Cache-Control": "no-store" } });
}
