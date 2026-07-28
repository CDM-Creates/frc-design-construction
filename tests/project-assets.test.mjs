import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../app/page.tsx", import.meta.url);

test("every project image referenced by the home page is present and non-empty", async () => {
  const page = await readFile(pageUrl, "utf8");
  const paths = [...new Set(
    [...page.matchAll(/["'](\/projects\/[^"']+\.(?:png|jpe?g|webp))["']/gi)]
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

test("every selected work has a public, non-empty drawing folio", async () => {
  const page = await readFile(pageUrl, "utf8");
  const folios = [...new Set(
    [...page.matchAll(/folio:\s*["'](\/projects\/folios\/[^"']+\.pdf)["']/gi)]
      .map((match) => match[1]),
  )];

  assert.equal(folios.length, 8, "Expected one privacy-safe folio for every selected project.");

  for (const path of folios) {
    const file = new URL(`../public${path}`, import.meta.url);
    const details = await stat(file);
    assert.ok(details.isFile(), `${path} is not a file.`);
    assert.ok(details.size > 100_000, `${path} appears empty or corrupt.`);
  }
});
