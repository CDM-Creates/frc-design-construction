"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mergeProjectData, readStoredProject, writeStoredProject } from "./lib/project-data";
import { projects as allProjects } from "./data/projects";

const capabilities = [
  ["01", "Feasibility", "Planning controls, site potential and a clear path before you commit."],
  ["02", "Design", "Architecture shaped around your brief, budget and the way you want to live."],
  ["03", "Approvals", "A coordinated submission managed from first drawing to determination."],
  ["04", "Delivery", "Detailed documentation that gives builders fewer questions and you more certainty."],
];

const projects = allProjects.filter((project) => project.featured).slice(0, 6);
const projectStories = Object.fromEntries(projects.map((project) => [project.slug, project.summary])) as Record<string, string>;

const materialSchemes = [
  { name: "Warm mineral", note: "Soft, enduring and naturally tactile.", colours: ["#d8cdbc", "#867765", "#332f2a"], tags: ["Mineral render", "Spotted gum", "Bronze aluminium"] },
  { name: "Quiet contrast", note: "A crisp palette with grounded depth.", colours: ["#eeeae0", "#515954", "#191d1b"], tags: ["Fine render", "Textured masonry", "Charcoal metal"] },
  { name: "Earth + light", note: "Warm masonry balanced with pale surfaces.", colours: ["#c68a60", "#ede5d5", "#736b5c"], tags: ["Face brick", "Lime render", "Sandstone paving"] },
];

type SiteAnalysis = {
  matchedAddress: string;
  fullAddress?: string;
  addressDetails?: { streetAddress: string; suburb: string; postcode: string };
  council: string;
  area: number | null;
  mappedParcelAreaSqm?: number | null;
  calculatedGeometryAreaSqm?: number | null;
  parcelId?: string | null;
  parcelGeometry?: number[][][];
  parcelShape?: { rectangularity: number | null; irregularity: "regular" | "possibly_irregular" | "irregular" | "unknown" };
  lotDp?: string;
  siteDimensions?: { frontage: number | null; depth: number | null; source: string };
  boundary: number[][];
  controls: { zone: string; zoneName: string; lep: string; maxHeight: string | null; fsr: string | null; minimumLotSize: string | null; heritage: string | null; bushfire?: string | null; flooding?: string | null };
  planningFields?: Record<string, { value: string | number | boolean | null; sourceName: string; sourceLayer?: string; sourceFeatureId?: string | null; retrievedAt?: string; status: string }>;
  opportunities: string[][];
  constraints: { name: string; value: string; status: string }[];
  guidance: {
    verdict: string;
    pathway: string;
    explanation: string;
    code: string;
    desiredBuild: string;
    checks: { label: string; value: string; tone: string }[];
    missing: string[];
  };
  analysedAt: string;
};

type QuoteProjectSnapshot = {
  sourceStep: string;
  address: string;
  suburb: string;
  postcode: string;
  lotDp: string;
  landArea: number;
  frontage: number;
  depth: number;
  lotType: string;
  slope: string;
  existingDwelling: boolean;
  storeys: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  mappedParcelArea: number | null;
  calculatedGeometryArea: number | null;
  parcelId: string;
  projectGoal: string;
  roadmapPath: string;
  priorities: string[];
  propertyVerified: boolean;
  planning: {
    council: string;
    zone: string;
    zoneName: string;
    maxHeight: string;
    fsr: string;
    minimumLotSize: string;
    heritage: string;
    bushfire: string;
    flooding: string;
  };
};

function QuoteRoadmapCta({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="roadmap-cta">
      <div>
        <small>Your highest-leverage next move</small>
        <strong>Stage 1 · Property check</strong>
        <p>Confirm the NSW parcel, zoning and mapped site facts for the address you entered.</p>
        <strong>Stage 2 · Project brief</strong>
        <p>Your client inputs stay exactly as entered: build type, site dimensions, goals, budget, timing and approvals.</p>
        <strong>Stage 3 · Request a quote</strong>
        <p><b>Review the details already supplied, add your contact information and send the complete brief directly to the head architect.</b></p>
      </div>
      <button type="button" className="roadmap-quote-trigger" onClick={onOpen}>Request a quote<span>↗</span></button>
    </div>
  );
}

function QuoteRequestModal({ snapshot, onClose }: { snapshot: QuoteProjectSnapshot; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [preferredContact, setPreferredContact] = useState("Email");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const stored = readStoredProject();
    const hydrate = window.setTimeout(() => {
      setFullName(stored.client.name);
      setEmail(stored.client.email);
      setPhone(stored.client.phone);
      setCompany(stored.client.company);
      setPreferredContact(stored.client.preferred_contact_method || "Email");
      setBudget(stored.roadmap.budget);
      setTimeline(stored.roadmap.completion_goal || stored.roadmap.preferred_start_date);
      setMessage(stored.simulation.client_description || stored.roadmap.additional_notes);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "submitting") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, status]);

  const submitQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed) {
      setStatus("error");
      setErrorMessage("Please confirm that the carried-forward project details are correct.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    const stored = readStoredProject();
    writeStoredProject(mergeProjectData(stored, {
      client: { ...stored.client, name: fullName, email, phone, company, preferred_contact_method: preferredContact },
      roadmap: { ...stored.roadmap, budget: budget || stored.roadmap.budget, completion_goal: timeline || stored.roadmap.completion_goal },
      simulation: { ...stored.simulation, client_description: message || stored.simulation.client_description },
    }));
    try {
      const response = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, company, preferredContact, budget, timeline, message, confirmed, website, project: snapshot }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The quote request could not be sent.");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "The quote request could not be sent.");
    }
  };

  const projectType = snapshot.projectGoal === "home" ? "New home" : snapshot.projectGoal === "dual" ? "Dual occupancy" : "Major renovation";
  const suppliedAddress = snapshot.address || [snapshot.suburb, snapshot.postcode && `NSW ${snapshot.postcode}`].filter(Boolean).join(", ") || "Not supplied";

  return (
    <div className="quote-modal" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget && status !== "submitting") onClose(); }}>
      <section className="quote-modal-panel">
        <header className="quote-modal-head">
          <div><span>FRC · Private project enquiry</span><h2 id="quote-modal-title">Request an architectural quote.</h2><p>Only complete the essentials below. Everything already entered in Property and Ambition has been carried into this request.</p></div>
          <button type="button" aria-label="Close quote request" onClick={onClose} disabled={status === "submitting"}>Close ×</button>
        </header>

        {status === "success" ? <div className="quote-success"><i>✓</i><span>Request sent</span><h3>Your project brief is now with the head architect.</h3><p>FRC can reply using the contact details you supplied. No project information needs to be re-entered.</p><button type="button" onClick={onClose}>Return to the project starter <span>→</span></button></div> :
        <form onSubmit={submitQuote}>
          <div className="quote-form-columns">
            <div className="quote-fields">
              <section>
                <span className="quote-section-label">01 / Essential information</span>
                <div className="quote-input-grid">
                  <label><span>Full name *</span><input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label>
                  <label><span>Email address *</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
                  <label><span>Phone number *</span><input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Best contact number" /></label>
                </div>
              </section>

              <section>
                <span className="quote-section-label">02 / Optional information</span>
                <div className="quote-input-grid two">
                  <label><span>Company / organisation</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional" /></label>
                  <label><span>Preferred contact</span><select value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)}><option>Email</option><option>Phone call</option><option>Text message</option></select></label>
                  <label><span>Indicative budget</span><input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. $900k–$1.2m" /></label>
                  <label><span>Ideal timing</span><input value={timeline} onChange={(event) => setTimeline(event.target.value)} placeholder="e.g. Design this year" /></label>
                </div>
                <label className="quote-message"><span>What would you like to do? *</span><textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the outcome you want, what is most important, and any questions for the architect." /></label>
              </section>
            </div>

            <aside className="quote-review">
              <span className="quote-section-label">03 / Details already supplied</span>
              <h3>Your project brief</h3>
              <dl>
                <div><dt>Started from</dt><dd>{snapshot.sourceStep}</dd></div>
                <div><dt>Property</dt><dd>{suppliedAddress}</dd></div>
                <div><dt>Lot / DP</dt><dd>{snapshot.lotDp || "Not supplied"}</dd></div>
                <div><dt>Site</dt><dd>{snapshot.landArea || "—"} m² · {snapshot.frontage || "—"}m frontage · {snapshot.depth || "—"}m depth</dd></div>
                <div><dt>Site conditions</dt><dd>{snapshot.lotType} lot · {snapshot.slope} slope · {snapshot.existingDwelling ? "existing dwelling" : "no existing dwelling indicated"}</dd></div>
                <div><dt>Project</dt><dd>{projectType} · {snapshot.storeys} storeys · {snapshot.bedrooms} bedrooms · {snapshot.bathrooms} bathrooms · {snapshot.parking} car spaces</dd></div>
                <div><dt>Approval route</dt><dd>{snapshot.roadmapPath.toUpperCase()} working pathway</dd></div>
                <div><dt>Priorities</dt><dd>{snapshot.priorities.length ? snapshot.priorities.join(", ") : "Not selected"}</dd></div>
                <div><dt>Planning check</dt><dd>{snapshot.propertyVerified ? `${snapshot.planning.zone || "Mapped"}${snapshot.planning.council ? ` · ${snapshot.planning.council} Council` : ""}` : "Not completed yet"}</dd></div>
              </dl>
              <label className={`quote-confirmation ${confirmed ? "confirmed" : ""}`}><input required type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>Are all these details correct?</b><small>I have reviewed the carried-forward project information and confirm it can be sent to the head architect.</small></span></label>
            </aside>
          </div>

          <label className="quote-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          {status === "error" && <div className="quote-submit-error" role="alert">{errorMessage}</div>}
          <footer className="quote-submit-bar"><p>The request is emailed privately to the head architect. Your information is used only to respond to this project enquiry.</p><button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Sending project brief…" : "Send to the head architect"}<span>→</span></button></footer>
        </form>}
      </section>
    </div>
  );
}

export default function Home() {
  const storyRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [projectType, setProjectType] = useState<"new" | "dual" | "reno">("dual");
  const [scope, setScope] = useState<"concept" | "approval" | "full">("full");
  const [buildCost, setBuildCost] = useState(1400);
  const [pathway, setPathway] = useState<"cdc" | "da" | "complex">("da");
  const [siteComplexity, setSiteComplexity] = useState<"clear" | "typical" | "constrained">("typical");
  const [consultants, setConsultants] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [setupStep, setSetupStep] = useState(1);
  const [streetAddress, setStreetAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [lotDp, setLotDp] = useState("");
  const [landArea, setLandArea] = useState(650);
  const [frontage, setFrontage] = useState(15);
  const [depth, setDepth] = useState(35);
  const [lotType, setLotType] = useState<"standard" | "corner" | "battleaxe">("standard");
  const [slope, setSlope] = useState<"flat" | "gentle" | "steep">("gentle");
  const [existingDwelling, setExistingDwelling] = useState(false);
  const [storeys, setStoreys] = useState(2);
  const [bedrooms, setBedrooms] = useState(4);
  const [bathrooms, setBathrooms] = useState(2);
  const [parking, setParking] = useState(2);
  const [projectGoal, setProjectGoal] = useState<"home" | "dual" | "renovation">("home");
  const [roadmapPath, setRoadmapPath] = useState<"cdc" | "da">("da");
  const [propertyVerified, setPropertyVerified] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(["Natural light", "Budget certainty"]);
  const [reportName, setReportName] = useState("");
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [quoteSnapshot, setQuoteSnapshot] = useState<QuoteProjectSnapshot | null>(null);
  const privateStreetAddress = useRef("");
  const siteAnalysisRequestId = useRef(0);
  const projectHydrated = useRef(false);

  useEffect(() => {
    const stored = readStoredProject();
    const hydrate = window.setTimeout(() => {
      setStreetAddress(stored.property.address);
      setSuburb(stored.property.suburb);
      setPostcode(stored.property.postcode);
      setLotDp(stored.property.lot_details);
      if (Number(stored.property.site_area)) setLandArea(Number(stored.property.site_area));
      if (Number(stored.property.site_width)) setFrontage(Number(stored.property.site_width));
      if (Number(stored.property.site_depth)) setDepth(Number(stored.property.site_depth));
      if (["standard", "corner", "battleaxe"].includes(stored.property.lot_type)) setLotType(stored.property.lot_type as "standard" | "corner" | "battleaxe");
      if (["flat", "gentle", "steep"].includes(stored.property.slope)) setSlope(stored.property.slope as "flat" | "gentle" | "steep");
      setExistingDwelling(Boolean(stored.property.existing_structures));
      if (["home", "dual", "renovation"].includes(stored.ambition.project_type)) setProjectGoal(stored.ambition.project_type as "home" | "dual" | "renovation");
      if (Number(stored.ambition.storeys)) setStoreys(Number(stored.ambition.storeys));
      if (Number(stored.ambition.bedrooms)) setBedrooms(Number(stored.ambition.bedrooms));
      if (Number(stored.ambition.bathrooms)) setBathrooms(Number(stored.ambition.bathrooms));
      if (Number(stored.ambition.parking)) setParking(Number(stored.ambition.parking));
      if (["cdc", "da"].includes(stored.roadmap.approval_pathway.toLowerCase())) setRoadmapPath(stored.roadmap.approval_pathway.toLowerCase() as "cdc" | "da");
      if (stored.ambition.special_rooms.length) setPriorities(stored.ambition.special_rooms);
      projectHydrated.current = true;
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  useEffect(() => {
    if (!projectHydrated.current) return;
    const stored = readStoredProject();
    const next = mergeProjectData(stored, {
      property: {
        ...stored.property,
        address: privateStreetAddress.current || streetAddress,
        suburb,
        postcode,
        lot_details: lotDp,
        site_area: String(landArea),
        client_site_area: String(landArea),
        mapped_site_area: analysis?.mappedParcelAreaSqm ? String(analysis.mappedParcelAreaSqm) : stored.property.mapped_site_area,
        calculated_geometry_area: analysis?.calculatedGeometryAreaSqm ? String(analysis.calculatedGeometryAreaSqm) : stored.property.calculated_geometry_area,
        selected_parcel_id: analysis?.parcelId || stored.property.selected_parcel_id,
        parcel_geometry_source: analysis?.parcelGeometry?.length ? "NSW Land Parcel Property Theme · cadastral lot layer 8" : stored.property.parcel_geometry_source,
        parcel_geometry: analysis?.parcelGeometry || stored.property.parcel_geometry,
        parcel_rectangularity: analysis?.parcelShape?.rectangularity ? String(analysis.parcelShape.rectangularity) : stored.property.parcel_rectangularity,
        parcel_irregularity: analysis?.parcelShape?.irregularity || stored.property.parcel_irregularity,
        site_width: String(frontage),
        site_depth: String(depth),
        lot_type: lotType,
        slope,
        existing_structures: existingDwelling ? "Existing dwelling" : "",
      },
      ambition: { ...stored.ambition, project_type: projectGoal, storeys: String(storeys), bedrooms: String(bedrooms), bathrooms: String(bathrooms), parking: String(parking), special_rooms: priorities },
      roadmap: { ...stored.roadmap, approval_pathway: roadmapPath.toUpperCase() },
      planning: analysis ? {
        ...stored.planning,
        council: analysis.council,
        zoning: analysis.controls.zone,
        zone_name: analysis.controls.zoneName,
        planning_instrument: analysis.controls.lep,
        height_limit: analysis.controls.maxHeight || "",
        floor_space_ratio: analysis.controls.fsr || "",
        minimum_lot_size: analysis.controls.minimumLotSize || "",
        heritage: analysis.controls.heritage || "",
        bushfire: analysis.controls.bushfire || "",
        flooding: analysis.controls.flooding || "",
        source_values: {
          ...stored.planning.source_values,
          ...(analysis.planningFields ? Object.fromEntries(Object.entries(analysis.planningFields).map(([key, value]) => {
            const contractKey = key === "parcelArea" ? "parcel_area" : key === "height" ? "height_limit" : key === "minimumLotSize" ? "minimum_lot_size" : key;
            return [contractKey, { value: value.value, sourceName: value.sourceName, sourceLayer: value.sourceLayer, sourceFeatureId: value.sourceFeatureId || undefined, retrievedAt: value.retrievedAt, status: value.status === "mapped" ? "mapped" : "missing" }];
          })) : {}),
        },
      } : stored.planning,
    });
    writeStoredProject(next);
  }, [streetAddress, suburb, postcode, lotDp, landArea, frontage, depth, lotType, slope, existingDwelling, projectGoal, storeys, bedrooms, bathrooms, parking, roadmapPath, priorities, analysis]);

  useEffect(() => {
    const update = () => {
      if (storyRef.current) {
        const rect = storyRef.current.getBoundingClientRect();
        const distance = storyRef.current.offsetHeight - window.innerHeight;
        setProgress(Math.max(0, Math.min(1, -rect.top / Math.max(distance, 1))));
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (activeProject === null) return;
    const slideCount = projects[activeProject].gallery.length;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProject(null);
      if (event.key === "ArrowLeft") setActiveSlide((slide) => (slide - 1 + slideCount) % slideCount);
      if (event.key === "ArrowRight") setActiveSlide((slide) => (slide + 1) % slideCount);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProject]);

  const estimate = useMemo(() => {
    const baseRate = {
      new: { concept: .024, approval: .052, full: .092 },
      dual: { concept: .029, approval: .063, full: .108 },
      reno: { concept: .033, approval: .074, full: .124 },
    }[projectType][scope];
    const pathwayFactor = { cdc: .96, da: 1.08, complex: 1.22 }[pathway];
    const complexityFactor = { clear: .92, typical: 1, constrained: 1.18 }[siteComplexity];
    const architecture = buildCost * 1000 * baseRate * pathwayFactor * complexityFactor;
    const consultantAllowance = consultants
      ? ({ new: 39000, dual: 51500, reno: 45500 }[projectType] * ({ cdc: .9, da: 1, complex: 1.22 }[pathway]))
      : 0;
    const risk = { clear: .08, typical: .12, constrained: .18 }[siteComplexity];
    const phaseWeights = scope === "concept"
      ? [["Brief + feasibility", .2], ["Concept design", .8]]
      : scope === "approval"
        ? [["Brief + feasibility", .12], ["Concept design", .36], ["Design development", .2], ["Approval set", .32]]
        : [["Brief + feasibility", .07], ["Concept design", .22], ["Design development", .17], ["Approval set", .16], ["Construction docs", .28], ["Construction support", .1]];
    return {
      low: Math.round(architecture * (1 - risk * .45) / 1000) * 1000,
      high: Math.round(architecture * (1 + risk) / 1000) * 1000,
      architecture,
      consultantAllowance,
      phaseWeights,
      programme: scope === "concept" ? "5-9 weeks" : scope === "approval" ? (pathway === "cdc" ? "4-7 months" : "7-12 months") : (pathway === "complex" ? "14-22 months" : "10-17 months"),
      confidence: siteComplexity === "clear" && pathway === "cdc" ? 84 : siteComplexity === "constrained" || pathway === "complex" ? 58 : 72,
    };
  }, [buildCost, consultants, pathway, projectType, scope, siteComplexity]);

  const archiveCutoff = .23;
  const archiveProgress = Math.max(0, Math.min(1, progress / archiveCutoff));
  const storyProgress = Math.max(0, Math.min(1, (progress - archiveCutoff) / (1 - archiveCutoff)));
  const p = Math.round(storyProgress * 100);
  const realReveal = Math.max(0, Math.min(1, (storyProgress - .32) * 1.5));
  const storyTone = Math.round(247 - Math.min(1, storyProgress * 1.12) * 233);
  const archiveStack = archiveProgress * (projects.length + 1);
  const archivePosition = Math.min(projects.length, Math.floor(archiveStack));
  const archiveExit = Math.max(0, archiveStack - projects.length) * 118;
  const folderTransform = (step: number) => `translate3d(0, ${Math.max(0, Math.min(108, (step - archiveStack) * 108)) - archiveExit}%, 0)`;
  const storyGridOpacity = realReveal < .72 ? 1 : Math.max(0, 1 - (realReveal - .72) / .28);
  const formatMoney = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  const galleryFor = (index: number) => projects[index].gallery;
  const labelsFor = (index: number) => projects[index].labels;
  const boundaryPolygon = useMemo(() => {
    if (!analysis?.boundary?.length) return "polygon(4% 7%, 92% 0, 100% 86%, 14% 100%, 0 48%)";
    const xs = analysis.boundary.map(([x]) => x);
    const ys = analysis.boundary.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return `polygon(${analysis.boundary.map(([x, y]) => `${8 + ((x - minX) / (maxX - minX || 1)) * 84}% ${8 + (1 - (y - minY) / (maxY - minY || 1)) * 84}%`).join(",")})`;
  }, [analysis]);
  const togglePriority = (priority: string) => setPriorities((current) => current.includes(priority) ? current.filter((item) => item !== priority) : [...current, priority]);
  const updateStreetAddress = (value: string) => {
    siteAnalysisRequestId.current += 1;
    privateStreetAddress.current = "";
    setStreetAddress(value);
    setLotDp("");
    setAnalysis(null);
    setPropertyVerified(false);
  };
  const updateSuburb = (value: string) => {
    siteAnalysisRequestId.current += 1;
    setSuburb(value);
    setLotDp("");
    setAnalysis(null);
    setPropertyVerified(false);
  };
  const updatePostcode = (value: string) => {
    siteAnalysisRequestId.current += 1;
    setPostcode(value.replace(/\D/g, "").slice(0, 4));
    setLotDp("");
    setAnalysis(null);
    setPropertyVerified(false);
  };
  const inspectSite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      sessionStorage.setItem("frc-private-site-brief", JSON.stringify({
        streetAddress: privateStreetAddress.current || streetAddress,
        suburb,
        postcode,
        knownLandArea: String(landArea),
        frontage: String(frontage),
        depth: String(depth),
        projectGoal,
        storeys: String(storeys),
        bedrooms: String(bedrooms),
        bathrooms: String(bathrooms),
        parking: String(parking),
      }));
    } catch {
      // If private session storage is unavailable, the simulator opens without carrying the address.
    }
    window.location.assign("/simulator?source=intro");
  };
  const analyseProperty = async () => {
    const requestId = ++siteAnalysisRequestId.current;
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/site-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streetAddress: privateStreetAddress.current || streetAddress, suburb, postcode, knownLandArea: landArea, frontage, depth, lotType, slope, existingDwelling, storeys, bedrooms, bathrooms, parking, projectGoal }),
      });
      const result = (await response.json()) as SiteAnalysis & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Property analysis failed.");
      if (requestId !== siteAnalysisRequestId.current) return;
      const safeSuburb = result.addressDetails?.suburb ?? suburb;
      const safePostcode = result.addressDetails?.postcode ?? postcode;
      privateStreetAddress.current = result.fullAddress || result.matchedAddress;
      setStreetAddress(`Private property — ${safeSuburb}, NSW ${safePostcode}`);
      setAnalysis({ ...result, matchedAddress: [safeSuburb, safePostcode && `NSW ${safePostcode}`].filter(Boolean).join(", ") });
      setSuburb(safeSuburb);
      setPostcode(safePostcode);
      if (result.lotDp) setLotDp(result.lotDp);
      if (result.siteDimensions?.frontage) setFrontage(result.siteDimensions.frontage);
      if (result.siteDimensions?.depth) setDepth(result.siteDimensions.depth);
      setPropertyVerified(true);
    } catch (error) {
      if (requestId !== siteAnalysisRequestId.current) return;
      setPropertyVerified(false);
      setAnalysisError(error instanceof Error ? error.message : "Property analysis failed.");
    } finally {
      if (requestId === siteAnalysisRequestId.current) setAnalysisLoading(false);
    }
  };
  const projectAddress = [suburb, postcode && `NSW ${postcode}`].filter(Boolean).join(", ");
  const buildQuoteSnapshot = (sourceStep: string): QuoteProjectSnapshot => ({
    sourceStep,
    address: privateStreetAddress.current || (streetAddress.startsWith("Private property") ? "" : streetAddress),
    suburb,
    postcode,
    lotDp,
    landArea,
    frontage,
    depth,
    lotType,
    slope,
    existingDwelling,
    storeys,
    bedrooms,
    bathrooms,
    parking,
    mappedParcelArea: analysis?.mappedParcelAreaSqm ?? analysis?.area ?? null,
    calculatedGeometryArea: analysis?.calculatedGeometryAreaSqm ?? null,
    parcelId: analysis?.parcelId ?? "",
    projectGoal,
    roadmapPath,
    priorities,
    propertyVerified,
    planning: {
      council: analysis?.council ?? "",
      zone: analysis?.controls.zone ?? "",
      zoneName: analysis?.controls.zoneName ?? "",
      maxHeight: analysis?.controls.maxHeight ?? "",
      fsr: analysis?.controls.fsr ?? "",
      minimumLotSize: analysis?.controls.minimumLotSize ?? "",
      heritage: analysis?.controls.heritage ?? "",
      bushfire: analysis?.controls.bushfire ?? "",
      flooding: analysis?.controls.flooding ?? "",
    },
  });
  const roadmap = useMemo(() => {
    const approvalWeeks = roadmapPath === "cdc" ? "6-10 weeks" : "4-8 months";
    const designWeeks = projectGoal === "renovation" ? "8-12 weeks" : projectGoal === "dual" ? "10-16 weeks" : "8-14 weeks";
    return [
      ["01", "Site intelligence", propertyVerified ? "Boundary confirmed" : "Confirm boundary", "Now"],
      ["02", "Feasibility sprint", "Controls, yield + risk", "1-2 weeks"],
      ["03", "Project brief", `${priorities.length || 1} priorities aligned`, "1 week"],
      ["04", "Concept design", projectGoal === "dual" ? "Two-home test fit" : projectGoal === "renovation" ? "Existing + proposed" : "Home test fit", designWeeks],
      ["05", roadmapPath === "cdc" ? "CDC pathway" : "DA pathway", roadmapPath === "cdc" ? "Certifier coordination" : "Council coordination", approvalWeeks],
      ["06", "Technical design", "Consultant coordination", "8-14 weeks"],
      ["07", "Builder-ready set", "Pricing + construction issue", "4-8 weeks"],
      ["08", "Construction support", "Decisions, RFIs + quality", "Project duration"],
    ];
  }, [priorities.length, projectGoal, propertyVerified, roadmapPath]);

  return (
    <main>
      <header className="welcome-hero" id="top">
        <img src="/projects/crown-line/realistic.png" alt="A warm FRC-designed family home at dusk" />
        <div className="welcome-wash" />
        <div className="welcome-copy">
          <span>FRC Design & Construction · Architecture made personal</span>
          <h1>Bring us the land.<br />We’ll help you see<br /><em>the life inside it.</em></h1>
          <p>Thoughtful homes, clear approvals and a path to construction that makes sense from the first conversation.</p>
          <div><a href="/simulator">Explore what your land can hold <i>↗</i></a><a href="#project-wheel">Meet the work <i>↓</i></a></div>
        </div>
        <div className="welcome-proof"><span>Homes shaped around real families</span><b>Sydney, NSW</b><small>Feasibility · design · approvals · delivery</small></div>
        <a className="welcome-scroll" href="#project-wheel"><span>One small scroll</span><i /></a>
      </header>

      <section className="story experience-story" id="project-wheel" ref={storyRef} style={{ backgroundColor: `rgb(${storyTone}, ${storyTone + 1}, ${storyTone - 3})` }} aria-labelledby="folder-archive-title">
        <div className="story-sticky" id="story">
          <div className="grid-field" style={{ opacity: storyGridOpacity, "--grid-line": p > 42 ? "rgba(244,242,234,.14)" : "rgba(23,34,29,.12)" } as React.CSSProperties} />
          <div className="chapter-count" style={{ color: p > 42 ? "#f4f2ea" : "#17221d" }}>{String(Math.max(1, Math.min(4, Math.ceil(storyProgress * 4)))).padStart(2, "0")} / 04</div>
          <div className="project-label" style={{ color: p > 42 ? "#f4f2ea" : "#17221d" }}><span>Selected project</span><strong>Betula Avenue<br />Residences</strong></div>
          <div className="model-frame" style={{ transform: `translate3d(0, ${Math.max(0, storyProgress - .76) * -70}px, 0) scale(${.84 + Math.min(storyProgress, .6) * .27})`, borderRadius: `${Math.max(0, 20 - storyProgress * 30)}px` }}>
            <img className="model-image plan-image" src="/projects/betula/drawing-slab-projected.png" alt="Three-storey architectural model of the Betula Avenue dual occupancy with matching projecting floor slabs on both wings" />
            <div className="drawing-overlay" style={{ opacity: Math.max(0, 1 - storyProgress * 1.8) }}><span className="measure measure-a">A.01 / FRONT</span><span className="measure measure-b">3 LEVELS</span><span className="axis axis-x" /><span className="axis axis-y" /></div>
            <div className="reality-wipe" style={{ clipPath: `inset(0 0 0 ${100 - realReveal * 100}%)` }}>
              <img className="context-image" src="/projects/betula/realistic-slab-projected.png" alt="Photorealistic visualization of the three-storey Betula Avenue residence with matching projecting floor slabs" />
            </div>
            <div className="reveal-line" style={{ left: `${realReveal * 100}%`, opacity: realReveal > .02 && realReveal < .98 ? 1 : 0 }}><span>DRAWING / BUILT FORM</span></div>
            <div className="frame-shade" style={{ opacity: Math.max(0, (storyProgress - .66) * 1.8) }} />
          </div>
          <div className={`story-copy copy-one ${p > 8 && p < 35 ? "visible" : ""}`}><span className="eyebrow">01 · Draw the idea</span><h2>Every home starts<br />as a <em>possibility.</em></h2></div>
          <div className={`story-copy copy-two ${p >= 38 && p < 56 ? "visible" : ""}`}><span className="eyebrow">02 · Resolve the detail</span><h2>Line by line,<br />it becomes <em>real.</em></h2></div>
          <div className={`story-quote ${p >= 58 && p < 74 ? "visible" : ""}`}><span>FRC Design & Construction</span><blockquote>“We don’t begin with a style. We begin with your land, your life and what the project must become.”</blockquote></div>
          <div className={`story-copy copy-three ${p >= 74 ? "visible" : ""}`}><span className="eyebrow">03 · Start with your land</span><h2>Your dimensions.<br /><em>Your</em> possibilities.</h2></div>
          <form className={`story-brief ${p >= 74 ? "visible" : ""}`} onSubmit={inspectSite} aria-label="Start a property feasibility check">
            <header><span>04 / Quick site brief</span><h3>What could you create here?</h3><p>Enter what you already know. The simulator will carry it forward and check the address against NSW planning layers.</p></header>
            <div className="story-brief-grid">
              <label className="wide"><span>Street address <small>kept private</small></span><input required autoComplete="street-address" value={streetAddress} onChange={(event) => updateStreetAddress(event.target.value)} placeholder="Enter the property street address" /></label>
              <label><span>Suburb</span><input required value={suburb} onChange={(event) => setSuburb(event.target.value)} placeholder="Your NSW suburb" /></label>
              <label><span>Postcode</span><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={postcode} onChange={(event) => setPostcode(event.target.value.replace(/\D/g, ""))} placeholder="NSW postcode" /></label>
              <label><span>Plot area</span><div><input required type="number" min="1" value={landArea} onChange={(event) => setLandArea(Number(event.target.value))} /><b>m²</b></div></label>
              <label><span>Frontage</span><div><input required type="number" min="1" step=".1" value={frontage} onChange={(event) => setFrontage(Number(event.target.value))} /><b>m</b></div></label>
              <label><span>Approx. depth</span><div><input required type="number" min="1" step=".1" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /><b>m</b></div></label>
              <label><span>Project type</span><select value={projectGoal} onChange={(event) => setProjectGoal(event.target.value as typeof projectGoal)}><option value="home">New home</option><option value="dual">Dual occupancy</option><option value="renovation">Renovate + extend</option></select></label>
              <label><span>Floors wanted</span><input type="number" min="1" max="6" value={storeys} onChange={(event) => setStoreys(Number(event.target.value))} /></label>
            </div>
            <div className="story-site-readout"><span>Private site check</span><strong>{frontage}m × {depth}m</strong><small>{landArea.toLocaleString()} m² supplied by you · public results show suburb only</small></div>
            <button type="submit">Inspect what fits <span>→</span></button>
          </form>
          <div className="scroll-meter" style={{ color: p > 42 ? "#f4f2ea" : "#17221d" }}><span>{p >= 74 ? "Complete the quick brief" : "Scroll to make it real"}</span><i><b style={{ transform: `scaleX(${storyProgress})`, background: p > 42 ? "#f4f2ea" : "#17221d" }} /></i><span>{String(Math.max(1, Math.min(4, Math.ceil(storyProgress * 4)))).padStart(2, "0")} / 04</span></div>

          <div className="folder-layer" style={{ pointerEvents: archiveProgress >= 1 ? "none" : "auto" }}>
            <aside className="folder-scroll-rail" aria-hidden="true" style={{ opacity: Math.max(0, 1 - Math.max(0, archiveProgress - .9) * 10) }}>
              <div><span>Project archive</span><i><b style={{ transform: `scaleY(${archiveProgress})` }} /></i><strong>{String(archivePosition).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</strong></div>
            </aside>

            <article className="folder-card folder-cover" style={{ "--folder-top-desktop": "88px", "--folder-top-mobile": "103px", "--folder-tab-left": "30px", zIndex: 2, transform: folderTransform(0) } as React.CSSProperties}>
              <div className="folder-tab"><span>FRC / Selected work</span><b>Archive cover</b></div>
              <div className="folder-cover-copy">
                <span>Selected + ongoing work</span>
                <h2 id="folder-archive-title">A family of<br /><em>places.</em></h2>
                <p>Every project began with a different land, family and ambition. Scroll the files to see how each brief became its own architecture.</p>
                <small>{String(projects.length).padStart(2, "0")} selected projects · one small scroll opens each file</small>
              </div>
              <div className="folder-cover-previews">{projects.slice(0, 4).map((project, index) => <button type="button" key={`cover-${project.slug}`} onClick={() => { setActiveProject(index); setActiveSlide(0); }} aria-label={`Open ${project.name} gallery`}><img src={project.image} alt="" /><span>0{index + 1}</span></button>)}</div>
              <div className="folder-cover-index"><strong>{String(projects.length).padStart(2, "0")}</strong><span>Selected<br />projects</span></div>
            </article>

            {projects.map((project, index) => <article
              className={`folder-card folder-project-card folder-tone-${index % 4}`}
              style={{ "--folder-top-desktop": `${94 + index * 6}px`, "--folder-top-mobile": `${106 + index * 3}px`, "--folder-tab-left": `${48 + index * 22}px`, zIndex: index + 3, transform: folderTransform(index + 1) } as React.CSSProperties}
              id={`folder-${project.slug}`}
              key={`folder-${project.slug}`}
            >
              <div className="folder-tab"><span>{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span><b>{project.type}</b></div>
              <button type="button" className="folder-project-open" onClick={() => { setActiveProject(index); setActiveSlide(0); }} aria-label={`Open ${project.name} project gallery`}>
                <div className="folder-project-copy">
                  <span>{project.status} · {project.location}</span>
                  <h3>{project.name}</h3>
                  <p>{projectStories[project.slug]}</p>
                  <dl><div><dt>Location</dt><dd>{project.location}</dd></div><div><dt>Typology</dt><dd>{project.type}</dd></div><div><dt>File</dt><dd>FRC / {String(index + 1).padStart(3, "0")}</dd></div></dl>
                  <small>Open the complete project <i>↗</i></small>
                </div>
                <div className="folder-project-media"><img src={project.image} alt={`${project.name} by FRC Design & Construction`} /><span>Project study / {String(index + 1).padStart(2, "0")}</span></div>
              </button>
            </article>)}
          </div>
        </div>
      </section>

      <section className="project-intro" id="work">
        <div className="section-kicker">Project 001 · Dual occupancy</div>
        <h2>Two homes.<br />One considered <em>whole.</em></h2>
        <div className="intro-detail">
          <p>A three-storey dual occupancy composed as one calm address—balancing privacy, generous family living and a confident street presence.</p>
          <dl><div><dt>Location</dt><dd>Betula Avenue</dd></div><div><dt>Typology</dt><dd>Detached dual occupancy</dd></div><div><dt>Scope</dt><dd>Architecture + documentation</dd></div><div><dt>Form</dt><dd>Three storeys + garages</dd></div></dl>
        </div>
        <div className="resolved-spread">
          <div className="resolved-image drawing"><img src="/projects/betula/drawing-slab-projected.png" alt="Three-storey Betula Avenue architectural model with matching projected floor slabs" /><span>01 / Architectural model</span></div>
          <div className="resolved-image reality"><img src="/projects/betula/realistic-slab-projected.png" alt="Photoreal three-storey Betula Avenue exterior with the right-hand floor projected forward" /><span>02 / Resolved material study</span></div>
          <div className="resolved-note"><small>Drawing → reality</small><strong>The geometry stays.<br />The experience arrives.</strong><p>Exact massing, openings and proportions—resolved through natural light, tactile materials and landscape.</p></div>
        </div>
      </section>

      <section className="materials" aria-labelledby="materials-title">
        <div className="materials-head"><div><span className="section-kicker">Material direction</span><h2 id="materials-title">A palette you can<br /><em>feel.</em></h2></div><p>Material selections should make the architecture stronger, not busier. Explore three composed directions for Betula Avenue.</p></div>
        <div className="material-composer">
          <div className="material-preview" style={{ background: `linear-gradient(135deg, ${materialSchemes[selectedMaterial].colours[0]} 0 52%, ${materialSchemes[selectedMaterial].colours[1]} 52% 78%, ${materialSchemes[selectedMaterial].colours[2]} 78%)` }}>
            <div className="material-house"><i /><i /><i /><span /></div>
            <small>Concept palette / 0{selectedMaterial + 1}</small>
          </div>
          <div className="material-options">{materialSchemes.map((scheme, index) => (
            <button key={scheme.name} className={selectedMaterial === index ? "active" : ""} onClick={() => setSelectedMaterial(index)}>
              <span className="swatches">{scheme.colours.map((colour) => <i key={colour} style={{ background: colour }} />)}</span>
              <span><strong>{scheme.name}</strong><small>{scheme.note}</small></span><b>{selectedMaterial === index ? "Selected" : "Explore"} ↗</b>
            </button>
          ))}
          <div className="material-tags">{materialSchemes[selectedMaterial].tags.map((tag, index) => <span key={tag}><i style={{ background: materialSchemes[selectedMaterial].colours[index] }} />{tag}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="work-index" aria-labelledby="work-index-title">
        <div className="work-index-head"><div><span className="section-kicker">FRC project archive</span><h2 id="work-index-title">Selected <em>work.</em></h2></div><p>Homes, hospitality and community spaces—each shaped by its site, brief and path to construction.</p></div>
        <div className="project-grid">{projects.map((project, index) => (
          <article className={`project-card ${project.feature ? "featured" : ""}`} id={`project-${project.slug}`} key={project.slug}>
            <button type="button" onClick={() => { setActiveProject(index); setActiveSlide(0); }} aria-label={`Open ${project.name} project gallery`}>
              <div className="project-image"><img loading="lazy" src={project.image} alt={`${project.name} architectural project by FRC Design & Construction`} /><span>Open gallery ↗</span></div>
              <div className="project-card-copy"><h3>{project.name}</h3><p>{project.location} · {project.type}</p></div>
            </button>
          </article>
        ))}</div>
        <Link className="view-all-projects" href="/portfolio">View All Projects <span>→</span></Link>
      </section>

      {activeProject !== null && (
        <div className="project-modal" role="dialog" aria-modal="true" aria-label={`${projects[activeProject].name} project gallery`} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProject(null); }}>
          <div className="project-viewer">
            <header><div><span>{projects[activeProject].location} · {projects[activeProject].type}</span><h2>{projects[activeProject].name}</h2></div><button type="button" onClick={() => setActiveProject(null)}>Close ×</button></header>
            <div className={`viewer-image ${activeSlide > 0 ? "drawing" : ""}`}><img src={galleryFor(activeProject)[activeSlide]} alt={`${projects[activeProject].name}: ${labelsFor(activeProject)[activeSlide]}`} /></div>
            <footer>
              <div><span>{String(activeSlide + 1).padStart(2, "0")} / {String(galleryFor(activeProject).length).padStart(2, "0")}</span><strong>{labelsFor(activeProject)[activeSlide]}</strong></div>
              {projects[activeProject].folio && <a className="public-folio-link" href={projects[activeProject].folio} target="_blank" rel="noreferrer">Open public drawing folio <span>↗</span><small>Client details removed</small></a>}
              <div className="viewer-controls"><button onClick={() => setActiveSlide((slide) => (slide - 1 + galleryFor(activeProject).length) % galleryFor(activeProject).length)}>←</button><button onClick={() => setActiveSlide((slide) => (slide + 1) % galleryFor(activeProject).length)}>→</button></div>
            </footer>
          </div>
        </div>
      )}

      <section className="studio" id="studio">
        <div className="section-kicker light">How we work</div>
        <div className="studio-heading"><h2>One clear journey.<br />No <em>guesswork.</em></h2><p>Good design is only half the job. We make the entire process legible—from what is possible on your site to what it will take to build.</p></div>
        <div className="capability-grid">{capabilities.map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="estimator" id="estimate">
        <div className="section-kicker">Quick project fee guide</div>
        <div className="estimator-head"><h2>Estimate the likely architecture fee.<br />Keep the inputs you already provided.</h2><p>Based on your selected project type, service scope, approval pathway, site conditions and construction value. This is a realistic starting point informed by current NSW planning practice, not a generic square-metres guess.</p></div>
        <div className="estimator-console">
          <aside className="estimate-config">
            <div className="console-label"><span>01</span><b>Build your scenario</b><small>All values update live</small></div>
            <fieldset><legend>Project type</legend><div className="segmented">{([["new", "New home"], ["dual", "Dual occupancy"], ["reno", "Major renovation"]] as const).map(([value, label]) => <button key={value} className={projectType === value ? "active" : ""} onClick={() => setProjectType(value)}>{label}</button>)}</div></fieldset>
            <fieldset><legend>Service depth</legend><div className="segmented">{([["concept", "Concept"], ["approval", "To approval"], ["full", "Full service"]] as const).map(([value, label]) => <button key={value} className={scope === value ? "active" : ""} onClick={() => setScope(value)}>{label}</button>)}</div></fieldset>
            <fieldset><legend>Approval pathway</legend><div className="choice-row">{([["cdc", "CDC", "Fast track"], ["da", "DA", "Council"], ["complex", "Complex DA", "Specialist"]] as const).map(([value, label, note]) => <button key={value} className={pathway === value ? "active" : ""} onClick={() => setPathway(value)}><b>{label}</b><small>{note}</small></button>)}</div></fieldset>
            <fieldset><legend>Site conditions</legend><div className="choice-row">{([["clear", "Clear", "Low constraint"], ["typical", "Typical", "Metro site"], ["constrained", "Constrained", "Slope / access"]] as const).map(([value, label, note]) => <button key={value} className={siteComplexity === value ? "active" : ""} onClick={() => setSiteComplexity(value)}><b>{label}</b><small>{note}</small></button>)}</div></fieldset>
            <label className="budget-control"><span>Construction value <b>${(buildCost / 1000).toFixed(2)}m</b></span><input aria-label="Construction value" type="range" min="500" max="5000" step="50" value={buildCost} onChange={(e) => setBuildCost(Number(e.target.value))} /><i><small>$500k</small><small>$5m+</small></i></label>
            <button className={`consultant-toggle ${consultants ? "active" : ""}`} onClick={() => setConsultants((value) => !value)} aria-pressed={consultants}><span><i>{consultants ? "✓" : "+"}</i><b>Include consultant allowance</b></span><small>Structure, civil, energy, landscape + survey</small></button>
          </aside>
          <div className="estimate-intelligence" aria-live="polite">
            <div className="estimate-primary">
              <div><span>Architecture fee range</span><strong>{formatMoney(estimate.low)}<i>—</i>{formatMoney(estimate.high)}</strong><small>Indicative, inc. GST · Architecture scope only</small></div>
              <div className="confidence-ring" style={{ "--score": `${estimate.confidence * 3.6}deg` } as React.CSSProperties}><b>{estimate.confidence}</b><span>Model<br />confidence</span></div>
            </div>
            <div className="estimate-metrics">
              <article><span>Programme</span><strong>{estimate.programme}</strong><small>design to selected scope</small></article>
              <article><span>Fee basis</span><strong>{(estimate.architecture / (buildCost * 1000) * 100).toFixed(1)}%</strong><small>of construction value</small></article>
              <article><span>Consultants</span><strong>{consultants ? formatMoney(estimate.consultantAllowance) : "Excluded"}</strong><small>working allowance</small></article>
            </div>
            <div className="phase-model">
              <header><span>Phase investment map</span><small>{scope === "full" ? "Complete service" : scope === "approval" ? "Approval pathway" : "Early design"}</small></header>
              <div className="phase-bar">{estimate.phaseWeights.map(([name, weight]) => <i key={name} style={{ width: `${Number(weight) * 100}%` }} title={String(name)} />)}</div>
              <div className="phase-list">{estimate.phaseWeights.map(([name, weight], index) => <div key={name}><span><i>{String(index + 1).padStart(2, "0")}</i>{name}</span><b>{formatMoney(estimate.architecture * Number(weight))}</b></div>)}</div>
            </div>
            <div className="total-outlook"><span>Working project-cost outlook <small>construction + architecture{consultants ? " + consultant allowance" : ""}</small></span><strong>{formatMoney(buildCost * 1000 + estimate.architecture + estimate.consultantAllowance)}</strong></div>
            <button className="proposal-button" onClick={() => document.querySelector("#quote")?.scrollIntoView()}>Request a quote <span>↗</span></button>
            <p className="estimate-disclaimer">This is a decision-support estimate only, not a fixed quote. It shows a realistic architecture fee range and the likely consultant allowance for your selected project settings.</p>
          </div>
        </div>
      </section>

      <section className="project-starter" id="quote">
        <header className="starter-head"><div><span className="section-kicker">FRC Project Starter · Live workspace</span><h2>Your land.<br />Your <em>roadmap.</em></h2></div><p>Turn a property into an actionable project brief. Confirm the official parcel, shape the ambition and leave with a tailored path from due diligence to construction.</p></header>
        <nav className="starter-progress" aria-label="Project setup progress">{[["01", "Property"], ["02", "Ambition"], ["03", "Roadmap"]].map(([number, label], index) => <button key={number} className={setupStep === index + 1 ? "active" : setupStep > index + 1 ? "done" : ""} onClick={() => setSetupStep(index + 1)}><i>{setupStep > index + 1 ? "✓" : number}</i><span>{label}</span></button>)}</nav>

        {setupStep === 1 && <>
        <div className="starter-stage property-stage">
          <div className="property-form">
            <span className="stage-number">01 / Establish the ground truth</span>
            <h3>Start with the land,<br />not assumptions.</h3>
            <p>Enter one complete NSW address. It is used privately to resolve the official parcel; the generated overview shows only the suburb and postcode.</p>
            <div className="input-grid"><label><span>Street address <small>private lookup only</small></span><input autoComplete="street-address" value={streetAddress} onChange={(event) => updateStreetAddress(event.target.value)} placeholder="Enter the property street address" /></label><label><span>Suburb</span><input value={suburb} onChange={(event) => updateSuburb(event.target.value)} placeholder="Your NSW suburb" /></label><label><span>Postcode</span><input value={postcode} maxLength={4} onChange={(event) => updatePostcode(event.target.value)} placeholder="NSW postcode" /></label></div>
            <div className="input-grid three"><label><span>Plot area</span><input type="number" min="1" value={landArea} onChange={(event) => setLandArea(Number(event.target.value))} /></label><label><span>Frontage (m)</span><input type="number" min="1" value={frontage} onChange={(event) => setFrontage(Number(event.target.value))} /></label><label><span>Approx. depth (m)</span><input type="number" min="1" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label></div>
            <div className="input-grid three"><label><span>Lot / DP <small>optional</small></span><input value={lotDp} onChange={(event) => setLotDp(event.target.value)} placeholder="Lot 12 / DP 123456" /></label><label><span>Site slope</span><select value={slope} onChange={(event) => setSlope(event.target.value as typeof slope)}><option value="flat">Flat</option><option value="gentle">Gentle</option><option value="steep">Steep</option></select></label><label><span>Lot type</span><select value={lotType} onChange={(event) => setLotType(event.target.value as typeof lotType)}><option value="standard">Standard</option><option value="corner">Corner</option><option value="battleaxe">Battle-axe</option></select></label></div>
            <div className="build-choice">{([['home','New home'],['dual','Dual occupancy'],['renovation','Renovate + extend']] as const).map(([value,label]) => <button type="button" className={projectGoal === value ? "active" : ""} onClick={() => setProjectGoal(value)} key={value}>{label}</button>)}</div>
            <div className="input-grid three"><label><span>Storeys</span><input type="number" min="1" max="4" value={storeys} onChange={(event) => setStoreys(Number(event.target.value))} /></label><label><span>Bedrooms</span><input type="number" min="1" value={bedrooms} onChange={(event) => setBedrooms(Number(event.target.value))} /></label><label><span>Bathrooms (total)</span><input type="number" min="1" value={bathrooms} onChange={(event) => setBathrooms(Number(event.target.value))} /></label></div><div className="input-grid three"><label><span>Car spaces</span><input type="number" min="0" value={parking} onChange={(event) => setParking(Number(event.target.value))} /></label></div>
            <label className="toggle-field"><input type="checkbox" checked={existingDwelling} onChange={(event) => setExistingDwelling(event.target.checked)} /><span>Existing dwelling on the site</span></label>
            <button className="analyse-property" disabled={!streetAddress || !suburb || postcode.length !== 4 || analysisLoading} onClick={analyseProperty}>{analysisLoading ? <><i className="analysis-spinner" />Reading NSW planning layers…</> : <>Show what is realistic <span>→</span></>}</button>
            {analysisError && <div className="analysis-error"><b>We couldn’t complete that address.</b><span>{analysisError}</span></div>}
            {!analysis && !analysisLoading && <div className="analysis-promise"><span>Live report includes</span><div><b>Zoning</b><b>Height</b><b>FSR</b><b>Lot size</b><b>Heritage</b><b>Parcel area</b></div><small>No sign-up. Official NSW spatial services are used for the lookup; the street address stays out of the public result.</small></div>}
            {analysis && <div className="analysis-confirmation"><div><i>✓</i><span><b>Official property matched privately</b><small>{projectAddress || "NSW location hidden"} · {analysis.council} Council</small></span></div><dl><div><dt>Zone</dt><dd>{analysis.controls.zone} · {analysis.controls.zoneName}</dd></div><div><dt>Planning instrument</dt><dd>{analysis.controls.lep}</dd></div><div><dt>Official parcel area</dt><dd>{analysis.area?.toLocaleString() ?? "Not returned"} m²</dd></div><div><dt>Data status</dt><dd>Live NSW layers</dd></div></dl></div>}
            <div className="analysis-support"><a href="https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address" target="_blank" rel="noreferrer">Verify in NSW Spatial Viewer ↗</a><label><span className="file-control"><input type="file" accept=".pdf,image/*" onChange={(event) => setReportName(event.target.files?.[0]?.name ?? "")} /><b>{reportName || "Attach property report"}</b></span></label></div>
            <button className="stage-next" disabled={!analysis} onClick={() => setSetupStep(2)}>Explore my development potential <span>→</span></button>
          </div>
          <div className="parcel-lab">
            <div className="parcel-map"><div className="map-grid" /><div className="road-label">{analysis ? `OFFICIAL PROPERTY · ${analysis.controls.zone}` : "AWAITING ADDRESS"}</div><div className={`parcel-shape ${analysis ? "live" : ""}`} style={{ clipPath: boundaryPolygon }}><span>{analysis ? "NSW CADASTRAL PARCEL" : "PROPERTY ENVELOPE"}</span><b>{analysis?.area?.toLocaleString() ?? landArea} m²</b><i className="north">N ↑</i></div><div className="map-pin"><i /><span>{projectAddress || "Private NSW property"}</span></div></div>
            {analysis ? <div className="control-dashboard">
              <header><div><span>Automatic planning snapshot</span><strong>What the mapped controls say</strong></div><b>LIVE</b></header>
              <div className="guidance-card"><span>Plain-English feasibility read</span><strong>{analysis.guidance.verdict}</strong><p>{analysis.guidance.explanation}</p><small><b>Likely route:</b> {analysis.guidance.pathway} · <b>Reference:</b> {analysis.guidance.code}</small></div>
              <div className="guidance-checks"><span>What to test next</span>{analysis.guidance.checks.map((check) => <div key={check.label}><b>{check.label}</b><span className={check.tone}>{check.value}</span></div>)}</div>
              <div className="control-grid"><article><span>Zone</span><strong>{analysis.controls.zone}</strong><small>{analysis.controls.zoneName}</small></article><article><span>Max height</span><strong>{analysis.controls.maxHeight ?? "Not mapped"}</strong><small>{analysis.controls.maxHeight ? "LEP maximum" : "LEP / DCP review"}</small></article><article><span>Floor-space ratio</span><strong>{analysis.controls.fsr ?? "Not mapped"}</strong><small>{analysis.controls.fsr ? "Mapped maximum" : "No statewide value hit"}</small></article><article><span>Minimum lot size</span><strong>{analysis.controls.minimumLotSize ?? "Not mapped"}</strong><small>{analysis.controls.minimumLotSize ? "Mapped control" : "LEP clause review"}</small></article></div>
              <div className="opportunity-list"><span>Development opportunities to test</span>{analysis.opportunities.map(([title, status, detail]) => <div key={title}><i>{status === "Likely zone-compatible" || status === "Zone-led opportunity" ? "✓" : "?"}</i><p><b>{title}</b><small>{detail}</small></p><strong>{status}</strong></div>)}</div>
              <div className="constraint-list"><span>Constraints + unknowns</span>{analysis.constraints.map((constraint) => <div key={constraint.name}><b>{constraint.name}</b><span>{constraint.value}</span><i className={constraint.status}>{constraint.status === "mapped" ? "Mapped" : constraint.status === "clear" ? "No hit" : "Verify"}</i></div>)}</div>
              <div className="excavation-note"><b>How far can I dig?</b><p>The Spatial Viewer does not provide one statewide “maximum excavation depth”. It depends on the approval pathway, council DCP, slope, groundwater, services, acid-sulfate soils, structural design and geotechnical conditions. FRC flags this for survey and geotechnical review rather than inventing a depth.</p></div>
            </div> : <div className="parcel-empty"><i>↳</i><p><b>Your development envelope will appear here.</b><span>We’ll query the address, parcel, zoning, height, FSR, minimum lot size and principal heritage layer.</span></p></div>}
            <p>Planning snapshot only—not a planning certificate or approval. Confirm title, survey, easements, DCP controls, hazards, servicing and current legislation before design or purchase decisions.</p>
          </div>
        </div>
        <div className="stage-quote-wrap"><QuoteRoadmapCta onOpen={() => setQuoteSnapshot(buildQuoteSnapshot("01 / Property"))} /></div>
        </>}

        {setupStep === 2 && <>
        <div className="starter-stage ambition-stage">
          <div className="ambition-main"><span className="stage-number">02 / Define success</span><h3>What should this<br />property become?</h3><div className="goal-grid">{([["home", "New home", "One considered residence"], ["dual", "Dual occupancy", "Two homes, one site"], ["renovation", "Major renovation", "Keep, rework and extend"]] as const).map(([value, title, note]) => <button key={value} className={projectGoal === value ? "active" : ""} onClick={() => setProjectGoal(value)}><span>{value === "home" ? "⌂" : value === "dual" ? "⌂⌂" : "↗"}</span><b>{title}</b><small>{note}</small></button>)}</div><h4>What matters most?</h4><div className="priority-cloud">{["Natural light", "Budget certainty", "Fast approval", "Resale value", "Energy performance", "Flexible living", "Landscape", "Low maintenance"].map((priority) => <button key={priority} className={priorities.includes(priority) ? "active" : ""} onClick={() => togglePriority(priority)}>{priorities.includes(priority) ? "✓ " : "+ "}{priority}</button>)}</div></div>
          <aside className="pathway-choice"><span>Likely approval route</span><button className={roadmapPath === "cdc" ? "active" : ""} onClick={() => setRoadmapPath("cdc")}><i>FAST</i><b>CDC pathway</b><small>For eligible complying development. Certifier-led and typically faster.</small></button><button className={roadmapPath === "da" ? "active" : ""} onClick={() => setRoadmapPath("da")}><i>FULL</i><b>DA pathway</b><small>Council assessment for proposals outside the complying pathway.</small></button><p>FRC will confirm the pathway after reviewing controls, title, survey and the project brief.</p><button className="stage-next" onClick={() => setSetupStep(3)}>Generate success roadmap <span>→</span></button></aside>
        </div>
        <div className="stage-quote-wrap"><QuoteRoadmapCta onOpen={() => setQuoteSnapshot(buildQuoteSnapshot("02 / Ambition"))} /></div>
        </>}

        {setupStep === 3 && <div className="starter-stage roadmap-stage">
          <div className="roadmap-summary"><span className="stage-number">03 / Roadmap generated</span><h3>From property<br />to <em>progress.</em></h3><div className="summary-address"><small>Project</small><strong>{projectAddress || "Your NSW property"}</strong><span>{lotDp || "Lot / DP pending"} · {landArea} m² · {frontage}m frontage</span></div><div className="roadmap-signal"><div><span>Project model</span><b>{projectGoal === "home" ? "New home" : projectGoal === "dual" ? "Dual occupancy" : "Major renovation"}</b></div><div><span>Working pathway</span><b>{roadmapPath.toUpperCase()}</b></div><div><span>Parcel status</span><b>{propertyVerified ? "Client verified" : "Pending"}</b></div><div><span>Success priorities</span><b>{priorities.length}</b></div></div><button className="download-roadmap" onClick={() => window.print()}>Print / save roadmap <span>↓</span></button><button className="restart-roadmap" onClick={() => setSetupStep(1)}>Edit project inputs</button></div>
          <div className="roadmap-timeline">{roadmap.map(([number, title, detail, time], index) => <article key={number} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}><i>{number}</i><div><h4>{title}</h4><p>{detail}</p></div><span>{time}</span><b>{index === 0 && propertyVerified ? "Ready" : index === 1 ? "Start here" : "Upcoming"}</b></article>)}<QuoteRoadmapCta onOpen={() => setQuoteSnapshot(buildQuoteSnapshot("03 / Roadmap"))} /></div>
        </div>}
      </section>
      {quoteSnapshot && <QuoteRequestModal snapshot={quoteSnapshot} onClose={() => setQuoteSnapshot(null)} />}
    </main>
  );
}
