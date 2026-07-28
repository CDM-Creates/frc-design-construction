import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the FRC portfolio without removed partnered projects", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /FRC Design/);
  assert.match(html, /Selected work/);
  assert.doesNotMatch(html, /Kingsford|Wills Road|Student Living/i);
});

test("server-renders the property-first NSW feasibility simulator", async () => {
  const response = await render("/simulator");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Start with/);
  assert.match(html, /the address/);
  assert.match(html, /Live NSW property services/);
  assert.match(html, /Match property/);
  assert.match(html, /No AI guessing/);
});
