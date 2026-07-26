"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { futureSubscriptionFeatures, getSimulatorEntitlement } from "./access";
import { buildProjectConcept, type PlanningSnapshot, type ProjectType } from "./project-engine";

type SiteAnalysis = PlanningSnapshot & {
  matchedAddress: string;
  council: string;
  boundary: number[][];
  guidance: {
    verdict: string;
    pathway: string;
    explanation: string;
    code: string;
    desiredBuild: string;
    checks: { label: string; value: string; tone: string }[];
    missing: string[];
  };
  constraints: { name: string; value: string; status: string }[];
};

type SimulatorForm = {
  streetAddress: string;
  suburb: string;
  postcode: string;
  lotDp: string;
  knownLandArea: number;
  frontage: number;
  depth: number;
  lotType: "standard" | "corner" | "battleaxe";
  slope: "flat" | "gentle" | "steep";
  orientation: "north-rear" | "north-front" | "north-side" | "unknown";
  existingDwelling: boolean;
  projectGoal: ProjectType;
  storeys: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  roofForm: "flat" | "pitched" | "gable";
  materialDirection: "warm" | "light" | "brick" | "dark";
  budget: string;
  timing: string;
  mustHaves: string;
  description: string;
};

const initialForm: SimulatorForm = {
  streetAddress: "",
  suburb: "",
  postcode: "",
  lotDp: "",
  knownLandArea: 600,
  frontage: 15,
  depth: 40,
  lotType: "standard",
  slope: "gentle",
  orientation: "unknown",
  existingDwelling: false,
  projectGoal: "home",
  storeys: 2,
  bedrooms: 4,
  bathrooms: 2,
  parking: 2,
  roofForm: "flat",
  materialDirection: "warm",
  budget: "$900k–$1.2m",
  timing: "Within 12–18 months",
  mustHaves: "North-facing living, flexible study, covered outdoor room",
  description: "",
};

const projectNames: Record<ProjectType, string> = {
  home: "new family home",
  dual: "dual occupancy",
  renovation: "renovation and addition",
};

const officialSources = [
  ["NSW Spatial Viewer", "Property zoning, planning layers and mapped controls", "https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address"],
  ["NSW Housing Code", "Complying-development standards for homes, renovations and extensions", "https://www.planning.nsw.gov.au/the-planning-system/exempt-and-complying-development-policy/the-housing-code"],
  ["NSW planning pathways", "How CDC, DA and other approval routes operate", "https://www.planning.nsw.gov.au/assess-and-regulate/development-assessment/planning-approval-pathways"],
  ["Low and Mid-Rise Housing Policy", "Current settings for dual occupancies and diverse housing", "https://www.planning.nsw.gov.au/the-planning-system/housing/low-and-mid-rise-housing-policy"],
  ["BASIX", "Residential energy, water and thermal-comfort requirements", "https://www.planning.nsw.gov.au/the-planning-system/buildings/sustainable-buildings-sepp/sustainability-standards-residential-development-basix"],
  ["In-force Codes SEPP", "The current legal text for exempt and complying development", "https://legislation.nsw.gov.au/view/whole/html/inforce/current/epi-2008-0572"],
];

export default function ProjectSimulator() {
  const entitlement = getSimulatorEntitlement();
  const [form, setForm] = useState<SimulatorForm>(initialForm);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "intro") return;
    const positiveNumber = (key: string, fallback: number) => {
      const value = Number(params.get(key));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const requestedGoal = params.get("projectGoal");
    const hydratePrefill = window.setTimeout(() => {
      setForm((current) => ({
        ...current,
        streetAddress: params.get("streetAddress") ?? current.streetAddress,
        suburb: params.get("suburb") ?? current.suburb,
        postcode: (params.get("postcode") ?? current.postcode).replace(/\D/g, "").slice(0, 4),
        knownLandArea: positiveNumber("knownLandArea", current.knownLandArea),
        frontage: positiveNumber("frontage", current.frontage),
        depth: positiveNumber("depth", current.depth),
        storeys: Math.min(6, positiveNumber("storeys", current.storeys)),
        bedrooms: Math.min(16, positiveNumber("bedrooms", current.bedrooms)),
        parking: Math.min(10, positiveNumber("parking", current.parking)),
        projectGoal: requestedGoal === "home" || requestedGoal === "dual" || requestedGoal === "renovation" ? requestedGoal : current.projectGoal,
      }));
    }, 0);
    return () => window.clearTimeout(hydratePrefill);
  }, []);

  const update = <K extends keyof SimulatorForm>(key: K, value: SimulatorForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setAnalysis(null);
  };

  const concept = useMemo(() => buildProjectConcept(form, analysis), [analysis, form]);
  const officialDifference = analysis?.area
    ? Math.round(((analysis.area - form.knownLandArea) / form.knownLandArea) * 100)
    : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!entitlement.canRun) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/site-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The property check could not be completed.");
      setAnalysis(result);
      window.setTimeout(() => document.querySelector("#simulation-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The property check could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const address = [form.streetAddress, form.suburb, form.postcode && `NSW ${form.postcode}`].filter(Boolean).join(", ");
  const brief = form.description.trim() || `A ${form.storeys}-storey ${projectNames[form.projectGoal]} with ${form.bedrooms} bedrooms, ${form.bathrooms} bathrooms and ${form.parking} car spaces${form.projectGoal === "dual" ? " in each home" : ""}. Priorities include ${form.mustHaves.toLowerCase()}.`;

  return (
    <main className="simulator-page">
      <nav className="sim-nav">
        <Link className="brand" href="/" aria-label="FRC Design and Construction home"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></Link>
        <div><Link href="/#work">Selected work</Link><Link href="/#studio">Studio</Link><Link className="active" href="/simulator">Project simulator</Link></div>
        <Link className="sim-nav-cta" href="/#quote">Speak with FRC <span>↗</span></Link>
      </nav>

      <header className="sim-hero">
        <div>
          <span className="sim-kicker">FRC Project Simulator · NSW</span>
          <h1>See the project.<br /><em>Understand the limits.</em></h1>
        </div>
        <p>Combine what you know about the land with live NSW planning layers. We turn the brief into a concept-level project picture, identify the likely approval path and show exactly what must be verified before design proceeds.</p>
      </header>

      <div className="access-strip">
        <span><i />{entitlement.label}</span>
        <p>Built with a clean subscription boundary for future saved reports, comparisons and project sharing.</p>
        <button type="button" title={futureSubscriptionFeatures.join(", ")}>Subscription-ready <span>＋</span></button>
      </div>

      <section className="sim-workspace">
        <form className="sim-form" onSubmit={submit}>
          <div className="sim-form-head"><span>01 / Client inputs</span><h2>Describe the land<br />and the ambition.</h2><p>Fields marked “client supplied” remain separate from government-mapped facts in the final report.</p></div>

          <fieldset>
            <legend><i>01</i><span>Property identity<small>Used to match NSW planning records</small></span></legend>
            <label className="span-2"><span>Street address</span><input required value={form.streetAddress} onChange={(event) => update("streetAddress", event.target.value)} placeholder="31 Crown Line Drive" /></label>
            <label><span>Suburb</span><input required value={form.suburb} onChange={(event) => update("suburb", event.target.value)} placeholder="Rothbury" /></label>
            <label><span>Postcode</span><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.postcode} onChange={(event) => update("postcode", event.target.value.replace(/\D/g, ""))} placeholder="2320" /></label>
            <label className="span-2"><span>Lot / DP <small>optional</small></span><input value={form.lotDp} onChange={(event) => update("lotDp", event.target.value)} placeholder="Lot 12 / DP 123456" /></label>
          </fieldset>

          <fieldset>
            <legend><i>02</i><span>Known land dimensions<small>Client supplied—not overwritten by the map</small></span></legend>
            <label><span>Plot area</span><div className="sim-unit"><input required type="number" min="1" value={form.knownLandArea} onChange={(event) => update("knownLandArea", Number(event.target.value))} /><b>m²</b></div></label>
            <label><span>Frontage</span><div className="sim-unit"><input required type="number" min="1" step=".1" value={form.frontage} onChange={(event) => update("frontage", Number(event.target.value))} /><b>m</b></div></label>
            <label><span>Approx. depth</span><div className="sim-unit"><input required type="number" min="1" step=".1" value={form.depth} onChange={(event) => update("depth", Number(event.target.value))} /><b>m</b></div></label>
            <label><span>Lot type</span><select value={form.lotType} onChange={(event) => update("lotType", event.target.value as SimulatorForm["lotType"])}><option value="standard">Standard</option><option value="corner">Corner</option><option value="battleaxe">Battle-axe</option></select></label>
            <label><span>Site slope</span><select value={form.slope} onChange={(event) => update("slope", event.target.value as SimulatorForm["slope"])}><option value="flat">Mostly flat</option><option value="gentle">Gentle slope</option><option value="steep">Steep / unknown levels</option></select></label>
            <label><span>North orientation</span><select value={form.orientation} onChange={(event) => update("orientation", event.target.value as SimulatorForm["orientation"])}><option value="unknown">Not sure</option><option value="north-rear">North to rear</option><option value="north-front">North to street</option><option value="north-side">North to side</option></select></label>
            <label className="sim-check span-2"><input type="checkbox" checked={form.existingDwelling} onChange={(event) => update("existingDwelling", event.target.checked)} /><span>There is an existing dwelling on the site</span></label>
          </fieldset>

          <fieldset>
            <legend><i>03</i><span>Project brief<small>What the client wants to achieve</small></span></legend>
            <div className="project-type span-2">{([["home", "New home"], ["dual", "Dual occupancy"], ["renovation", "Renovate + extend"]] as const).map(([value, label]) => <button type="button" className={form.projectGoal === value ? "active" : ""} onClick={() => update("projectGoal", value)} key={value}>{label}</button>)}</div>
            <label><span>Storeys</span><input type="number" min="1" max="6" value={form.storeys} onChange={(event) => update("storeys", Number(event.target.value))} /></label>
            <label><span>Bedrooms{form.projectGoal === "dual" ? " per home" : ""}</span><input type="number" min="1" max="16" value={form.bedrooms} onChange={(event) => update("bedrooms", Number(event.target.value))} /></label>
            <label><span>Bathrooms{form.projectGoal === "dual" ? " per home" : ""}</span><input type="number" min="1" max="12" value={form.bathrooms} onChange={(event) => update("bathrooms", Number(event.target.value))} /></label>
            <label><span>Car spaces{form.projectGoal === "dual" ? " per home" : ""}</span><input type="number" min="0" max="10" value={form.parking} onChange={(event) => update("parking", Number(event.target.value))} /></label>
            <label><span>Working budget</span><input value={form.budget} onChange={(event) => update("budget", event.target.value)} /></label>
            <label><span>Target timing</span><input value={form.timing} onChange={(event) => update("timing", event.target.value)} /></label>
            <label><span>Roof form</span><select value={form.roofForm} onChange={(event) => update("roofForm", event.target.value as SimulatorForm["roofForm"])}><option value="flat">Flat / parapet</option><option value="pitched">Pitched</option><option value="gable">Gabled</option></select></label>
            <label><span>Material direction</span><select value={form.materialDirection} onChange={(event) => update("materialDirection", event.target.value as SimulatorForm["materialDirection"])}><option value="warm">Warm mineral + timber</option><option value="light">Light render</option><option value="brick">Brick + masonry</option><option value="dark">Dark contemporary</option></select></label>
            <label className="span-2"><span>Must-have spaces + priorities</span><input value={form.mustHaves} onChange={(event) => update("mustHaves", event.target.value)} placeholder="Natural light, home office, outdoor room…" /></label>
            <label className="span-2"><span>Describe the project in your own words</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="We want a calm family home that opens to the northern garden, keeps one bedroom accessible and has room for our parents to stay…" /></label>
          </fieldset>

          {error && <div className="sim-error"><b>We couldn’t complete the live property check.</b><span>{error}</span></div>}
          <button className="run-simulation" disabled={loading || form.postcode.length !== 4} type="submit">{loading ? "Checking NSW planning layers…" : "Build my project overview"}<span>{loading ? "···" : "→"}</span></button>
          <p className="sim-disclaimer">This is an early feasibility screen, not development consent, a planning certificate, legal advice or a construction-ready design.</p>
        </form>

        <aside className="site-preview">
          <div className="site-preview-head"><span>Live site brief</span><b>{address || "NSW property pending"}</b><small>{form.lotDp || "Lot / DP to be confirmed"}</small></div>
          <div className={`site-diagram ${form.projectGoal}`}>
            <div className="north-mark">N ↑</div>
            <div className="site-road">STREET · {form.frontage}m FRONTAGE</div>
            <div className="site-lot">
              <span className="depth-mark">{form.depth}m approx.</span>
              <div className="concept-envelope" style={{ width: `${concept.widthPercent}%`, height: `${concept.depthPercent}%` }}>
                <small>GENERATED FROM ROOM SCHEDULE</small>
                {form.projectGoal === "dual" && <i />}
                <b>{concept.workingWidth}m × {concept.workingDepth}m</b>
              </div>
              <div className="garden-zone">LANDSCAPE + OPEN SPACE</div>
            </div>
          </div>
          <div className="site-stats"><div><span>Scheduled internal area</span><b>{concept.requestedGfa.toLocaleString()} m²</b></div><div><span>Generated footprint</span><b>{concept.footprint.toLocaleString()} m²</b></div><div><span>Concept height</span><b>{concept.designHeight} m</b></div></div>
          <p>The mass is calculated from the room schedule below. Its placement remains provisional until setbacks, easements and surveyed levels are known.</p>
        </aside>
      </section>

      {analysis && <section className="simulation-result" id="simulation-result">
        <header className="result-heading"><div><span>02 / Generated project</span><h2>A house built from<br /><em>the actual brief.</em></h2></div><div className={`result-verdict ${concept.overallStatus}`}><small>Mapped-control result</small><strong>{concept.headline}</strong><span>{analysis.guidance.pathway}</span></div></header>

        <div className="project-story">
          <div><span>Client brief, translated</span><h3>{form.storeys}-storey {projectNames[form.projectGoal]}</h3><p>{brief}</p><dl><div><dt>Budget</dt><dd>{form.budget}</dd></div><div><dt>Timing</dt><dd>{form.timing}</dd></div><div><dt>Known land</dt><dd>{form.knownLandArea.toLocaleString()} m² · {form.frontage}m frontage</dd></div><div><dt>Orientation</dt><dd>{form.orientation.replace("-", " ")}</dd></div></dl></div>
          <div className="massing-summary"><span>Generated room schedule</span><strong>{concept.requestedGfa.toLocaleString()} m²</strong><p>{concept.summary}</p><div><i style={{ width: `${Math.min(100, concept.coveragePercent)}%` }} /><small>{concept.footprint.toLocaleString()} m² ground footprint · {concept.coveragePercent}% of client-entered land area</small></div>{concept.mappedGfaCap && <small className="mapped-cap">NSW mapped FSR ceiling: {concept.mappedGfaCap.toLocaleString()} m²</small>}</div>
        </div>

        <div className="generated-house">
          <header><div><span>Room-by-room concept</span><h2>The generated<br /><em>house plan.</em></h2></div><p>Every labelled space comes from the entered bedroom, bathroom and parking counts or from a recognised keyword in the client description. Areas are shown openly so the result can be challenged and revised.</p></header>
          <div className="generated-views">
            <div className={`generated-elevation ${form.projectGoal} ${form.roofForm} ${form.materialDirection}`}>
              <div className="elevation-caption"><span>Generated street elevation</span><b>{form.storeys} storeys · {form.roofForm} roof · {form.materialDirection} palette</b></div>
              <div className="elevation-scene">
                <div className="elevation-sun" />
                <div className="elevation-building">
                  <div className="elevation-roof" />
                  {Array.from({ length: Math.min(6, Math.max(1, form.storeys)) }, (_, index) => <div className="elevation-level" key={`elevation-${index}`}>
                    <div className="elevation-windows">{Array.from({ length: Math.min(6, Math.max(2, form.bedrooms * (form.projectGoal === "dual" ? 2 : 1))) }, (_, windowIndex) => <i key={`window-${index}-${windowIndex}`} />)}</div>
                    {index === 0 && <div className="elevation-entry"><i />{form.projectGoal === "dual" && <i />}</div>}
                  </div>)}
                  {form.projectGoal === "dual" && <div className="elevation-party-wall" />}
                </div>
                <div className="elevation-landscape"><i /><i /><i /><span /></div>
              </div>
              <p>Schematic—not a photoreal render. The visible dwelling count, storeys, roof form, openings and palette follow the selected inputs.</p>
            </div>
            <div className="generated-specification">
              <span>What was generated</span>
              <strong>{concept.requestedGfa.toLocaleString()} m² scheduled house</strong>
              <dl><div><dt>Levels</dt><dd>{concept.levels.length}</dd></div><div><dt>Ground footprint</dt><dd>{concept.footprint.toLocaleString()} m²</dd></div><div><dt>Working dimensions</dt><dd>{concept.workingWidth}m × {concept.workingDepth}m</dd></div><div><dt>Concept height</dt><dd>{concept.designHeight}m</dd></div><div><dt>External program</dt><dd>{concept.externalArea ? `${concept.externalArea} m²` : "None described"}</dd></div><div><dt>Mapped GFA limit</dt><dd>{concept.mappedGfaCap ? `${concept.mappedGfaCap.toLocaleString()} m²` : "Not returned"}</dd></div></dl>
              <p>{concept.headline}</p>
            </div>
          </div>
          <div className="generated-levels">{concept.levels.map((level, levelIndex) => <article className="generated-level" key={`${level.name}-${levelIndex}`}>
            <div className="generated-level-head"><span>0{levelIndex + 1} / {level.name}</span><strong>{level.area.toLocaleString()} m² internal</strong></div>
            <div className="room-plan">{level.rooms.map((room) => <div className={`generated-room ${room.category} ${room.area >= 24 ? "large" : room.area <= 7 ? "small" : ""}`} key={room.id}><span>{room.name}</span><b>{room.area} m²</b>{room.dwelling && <i>HOME {room.dwelling}</i>}</div>)}</div>
          </article>)}</div>
          <div className="generated-method"><div><span>How this plan was calculated</span><strong>No land-percentage placeholder.</strong><p>The engine totals a defined area for every requested room, adds circulation level by level, then derives the footprint from the largest storey. Description keywords can add specific rooms.</p></div><ul>{concept.roomAssumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div>
        </div>

        <div className="truth-grid">
          <article><header><i>01</i><span>Confirmed by NSW mapping</span></header><dl><div><dt>Address</dt><dd>{analysis.matchedAddress}</dd></div><div><dt>Council</dt><dd>{analysis.council}</dd></div><div><dt>Zone</dt><dd>{analysis.controls.zone} · {analysis.controls.zoneName}</dd></div><div><dt>LEP / instrument</dt><dd>{analysis.controls.lep}</dd></div><div><dt>Mapped height</dt><dd>{analysis.controls.maxHeight ?? "No numeric value returned"}</dd></div><div><dt>Mapped FSR</dt><dd>{analysis.controls.fsr ?? "No numeric value returned"}</dd></div><div><dt>Minimum lot-size map</dt><dd>{analysis.controls.minimumLotSize ?? "No numeric value returned"}</dd></div><div><dt>Heritage layer</dt><dd>{analysis.controls.heritage ?? "No principal layer hit"}</dd></div></dl></article>
          <article><header><i>02</i><span>Supplied by the client</span></header><dl><div><dt>Plot area</dt><dd>{form.knownLandArea.toLocaleString()} m²</dd></div><div><dt>Frontage / depth</dt><dd>{form.frontage}m / {form.depth}m approx.</dd></div><div><dt>Official parcel cross-check</dt><dd>{analysis.area?.toLocaleString() ?? "Not returned"} m²{officialDifference !== null ? ` (${officialDifference > 0 ? "+" : ""}${officialDifference}% difference)` : ""}</dd></div><div><dt>Lot / DP</dt><dd>{form.lotDp || "Not supplied"}</dd></div><div><dt>Slope</dt><dd>{form.slope}</dd></div><div><dt>Existing building</dt><dd>{form.existingDwelling ? "Yes" : "No / not advised"}</dd></div></dl></article>
          <article className="verify-card"><header><i>03</i><span>Must be verified before design freeze</span></header><ul><li>Deposited plan, title, easements and restrictions</li><li>Detail survey, contours and actual boundary dimensions</li><li>Council DCP setbacks, landscaped area and local character controls</li><li>Flood, bushfire, biodiversity, contamination and servicing constraints</li><li>Geotechnical conditions, excavation and retaining strategy</li><li>BASIX, NCC, stormwater, access and consultant requirements</li></ul></article>
        </div>

        <div className="law-check">
          <header><div><span>03 / Restriction-fit report</span><h2>Proposal versus<br />mapped controls.</h2></div><p>The generated house is tested only against controls actually returned for the matched property. Unknown setbacks and site constraints remain visibly unresolved instead of being replaced with invented values.</p></header>
          <div className="law-checks">{concept.complianceChecks.map((check) => <article className={check.status} key={check.key}><i className={check.status}>{check.status === "pass" ? "✓" : check.status === "fail" ? "×" : "!"}</i><span>{check.label}</span><strong>{check.mappedRule}</strong><small>Proposal: {check.proposed}</small><p>{check.explanation}</p><b>{check.source}</b></article>)}</div>
          <div className="law-note"><b>Important distinction</b><p>“Permitted” does not mean “approved”. A project must first be permissible in the zone, then satisfy either every complying-development standard for a CDC or the merit assessment requirements for a DA. The current in-force legislation and property-specific constraints prevail over this simulation.</p></div>
        </div>

        <div className="success-plan">
          <header><span>04 / Plan of success</span><h2>The path from this<br />screen to construction.</h2></header>
          <div className="success-steps">
            {[
              ["01", "Lock the ground truth", "Order title documents and a detail survey. Confirm the boundary, levels, trees, services, easements and restrictions.", "Before design"],
              ["02", "Complete planning due diligence", `Test the ${analysis.controls.zone} land-use rules, ${analysis.controls.lep}, current Codes SEPP, council DCP and every mapped hazard.`, "1–2 weeks"],
              ["03", "Choose the approval path", `Confirm whether ${analysis.guidance.pathway.toLowerCase()} is available. If any CDC standard fails, prepare a DA strategy rather than forcing the fit.`, "Decision gate"],
              ["04", "Design the real envelope", `Test the ${form.bedrooms}-bedroom brief against verified setbacks, height, floor area, landscape, parking, privacy, solar access and stormwater controls.`, "4–8 weeks"],
              ["05", "Coordinate compliance", "Bring in survey, planning, structural, civil/stormwater, geotechnical, energy/BASIX and other specialists required by the site.", "During design"],
              ["06", "Lodge a complete application", "Issue coordinated drawings, reports and certificates through the NSW Planning Portal to council or the certifier.", analysis.guidance.pathway.includes("CDC") ? "CDC target" : "DA target"],
              ["07", "Resolve for construction", "Address approval conditions, complete construction documentation, obtain the construction certificate where required and coordinate pricing.", "Post approval"],
              ["08", "Build with control", "Use the approved documents, required inspections and design support to protect quality, cost and compliance through delivery.", "Construction"],
            ].map(([number, title, detail, timing]) => <article key={number}><i>{number}</i><div><h3>{title}</h3><p>{detail}</p></div><span>{timing}</span></article>)}
          </div>
        </div>

        <div className="source-panel"><div><span>Official references</span><h2>Trace every assumption<br />back to its source.</h2><p>These links are intentionally visible so clients can verify the current NSW rules. Local council controls and the in-force legislation must still be checked for the exact property.</p></div><div>{officialSources.map(([name, note, href]) => <a href={href} target="_blank" rel="noreferrer" key={name}><span><b>{name}</b><small>{note}</small></span><i>↗</i></a>)}</div></div>

        <div className="subscription-preview"><div><small>Future member workspace</small><strong>Keep this property alive after the first simulation.</strong><p>The page is ready to connect reports and usage to a paid account without changing the planning engine.</p></div><ul>{futureSubscriptionFeatures.map((feature) => <li key={feature}>＋ {feature}</li>)}</ul><button type="button" disabled>Membership coming next</button></div>
      </section>}

      <footer className="sim-footer"><Link className="brand" href="/"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></Link><p>Concept intelligence for better project decisions.<br />NSW planning data verified at the time of each simulation.</p><div><Link href="/#quote">Start with FRC ↗</Link><span>© 2026 FRC Design & Construction</span></div></footer>
    </main>
  );
}
