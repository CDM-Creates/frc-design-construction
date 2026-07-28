import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const apiPath = new URL("../app/api/site-analysis/route.ts", import.meta.url);
const simulatorPath = new URL("../app/simulator/page.tsx", import.meta.url);

const [apiSource, simulatorSource] = await Promise.all([
  readFile(apiPath, "utf8"),
  readFile(simulatorPath, "utf8"),
]);

test("matches a street-only input once suburb and postcode are complete", () => {
  assert.match(simulatorSource, /buildLookupAddress\(form\.streetAddress, form\.suburb, form\.postcode\)/);
  assert.match(simulatorSource, /return `\$\{street\}, \$\{cleanSuburb\}, NSW \$\{cleanPostcode\}`/);
  assert.match(simulatorSource, /\[form\.streetAddress, form\.suburb, form\.postcode/);
});

test("prevents stale address requests and stale lot identity", () => {
  assert.match(simulatorSource, /const lookupSequence = useRef\(0\)/);
  assert.match(simulatorSource, /new AbortController\(\)/);
  assert.match(simulatorSource, /requestId !== lookupSequence\.current/);
  assert.match(simulatorSource, /changesPropertyIdentity \? \{ lotDp: "" \}/);
});

test("uses the selected cadastral lot for parcel area instead of the broader property polygon", () => {
  assert.match(apiSource, /returnGeometry: "true"[\s\S]*outSR: "4326"/);
  assert.match(apiSource, /serviceReportedAreaSqm = positiveNumber\(lot\?\.planlotarea\)/);
  assert.match(apiSource, /calculatedGeometryAreaSqm = geometryAreaSqm\(parcelRings\)/);
  assert.match(apiSource, /mappedParcelAreaSqm = serviceReportedAreaSqm \?\? calculatedGeometryAreaSqm/);
  assert.match(apiSource, /propertyAggregateAreaSqm = positiveNumber\(property\?\.attributes\?\.Shape__Area\)/);
  assert.doesNotMatch(apiSource, /area:\s*propertyAggregateAreaSqm/);
});

test("keeps client area separate and makes optional planning layers non-fatal", () => {
  assert.match(apiSource, /clientSuppliedAreaSqm: positiveNumber\(inputs\.knownLandArea\)/);
  assert.match(apiSource, /surveyedAreaSqm: null/);
  assert.match(apiSource, /safePlanningLayer\(11, "floor-space ratio"/);
  assert.match(apiSource, /safePlanningLayer\(22, "minimum lot size"/);
  assert.match(simulatorSource, /knownLandArea: current\.knownLandArea/);
});
