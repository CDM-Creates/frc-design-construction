import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const documentCategoriesUrl = dataUrl(transpile(
  await read("../app/lib/planning-simulation/document-categories.ts"),
));
const catalogueSource = (await read("../app/lib/report-platform/report-catalogue.ts"))
  .replace(
    'from "../planning-simulation/document-categories";',
    `from "${documentCategoriesUrl}";`,
  );
const catalogueUrl = dataUrl(transpile(catalogueSource));
const catalogue = await import(catalogueUrl);

const registrySource = transpile(await read("../app/lib/report-platform/report-template-registry.ts"))
  .replace('from "./report-catalogue";', `from "${catalogueUrl}";`)
  .replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const registry = await import(dataUrl(registrySource));

test("options-comparison uses the spec template id frc-options-comparison-v1", () => {
  assert.equal(catalogue.REPORT_BY_ID.get("detailed_options_comparison").templateId, "frc-options-comparison-v1");
  assert.ok(registry.REPORT_TEMPLATE_REGISTRY.some((template) => template.id === "frc-options-comparison-v1"));
  assert.ok(!registry.REPORT_TEMPLATE_REGISTRY.some((template) => template.id === "frc-detailed-options-comparison-v1"));
});

const disputes = await import(dataUrl(transpile(await read("../app/lib/report-platform/disputes.ts"))));

test("only one included factual correction is accepted per order", () => {
  const first = disputes.enforceSingleIncludedCorrection({ entitlementType: "included_factual_correction", existingEntitlementTypes: [] });
  assert.equal(first.allowed, true);
  const second = disputes.enforceSingleIncludedCorrection({ entitlementType: "included_factual_correction", existingEntitlementTypes: ["included_factual_correction"] });
  assert.equal(second.allowed, false);
  assert.match(second.reason, /already been used/i);
  const paid = disputes.enforceSingleIncludedCorrection({ entitlementType: "paid_detailed_review", existingEntitlementTypes: ["included_factual_correction"] });
  assert.equal(paid.allowed, true);
});

const marketing = await import(dataUrl(transpile(await read("../app/lib/report-platform/marketing-content.ts"))));

test("turnaround wording is a target, never a guarantee", () => {
  const copy = marketing.getTurnaroundCopy();
  assert.equal(copy.guaranteed, false);
  assert.match(copy.target, /^Target generation time/);
  assert.ok(marketing.PROHIBITED_MARKETING_CLAIMS.includes("guaranteed approval"));
});

test("client-facing API responses avoid the forbidden 'shortly' turnaround wording", async () => {
  const files = [
    "../app/api/site-analysis/route.ts",
    "../app/api/planning-simulation/scope/route.ts",
    "../app/api/planning-simulation/pricing/route.ts",
    "../app/api/quote-request/route.ts",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.ok(!/try again shortly/i.test(source), `${file} still promises "shortly"`);
  }
});

const visualSource = transpile(await read("../app/lib/report-platform/architectural-visualisations.ts"))
  .replace('from "./report-catalogue";', `from "${catalogueUrl}";`)
  .replace('from "./types";', 'from "data:text/javascript,export%20{}";');
const visuals = await import(dataUrl(visualSource));

test("mock visualisation image bytes carry the mandatory disclaimer", () => {
  const image = visuals.renderMockVisualisationImage({
    visualisationType: "constraint_overlay",
    caption: "Granny Flat Feasibility Report concept.",
    disclaimer: visuals.VISUAL_DISCLAIMER,
    legend: [{ label: "Supported by evidence", status: "verified", colour: "green" }],
  });
  assert.equal(image.mediaType, "image/svg+xml");
  assert.equal(image.extension, "svg");
  assert.ok(image.bytes.byteLength > 0);
  const text = new TextDecoder().decode(image.bytes);
  assert.match(text, /Indicative concept visualisation only/);
});

test("report pack includes risk-register version, review and council files, and accepted images", async () => {
  const pack = await read("../app/lib/report-platform/report-pack.ts");
  assert.match(pack, /RISK_REGISTER_VERSION/);
  assert.match(pack, /riskRegisterVersion:/);
  assert.match(pack, /95_Professional_Review_Record\.pdf/);
  assert.match(pack, /96_Council_Readiness_Checklist\.pdf/);
  assert.match(pack, /renderMockVisualisationImage/);
});

test("completion email lists the purchased reports and a secure download link", async () => {
  const notifications = await read("../app/lib/report-platform/notification-provider.ts");
  assert.match(notifications, /The report pack includes/);
  assert.match(notifications, /Download report pack/);
  assert.match(notifications, /reportNames/);
});
