import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTranspiled(path, replacements = []) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [from, to] of replacements) output = output.replace(from, to);
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const transitions = await importTranspiled("../app/lib/report-platform/status-transitions.ts", [
  ['from "./types";', 'from "data:text/javascript,export%20{}";'],
]);

test("order state machine permits the paid generation path", () => {
  const path = [
    ["ready_for_checkout", "awaiting_payment"],
    ["awaiting_payment", "payment_processing"],
    ["payment_processing", "paid"],
    ["paid", "queued"],
    ["queued", "securing_files"],
    ["securing_files", "analysing_property"],
    ["analysing_property", "analysing_documents"],
    ["analysing_documents", "generating_report"],
    ["generating_report", "automated_validation"],
    ["automated_validation", "approved_for_release"],
    ["approved_for_release", "completed"],
  ];
  for (const [from, to] of path) assert.equal(transitions.canTransitionOrder(from, to), true, `${from} -> ${to}`);
});

test("order state machine rejects browser-style skips", () => {
  assert.equal(transitions.canTransitionOrder("awaiting_payment", "generating_report"), false);
  assert.equal(transitions.canTransitionOrder("ready_for_checkout", "paid"), false);
  assert.throws(() => transitions.assertOrderTransition("draft", "completed"), /Invalid order status transition/);
});

const configUrl = "data:text/javascript,export%20const%20getPlatformMode=()=>%22test%22;export%20const%20getPlatformDataBackend=()=>%22node%22;";
const storage = await importTranspiled("../app/lib/report-platform/storage.ts", [
  ['from "./config";', `from "${configUrl}";`],
]);

test("file validator accepts signature-matched PDF and rejects disguised files", async () => {
  const pdf = new File([new TextEncoder().encode("%PDF-1.7\nmock")], "survey.pdf", { type: "application/pdf" });
  const valid = await storage.validatePrivateFile(pdf);
  assert.equal(valid.detectedMimeType, "application/pdf");
  assert.equal(valid.sha256.length, 64);
  const disguised = new File([new TextEncoder().encode("<script>alert(1)</script>")], "survey.pdf", { type: "application/pdf" });
  await assert.rejects(() => storage.validatePrivateFile(disguised), /does not match/);
});

test("file validator rejects unsupported extensions and oversized input", async () => {
  const script = new File(["echo hi"], "payload.html", { type: "text/html" });
  await assert.rejects(() => storage.validatePrivateFile(script), /use PDF/);
  const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
  await assert.rejects(() => storage.validatePrivateFile(oversized), /maximum file size/);
});
