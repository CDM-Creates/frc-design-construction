import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const apiPath = new URL("../app/api/site-analysis/route.ts", import.meta.url);
const simulatorPath = new URL("../app/page.tsx", import.meta.url);

const [apiSource, simulatorSource] = await Promise.all([
  readFile(apiPath, "utf8"),
  readFile(simulatorPath, "utf8"),
]);

test("matches only after the complete NSW address fields have been entered", () => {
  assert.match(apiSource, /function parseAddress/);
  assert.match(apiSource, /four-digit postcode/);
  assert.match(simulatorSource, /postcode\.length !== 4/);
});

test("prevents stale address requests and stale lot identity", () => {
  assert.match(simulatorSource, /const siteAnalysisRequestId = useRef\(0\)/);
  assert.match(simulatorSource, /requestId !== siteAnalysisRequestId\.current/);
  assert.match(simulatorSource, /setLotDp\(""\)/);
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
  assert.match(apiSource, /const clientSuppliedAreaSqm = positiveNumber\(inputs\.knownLandArea\)/);
  assert.match(apiSource, /clientSuppliedAreaSqm,/);
  assert.match(apiSource, /surveyedAreaSqm: null/);
  assert.match(apiSource, /safePlanningLayer\(11, "floor-space ratio"/);
  assert.match(apiSource, /safePlanningLayer\(22, "minimum lot size"/);
  assert.match(simulatorSource, /client_site_area: String\(landArea\)/);
  assert.doesNotMatch(simulatorSource, /setLandArea\(Math\.round\(result\.area\)\)/);
});
