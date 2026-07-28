import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../app/page.tsx", import.meta.url);
const projectDataUrl = new URL("../app/data/projects.ts", import.meta.url);

test("every project image referenced by central project data is present and non-empty", async () => {
  const page = await readFile(pageUrl, "utf8");
  const projectData = await readFile(projectDataUrl, "utf8");
  const paths = [...new Set(
    [...projectData.matchAll(/["'](\/projects\/[^"']+\.(?:png|jpe?g|webp))["']/gi)]
      .map((match) => match[1]),
  )];

  assert.ok(paths.length >= 24, `Expected a complete project library, found only ${paths.length} referenced images.`);
  assert.doesNotMatch(page, /standardGallery/, "Project galleries must list their files explicitly.");

  for (const path of paths) {
    const file = new URL(`../public${path}`, import.meta.url);
    const details = await stat(file);
    assert.ok(details.isFile(), `${path} is not a file.`);
    assert.ok(details.size > 1_000, `${path} appears empty or corrupt.`);
  }
});

test("every published project folio is public, privacy-safe and non-empty", async () => {
  const projectData = await readFile(projectDataUrl, "utf8");
  const folios = [...new Set(
    [...projectData.matchAll(/folio:\s*["'](\/projects\/folios\/[^"']+\.pdf)["']/gi)]
      .map((match) => match[1]),
  )];

  assert.equal(folios.length, 8, "Expected the existing privacy-safe folio collection to remain complete.");

  for (const path of folios) {
    const file = new URL(`../public${path}`, import.meta.url);
    const details = await stat(file);
    assert.ok(details.isFile(), `${path} is not a file.`);
    assert.ok(details.size > 100_000, `${path} appears empty or corrupt.`);
  }
});
