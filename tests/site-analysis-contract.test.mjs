import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("../app/api/site-analysis/route.ts", import.meta.url);
const simulatorUrl = new URL("../app/simulator/page.tsx", import.meta.url);

test("live lookup requires a complete NSW address and protects against stale matches", async () => {
  const [route, simulator] = await Promise.all([
    readFile(routeUrl, "utf8"),
    readFile(simulatorUrl, "utf8"),
  ]);

  assert.match(route, /four-digit postcode/);
  assert.match(simulator, /completeNSWAddress/);
  assert.match(simulator, /lookupRequestId/);
  assert.match(simulator, /requestId !== lookupRequestId\.current/);
});

test("selected cadastral lot drives parcel facts while optional planning layers remain optional", async () => {
  const route = await readFile(routeUrl, "utf8");

  assert.match(route, /planlotarea/);
  assert.match(route, /lotFeature\?\.geometry\?\.rings/);
  assert.match(route, /safePlanningLayer/);
  assert.match(route, /safeGetJson/);
  assert.match(route, /serviceReportedAreaSqm\s*\?\s*"Selected NSW cadastral lot"/);
  assert.match(route, /layerStatus/);
});

test("removed partnered projects cannot reappear in portfolio source", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /Kingsford|Wills Road|wills-road/i);
});
