import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [home, simulator, layout, planningWizard] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/simulator/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/components/planning-simulation-wizard.tsx", import.meta.url), "utf8"),
]);

test("FRC portfolio source excludes the removed partnered projects", () => {
  assert.match(layout, /FRC Design/);
  assert.match(home, /Selected work/);
  assert.doesNotMatch(home, /Kingsford|Wills Road|Student Living/i);
});

test("public simulator renders the production planning wizard", () => {
  assert.match(simulator, /PlanningSimulationWizard/);
  assert.match(simulator, /Preliminary property-planning assessment/);
  assert.doesNotMatch(simulator, /coming soon/i);
});

test("simulator pricing survives reloads without a rate-limited preview request", () => {
  assert.match(planningWizard, /calculateCataloguePrice/);
  assert.doesNotMatch(planningWizard, /fetch\("\/api\/planning-simulation\/pricing"/);
  assert.match(planningWizard, /Current price estimate/);
});
