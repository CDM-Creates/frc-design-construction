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

test("simulator presents a property-first live NSW workflow", () => {
  assert.match(simulator, /Start with<br \/><em>the address\.<\/em>/);
  assert.match(simulator, /Live NSW property services/);
  assert.match(simulator, /Match property/);
  assert.match(simulator, /No AI guessing/);
  assert.match(simulator, /Official NSW property matched/);
});
