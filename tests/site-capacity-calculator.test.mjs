import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const calculatorSource = await readFile(new URL("../app/lib/ai/site-capacity.ts", import.meta.url), "utf8");
const calculatorJs = ts.transpileModule(calculatorSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { calculateSiteCapacity } = await import(`data:text/javascript;base64,${Buffer.from(calculatorJs).toString("base64")}`);

const project = (patch = {}) => ({
  version: 1,
  client: { name: "Test Client", email: "test@example.com", phone: "0400000000", preferred_contact_method: "Email", company: "" },
  property: {
    address: "88 Hyatts Road, Oakhurst NSW 2761", suburb: "Oakhurst", state: "NSW", postcode: "2761",
    lot_details: "Lot 1109 / DP263160", site_width: "14.9", site_depth: "37", site_area: "550",
    client_site_area: "550", mapped_site_area: "550", calculated_geometry_area: "550", surveyed_site_area: "",
    selected_parcel_id: "1109//DP263160", parcel_geometry_source: "NSW cadastral lot layer 8", parcel_geometry: [],
    parcel_rectangularity: "0.998", parcel_irregularity: "regular", lot_type: "standard", slope: "gentle",
    orientation: "unknown", existing_structures: "Existing dwelling", site_notes: "",
    ...(patch.property || {}),
  },
  planning: {
    council: "Blacktown", zoning: "R2", zone_name: "Low Density Residential", planning_instrument: "Blacktown LEP",
    height_limit: "9", floor_space_ratio: "0.5:1", minimum_lot_size: "450", site_coverage: "50%",
    landscaped_area: "30%", private_open_space: "24", setbacks: "", front_setback: "4.5", rear_setback: "6",
    side_setback_left: "0.9", side_setback_right: "0.9", heritage: "", bushfire: "", flooding: "",
    source_values: {
      parcel_area: { value: 550, unit: "m²", sourceName: "NSW cadastral lot layer 8", status: "mapped" },
      fsr: { value: "0.5:1", sourceName: "NSW Planning Portal", status: "mapped" },
    },
    planning_documents: [], verified_items: [], unverified_items: [],
    ...(patch.planning || {}),
  },
  ambition: {
    project_type: "home", storeys: "2", bedrooms: "4", bathrooms: "2", parking: "2",
    special_rooms: ["Study", "Covered outdoor entertaining"], architectural_style: "Contemporary",
    interior_style: "Warm contemporary", sustainability_goals: [], accessibility_requirements: "",
    lifestyle_requirements: "",
    ...(patch.ambition || {}),
  },
  roadmap: { budget: "", estimated_construction_cost: "", preferred_start_date: "", completion_goal: "", approval_status: "", approval_pathway: "DA", finance_status: "", additional_notes: "", ...(patch.roadmap || {}) },
  simulation: { client_description: "A light-filled four-bedroom family home with a study and outdoor entertaining.", exterior_materials: "", interior_materials: "", colour_preferences: "", roof_style: "", landscaping: "", pool: "", garage_or_carport: "", natural_light: "High priority", privacy: "Protect neighbours", views: "", inspiration_links: [], additional_instructions: "", uploaded_files: [], ...(patch.simulation || {}) },
  consent: { concept_disclaimer_accepted: true },
  architect: {
    household_profile: "comfortable", confirmed_lot_type: "standard", front_boundary_confirmed: true,
    notes: [], overrides: [], room_overrides: [],
    ...(patch.architect || {}),
  },
  metadata: { source: "test", created_at: "2026-07-28T00:00:00.000Z", updated_at: "2026-07-28T00:00:00.000Z" },
});

test("88 Hyatts Road selects the approximately 550 m² mapped lot, never the legacy 805 m² property aggregate", () => {
  const result = calculateSiteCapacity(project({ property: { client_site_area: "805", site_area: "805", mapped_site_area: "550", calculated_geometry_area: "549.8" } }));
  assert.equal(result.site_area_sqm, 550);
  assert.equal(result.area_source, "mapped");
  assert.notEqual(result.site_area_sqm, 805);
  assert.equal(result.status, "conflict_requires_review");
});

test("surveyed area overrides mapped and client areas while preserving all values", () => {
  const result = calculateSiteCapacity(project({ property: { client_site_area: "600", mapped_site_area: "550", surveyed_site_area: "548" } }));
  assert.equal(result.site_area_sqm, 548);
  assert.equal(result.area_source, "surveyed");
  assert.equal(result.areas.mappedParcelAreaSqm, 550);
  assert.equal(result.areas.clientSiteAreaSqm, 600);
});

test("mapped area overrides client area when no survey exists", () => {
  const result = calculateSiteCapacity(project({ property: { client_site_area: "555", mapped_site_area: "550", surveyed_site_area: "" } }));
  assert.equal(result.site_area_sqm, 550);
  assert.equal(result.area_source, "mapped");
});

test("an area discrepancy greater than three percent creates a visible conflict", () => {
  const result = calculateSiteCapacity(project({ property: { client_site_area: "600", mapped_site_area: "550" } }));
  assert.equal(result.status, "conflict_requires_review");
  assert.ok(result.conflicts.some((item) => item.includes("differ by")));
});

test("missing meaningful controls returns insufficient_data rather than a land-area guess", () => {
  const result = calculateSiteCapacity(project({ planning: {
    floor_space_ratio: "", site_coverage: "", landscaped_area: "", private_open_space: "",
    front_setback: "", rear_setback: "", side_setback_left: "", side_setback_right: "",
    source_values: {},
  } }));
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.envelope.preliminary_max_gfa_sqm, undefined);
});

test("one-storey and two-storey capacities differ when footprint is the limiting control", () => {
  const one = calculateSiteCapacity(project({ ambition: { storeys: "1" }, planning: { floor_space_ratio: "", site_coverage: "40%", landscaped_area: "", private_open_space: "", front_setback: "", rear_setback: "", side_setback_left: "", side_setback_right: "" } }));
  const two = calculateSiteCapacity(project({ ambition: { storeys: "2" }, planning: { floor_space_ratio: "", site_coverage: "40%", landscaped_area: "", private_open_space: "", front_setback: "", rear_setback: "", side_setback_left: "", side_setback_right: "" } }));
  assert.ok((two.envelope.preliminary_max_gfa_sqm || 0) > (one.envelope.preliminary_max_gfa_sqm || 0));
});

test("four bedrooms and two bathrooms produces exactly two total bathroom spaces", () => {
  const result = calculateSiteCapacity(project());
  const bathrooms = result.room_programme.filter((room) => /bathroom|ensuite/i.test(room.room_name));
  assert.deepEqual(bathrooms.map((room) => room.room_name).sort(), ["Family bathroom", "Main ensuite"]);
});

test("room and floor totals reconcile exactly", () => {
  const result = calculateSiteCapacity(project());
  const rooms = result.room_programme.reduce((sum, room) => sum + room.allocated_area_sqm, 0);
  const floors = result.floor_allocations.reduce((sum, floor) => sum + floor.total_area_sqm, 0);
  assert.equal(Math.round(rooms * 10), Math.round(floors * 10));
});

test("negative, malformed and impossible controls are rejected", () => {
  const result = calculateSiteCapacity(project({ planning: {
    floor_space_ratio: "-0.5", site_coverage: "banana", landscaped_area: "900%",
    private_open_space: "", front_setback: "-4", rear_setback: "0",
    side_setback_left: "99999999", side_setback_right: "x",
  } }));
  assert.ok(result.conflicts.some((item) => item.includes("malformed")));
});

test("irregular parcel geometry keeps the setback envelope provisional", () => {
  const result = calculateSiteCapacity(project({ property: { parcel_irregularity: "irregular", lot_type: "irregular", parcel_rectangularity: "0.62" }, architect: { confirmed_lot_type: "irregular", front_boundary_confirmed: false } }));
  assert.equal(result.parcel_analysis.envelopeStatus, "provisional");
  assert.match(result.parcel_analysis.envelopeNote, /provisional/i);
});

test("architect override preserves original values and drives the selected control", () => {
  const override = {
    id: "override-1", field: "fsr", original_mapped_value: "0.5:1", original_client_value: null,
    architect_entered_value: "0.45:1", selected_value: "0.45:1", source_document: "Planning certificate",
    editor: "Lead Architect", timestamp: "2026-07-28T01:00:00.000Z", reason: "Verified against certificate", verified: true,
  };
  const result = calculateSiteCapacity(project({ architect: { overrides: [override] } }));
  assert.equal(result.planning_values.fsr.value, "0.45:1");
  assert.equal(result.architect_overrides[0].original_mapped_value, "0.5:1");
});

test("database reload reconstructs specialist output instead of placeholder sections", async () => {
  const repository = await readFile(new URL("../app/lib/simulation-repository.ts", import.meta.url), "utf8");
  assert.match(repository, /aiOutputs/);
  assert.match(repository, /task\.taskType === "property_analysis"/);
  assert.match(repository, /siteCapacityPackages/);
  assert.doesNotMatch(repository, /Specialist output stored separately/);
});
