import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [home, simulator, layout] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/simulator/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
]);

test("FRC portfolio source excludes the removed partnered projects", () => {
  assert.match(layout, /FRC Design/);
  assert.match(home, /Selected work/);
  assert.doesNotMatch(home, /Kingsford|Wills Road|Student Living/i);
});

test("public simulator remains a coming-soon surface", () => {
  assert.match(simulator, /coming soon/i);
  assert.match(simulator, /Property →/);
  assert.doesNotMatch(simulator, /Generate my architectural concept/);
});
