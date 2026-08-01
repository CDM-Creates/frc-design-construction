import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("marketing routes and shared site chrome are present", () => {
  for (const route of ["services", "portfolio", "process", "about", "contact", "quote", "privacy", "terms", "disclaimer", "accessibility"]) {
    assert.ok(existsSync(join(root, "app", route, "page.tsx")), `${route} route should exist`);
  }
  const layout = read("app/layout.tsx");
  assert.match(layout, /<SiteChrome>/);
  assert.match(read("app/components/site-header.tsx"), /Request a Quote/);
  assert.match(read("app/components/site-footer.tsx"), /Design Notes launching soon/);
});

test("company and social details come from one editable configuration", () => {
  const config = read("app/config/site.ts");
  assert.match(config, /companyName: "FRC Design & Construction"/);
  assert.match(config, /leadArchitect: "Sheila Del Monte"/);
  assert.match(config, /email: "frcdesignconstruction@gmail\.com"/);
  assert.match(config, /emailLink: "mailto:frcdesignconstruction@gmail\.com"/);
  assert.match(config, /phoneLink: "tel:\+61420978236"/);
  assert.match(config, /instagram: null/);
  assert.match(config, /linkedIn: null/);
  assert.match(config, /facebook: null/);
  assert.match(config, /pinterest: null/);
});

test("portfolio uses central project data, supported filters and the supplied drawing archive", () => {
  const data = read("app/data/projects.ts");
  const explorer = read("app/portfolio/portfolio-explorer.tsx");
  assert.match(explorer, /All Projects/);
  assert.match(explorer, /aria-pressed/);
  assert.match(data, /Nancy Street Addition/);
  assert.match(data, /Japura Place Addition/);
  assert.match(data, /Yorklea Road Residence/);
  assert.match(data, /Kildare Road Secondary Dwelling/);
  assert.match(data, /St Kilda Road Interior Conversion/);
  const imported = join(root, "public", "projects", "portfolio-import");
  const images = readdirSync(imported);
  assert.ok(images.length >= 10);
  assert.equal(images.some((name) => name.toLowerCase().endsWith(".pdf")), false, "source PDFs with private title-block information must not be public");
});

test("contact form validates through a server-side integration with honeypot protection", () => {
  const form = read("app/contact/contact-form.tsx");
  const route = read("app/api/contact-request/route.ts");
  assert.match(form, /name="website"/);
  assert.match(form, /required/);
  assert.match(route, /RESEND_API_KEY/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /frcdesignconstruction@gmail\.com/);
});

test("SEO discovery routes and the new social card are configured", () => {
  assert.ok(existsSync(join(root, "app", "sitemap.ts")));
  assert.ok(existsSync(join(root, "app", "robots.ts")));
  assert.ok(existsSync(join(root, "public", "og-v2.png")));
  assert.match(read("app/layout.tsx"), /og-v2\.png/);
});
