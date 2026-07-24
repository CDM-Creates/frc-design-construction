"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const capabilities = [
  ["01", "Feasibility", "Planning controls, site potential and a clear path before you commit."],
  ["02", "Design", "Architecture shaped around your brief, budget and the way you want to live."],
  ["03", "Approvals", "A coordinated submission managed from first drawing to determination."],
  ["04", "Delivery", "Detailed documentation that gives builders fewer questions and you more certainty."],
];

const projects = [
  { slug: "betula", name: "Betula Avenue Residences", location: "VIC", type: "Dual occupancy", image: "/projects/betula/realistic.png", feature: true, gallery: ["/projects/betula/realistic.png", "/projects/betula/perspectives.png", "/projects/betula/ground-plan.jpg", "/projects/betula/level-plan.jpg"], labels: ["Photoreal exterior study", "Architectural perspectives", "Ground floor plan", "Upper floor plan"] },
  { slug: "crown-line", name: "Crown Line Residence", location: "Rothbury, NSW", type: "New home", image: "/projects/crown-line/realistic.png", gallery: ["/projects/crown-line/realistic.png", "/projects/crown-line/perspective.jpg", "/projects/crown-line/floor-plan.jpg", "/projects/crown-line/elevations.jpg"], labels: ["Photoreal exterior study", "Original design perspectives", "Floor plan", "North and south elevations"] },
  { slug: "alicante", name: "Alicante Residence", location: "Minchinbury, NSW", type: "Dual occupancy", image: "/projects/ai/alicante.jpg" },
  { slug: "varian", name: "Varian Street Homes", location: "Mount Druitt, NSW", type: "Dual occupancy", image: "/projects/ai/varian.jpg" },
  { slug: "norwest", name: "Anvaya Norwest", location: "Norwest, NSW", type: "Hospitality + wellness", image: "/projects/ai/norwest.jpg" },
  { slug: "market-street", name: "Market Street Residence", location: "Smithfield, NSW", type: "Renovation + addition", image: "/projects/ai/market-street.jpg" },
  { slug: "glenda", name: "Glenda Place", location: "Plumpton, NSW", type: "Residential addition", image: "/projects/ai/glenda.jpg" },
  { slug: "good-shepherd", name: "Good Shepherd Conference Room", location: "Plumpton, NSW", type: "Community", image: "/projects/ai/good-shepherd.jpg" },
];

const standardGallery = (slug: string, image: string) => [
  image,
  `/projects/gallery/${slug}/01.jpg`,
  `/projects/gallery/${slug}/02.jpg`,
  `/projects/gallery/${slug}/03.jpg`,
];

const materialSchemes = [
  { name: "Warm mineral", note: "Soft, enduring and naturally tactile.", colours: ["#d8cdbc", "#867765", "#332f2a"], tags: ["Mineral render", "Spotted gum", "Bronze aluminium"] },
  { name: "Quiet contrast", note: "A crisp palette with grounded depth.", colours: ["#eeeae0", "#515954", "#191d1b"], tags: ["Fine render", "Textured masonry", "Charcoal metal"] },
  { name: "Earth + light", note: "Warm masonry balanced with pale surfaces.", colours: ["#c68a60", "#ede5d5", "#736b5c"], tags: ["Face brick", "Lime render", "Sandstone paving"] },
];

type SiteAnalysis = {
  matchedAddress: string;
  council: string;
  area: number | null;
  boundary: number[][];
  controls: { zone: string; zoneName: string; lep: string; maxHeight: string | null; fsr: string | null; minimumLotSize: string | null; heritage: string | null };
  opportunities: string[][];
  constraints: { name: string; value: string; status: string }[];
  analysedAt: string;
};

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
  const [workMenuOpen, setWorkMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [setupStep, setSetupStep] = useState(1);
  const [projectAddress, setProjectAddress] = useState("");
  const [lotDp, setLotDp] = useState("");
  const [landArea, setLandArea] = useState(650);
  const [frontage, setFrontage] = useState(15);
  const [projectGoal, setProjectGoal] = useState<"home" | "dual" | "renovation">("home");
  const [roadmapPath, setRoadmapPath] = useState<"cdc" | "da">("da");
  const [propertyVerified, setPropertyVerified] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(["Natural light", "Budget certainty"]);
  const [reportName, setReportName] = useState("");
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    const update = () => {
      if (!storyRef.current) return;
      const rect = storyRef.current.getBoundingClientRect();
      const distance = storyRef.current.offsetHeight - window.innerHeight;
      setProgress(Math.max(0, Math.min(1, -rect.top / distance)));
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProject(null);
      if (event.key === "ArrowLeft") setActiveSlide((slide) => (slide + 3) % 4);
      if (event.key === "ArrowRight") setActiveSlide((slide) => (slide + 1) % 4);
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

  const p = Math.round(progress * 100);
  const realReveal = Math.max(0, Math.min(1, (progress - .27) * 1.8));
  const formatMoney = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  const galleryFor = (index: number) => projects[index].gallery ?? standardGallery(projects[index].slug, projects[index].image);
  const labelsFor = (index: number) => projects[index].labels ?? ["AI-enhanced perspective", "Architectural perspective", "Floor plan", "Elevations"];
  const boundaryPolygon = useMemo(() => {
    if (!analysis?.boundary?.length) return "polygon(4% 7%, 92% 0, 100% 86%, 14% 100%, 0 48%)";
    const xs = analysis.boundary.map(([x]) => x);
    const ys = analysis.boundary.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return `polygon(${analysis.boundary.map(([x, y]) => `${8 + ((x - minX) / (maxX - minX || 1)) * 84}% ${8 + (1 - (y - minY) / (maxY - minY || 1)) * 84}%`).join(",")})`;
  }, [analysis]);
  const togglePriority = (priority: string) => setPriorities((current) => current.includes(priority) ? current.filter((item) => item !== priority) : [...current, priority]);
  const analyseProperty = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/site-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: projectAddress }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Property analysis failed.");
      setAnalysis(result);
      if (result.area) setLandArea(result.area);
      setPropertyVerified(true);
    } catch (error) {
      setPropertyVerified(false);
      setAnalysisError(error instanceof Error ? error.message : "Property analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  };
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
      <nav className={`nav ${workMenuOpen ? "menu-active" : ""}`}>
        <a className="brand" href="#top" aria-label="FRC Design and Construction home"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></a>
        <div className="nav-links">
          <button className="work-menu-trigger" aria-expanded={workMenuOpen} aria-controls="work-menu" onClick={() => setWorkMenuOpen((open) => !open)}>Selected work <span>{workMenuOpen ? "−" : "+"}</span></button>
          <a href="#studio">Studio</a>
        </div>
        <a className="quote-link" href="#quote">Start a project <span>↗</span></a>
        <div className={`work-menu ${workMenuOpen ? "open" : ""}`} id="work-menu">
          <div className="menu-heading"><span>Project index</span><strong>Selected work</strong></div>
          <div className="menu-projects">{projects.map((project, index) => (
            <a href={`#project-${project.slug}`} key={project.slug} onClick={() => setWorkMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{project.name}</strong><small>{project.type}</small><i>↘</i></a>
          ))}</div>
        </div>
      </nav>

      <section className="story" id="top" ref={storyRef}>
        <div className="story-sticky">
          <div className="grid-field" style={{ opacity: Math.max(.08, 1 - progress * 1.25) }} />
          <div className="chapter-count">01 / 03</div>
          <div className="project-label"><span>Selected project</span><strong>Betula Avenue<br />Residences</strong></div>
          <div className="model-frame" style={{ transform: `translate3d(0, ${Math.max(0, progress - .76) * -70}px, 0) scale(${.84 + Math.min(progress, .6) * .27})`, borderRadius: `${Math.max(0, 20 - progress * 30)}px` }}>
            <img className="model-image plan-image" src="/projects/betula/drawing.png" alt="Architectural model of the Betula Avenue dual occupancy" />
            <div className="drawing-overlay" style={{ opacity: Math.max(0, 1 - progress * 1.8) }}><span className="measure measure-a">A.01 / FRONT</span><span className="measure measure-b">3 LEVELS</span><span className="axis axis-x" /><span className="axis axis-y" /></div>
            <div className="reality-wipe" style={{ clipPath: `inset(0 0 0 ${100 - realReveal * 100}%)` }}>
              <img className="context-image" src="/projects/betula/realistic.png" alt="Photorealistic visualization of the Betula Avenue residence" />
            </div>
            <div className="reveal-line" style={{ left: `${realReveal * 100}%`, opacity: realReveal > .02 && realReveal < .98 ? 1 : 0 }}><span>DRAWING / BUILT FORM</span></div>
            <div className="frame-shade" style={{ opacity: Math.max(0, (progress - .66) * 1.8) }} />
          </div>
          <div className={`story-copy copy-one ${p > 8 && p < 35 ? "visible" : ""}`}><span className="eyebrow">01 · Draw the idea</span><h1>Every home starts<br />as a <em>possibility.</em></h1></div>
          <div className={`story-copy copy-two ${p >= 40 && p < 70 ? "visible" : ""}`}><span className="eyebrow">02 · Resolve the detail</span><h2>Line by line,<br />it becomes <em>real.</em></h2></div>
          <div className={`story-copy copy-three ${p >= 74 ? "visible" : ""}`}><span className="eyebrow">Betula Avenue · Dual occupancy</span><h2>Designed on paper.<br /><em>Ready</em> for life.</h2><a href="#work">Explore the project <span>↓</span></a></div>
          <div className="scroll-meter"><span>Scroll to make it real</span><i><b style={{ transform: `scaleX(${progress})` }} /></i><span>{String(Math.max(1, Math.ceil(progress * 3))).padStart(2, "0")} / 03</span></div>
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
          <div className="resolved-image drawing"><img src="/projects/betula/drawing.png" alt="Betula Avenue architectural model" /><span>01 / Architectural model</span></div>
          <div className="resolved-image reality"><img src="/projects/betula/realistic.png" alt="Photoreal Betula Avenue exterior" /><span>02 / Resolved material study</span></div>
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
              <div className="project-image"><img src={project.image} alt={`${project.name} architectural project by FRC Design and Construction`} /><span>Open gallery ↗</span></div>
              <div className="project-card-copy"><h3>{project.name}</h3><p>{project.location} · {project.type}</p></div>
            </button>
          </article>
        ))}</div>
      </section>

      {activeProject !== null && (
        <div className="project-modal" role="dialog" aria-modal="true" aria-label={`${projects[activeProject].name} project gallery`} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProject(null); }}>
          <div className="project-viewer">
            <header><div><span>{projects[activeProject].location} · {projects[activeProject].type}</span><h2>{projects[activeProject].name}</h2></div><button type="button" onClick={() => setActiveProject(null)}>Close ×</button></header>
            <div className={`viewer-image ${activeSlide > 0 ? "drawing" : ""}`}><img src={galleryFor(activeProject)[activeSlide]} alt={`${projects[activeProject].name}: ${labelsFor(activeProject)[activeSlide]}`} /></div>
            <footer><div><span>{String(activeSlide + 1).padStart(2, "0")} / 04</span><strong>{labelsFor(activeProject)[activeSlide]}</strong></div><div className="viewer-controls"><button onClick={() => setActiveSlide((slide) => (slide + 3) % 4)}>←</button><button onClick={() => setActiveSlide((slide) => (slide + 1) % 4)}>→</button></div></footer>
          </div>
        </div>
      )}

      <section className="studio" id="studio">
        <div className="section-kicker light">How we work</div>
        <div className="studio-heading"><h2>One clear journey.<br />No <em>guesswork.</em></h2><p>Good design is only half the job. We make the entire process legible—from what is possible on your site to what it will take to build.</p></div>
        <div className="capability-grid">{capabilities.map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="estimator" id="estimate">
        <div className="section-kicker">FRC Project Intelligence · Live model</div>
        <div className="estimator-head"><h2>Price the pathway.<br />See every <em>move.</em></h2><p>A live pre-fee model grounded in construction value, typology, approval effort, site risk and service depth—not a generic square-metre calculator.</p></div>
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
            <button className="proposal-button" onClick={() => document.querySelector("#quote")?.scrollIntoView()}>Turn this scenario into a tailored proposal <span>↗</span></button>
            <p className="estimate-disclaimer">Decision-support estimate only, not a quotation. It excludes authority charges, specialist reports outside the allowance, interior procurement, builder preliminaries, escalation and latent conditions. Final fees follow a project-specific brief and site review.</p>
          </div>
        </div>
      </section>

      <section className="project-starter" id="quote">
        <header className="starter-head"><div><span className="section-kicker">FRC Project Starter · Live workspace</span><h2>Your land.<br />Your <em>roadmap.</em></h2></div><p>Turn a property into an actionable project brief. Confirm the official parcel, shape the ambition and leave with a tailored path from due diligence to construction.</p></header>
        <nav className="starter-progress" aria-label="Project setup progress">{[["01", "Property"], ["02", "Ambition"], ["03", "Roadmap"]].map(([number, label], index) => <button key={number} className={setupStep === index + 1 ? "active" : setupStep > index + 1 ? "done" : ""} onClick={() => setSetupStep(index + 1)}><i>{setupStep > index + 1 ? "✓" : number}</i><span>{label}</span></button>)}</nav>

        {setupStep === 1 && <div className="starter-stage property-stage">
          <div className="property-form">
            <span className="stage-number">01 / Establish the ground truth</span>
            <h3>Start with the land,<br />not assumptions.</h3>
            <p>Enter one complete NSW address. FRC Site Intelligence will resolve the official property record and interrogate the live statewide planning layers automatically.</p>
            <label><span>NSW property address</span><input value={projectAddress} onChange={(event) => { setProjectAddress(event.target.value); setAnalysis(null); setPropertyVerified(false); }} placeholder="e.g. 31 Crown Line Drive, Rothbury NSW 2320" /></label>
            <button className="analyse-property" disabled={!projectAddress || analysisLoading} onClick={analyseProperty}>{analysisLoading ? <><i className="analysis-spinner" />Reading NSW planning layers…</> : <>Analyse what I can build <span>→</span></>}</button>
            {analysisError && <div className="analysis-error"><b>We couldn’t complete that address.</b><span>{analysisError}</span></div>}
            {!analysis && !analysisLoading && <div className="analysis-promise"><span>Live report includes</span><div><b>Zoning</b><b>Height</b><b>FSR</b><b>Lot size</b><b>Heritage</b><b>Parcel area</b></div><small>No sign-up. Results come from official NSW spatial services.</small></div>}
            {analysis && <div className="analysis-confirmation"><div><i>✓</i><span><b>Official property matched</b><small>{analysis.matchedAddress} · {analysis.council} Council</small></span></div><dl><div><dt>Zone</dt><dd>{analysis.controls.zone} · {analysis.controls.zoneName}</dd></div><div><dt>Planning instrument</dt><dd>{analysis.controls.lep}</dd></div><div><dt>Official parcel area</dt><dd>{analysis.area?.toLocaleString() ?? "Not returned"} m²</dd></div><div><dt>Data status</dt><dd>Live NSW layers</dd></div></dl></div>}
            <div className="analysis-support"><a href="https://www.planningportal.nsw.gov.au/spatialviewer/#/find-a-property/address" target="_blank" rel="noreferrer">Verify in NSW Spatial Viewer ↗</a><label><span className="file-control"><input type="file" accept=".pdf,image/*" onChange={(event) => setReportName(event.target.files?.[0]?.name ?? "")} /><b>{reportName || "Attach property report"}</b></span></label></div>
            <button className="stage-next" disabled={!analysis} onClick={() => setSetupStep(2)}>Explore my development potential <span>→</span></button>
          </div>
          <div className="parcel-lab">
            <div className="parcel-map"><div className="map-grid" /><div className="road-label">{analysis ? `OFFICIAL PROPERTY · ${analysis.controls.zone}` : "AWAITING ADDRESS"}</div><div className={`parcel-shape ${analysis ? "live" : ""}`} style={{ clipPath: boundaryPolygon }}><span>{analysis ? "NSW CADASTRAL PARCEL" : "PROPERTY ENVELOPE"}</span><b>{analysis?.area?.toLocaleString() ?? landArea} m²</b><i className="north">N ↑</i></div><div className="map-pin"><i /><span>{analysis?.matchedAddress || projectAddress || "Your property"}</span></div></div>
            {analysis ? <div className="control-dashboard">
              <header><div><span>Automatic planning snapshot</span><strong>What the mapped controls say</strong></div><b>LIVE</b></header>
              <div className="control-grid"><article><span>Zone</span><strong>{analysis.controls.zone}</strong><small>{analysis.controls.zoneName}</small></article><article><span>Max height</span><strong>{analysis.controls.maxHeight ?? "Not mapped"}</strong><small>{analysis.controls.maxHeight ? "LEP maximum" : "LEP / DCP review"}</small></article><article><span>Floor-space ratio</span><strong>{analysis.controls.fsr ?? "Not mapped"}</strong><small>{analysis.controls.fsr ? "Mapped maximum" : "No statewide value hit"}</small></article><article><span>Minimum lot size</span><strong>{analysis.controls.minimumLotSize ?? "Not mapped"}</strong><small>{analysis.controls.minimumLotSize ? "Mapped control" : "LEP clause review"}</small></article></div>
              <div className="opportunity-list"><span>Development opportunities to test</span>{analysis.opportunities.map(([title, status, detail]) => <div key={title}><i>{status === "Likely zone-compatible" || status === "Zone-led opportunity" ? "✓" : "?"}</i><p><b>{title}</b><small>{detail}</small></p><strong>{status}</strong></div>)}</div>
              <div className="constraint-list"><span>Constraints + unknowns</span>{analysis.constraints.map((constraint) => <div key={constraint.name}><b>{constraint.name}</b><span>{constraint.value}</span><i className={constraint.status}>{constraint.status === "mapped" ? "Mapped" : constraint.status === "clear" ? "No hit" : "Verify"}</i></div>)}</div>
              <div className="excavation-note"><b>How far can I dig?</b><p>The Spatial Viewer does not provide one statewide “maximum excavation depth”. It depends on the approval pathway, council DCP, slope, groundwater, services, acid-sulfate soils, structural design and geotechnical conditions. FRC flags this for survey and geotechnical review rather than inventing a depth.</p></div>
            </div> : <div className="parcel-empty"><i>↳</i><p><b>Your development envelope will appear here.</b><span>We’ll query the address, parcel, zoning, height, FSR, minimum lot size and principal heritage layer.</span></p></div>}
            <p>Planning snapshot only—not a planning certificate or approval. Confirm title, survey, easements, DCP controls, hazards, servicing and current legislation before design or purchase decisions.</p>
          </div>
        </div>}

        {setupStep === 2 && <div className="starter-stage ambition-stage">
          <div className="ambition-main"><span className="stage-number">02 / Define success</span><h3>What should this<br />property become?</h3><div className="goal-grid">{([["home", "New home", "One considered residence"], ["dual", "Dual occupancy", "Two homes, one site"], ["renovation", "Major renovation", "Keep, rework and extend"]] as const).map(([value, title, note]) => <button key={value} className={projectGoal === value ? "active" : ""} onClick={() => setProjectGoal(value)}><span>{value === "home" ? "⌂" : value === "dual" ? "⌂⌂" : "↗"}</span><b>{title}</b><small>{note}</small></button>)}</div><h4>What matters most?</h4><div className="priority-cloud">{["Natural light", "Budget certainty", "Fast approval", "Resale value", "Energy performance", "Flexible living", "Landscape", "Low maintenance"].map((priority) => <button key={priority} className={priorities.includes(priority) ? "active" : ""} onClick={() => togglePriority(priority)}>{priorities.includes(priority) ? "✓ " : "+ "}{priority}</button>)}</div></div>
          <aside className="pathway-choice"><span>Likely approval route</span><button className={roadmapPath === "cdc" ? "active" : ""} onClick={() => setRoadmapPath("cdc")}><i>FAST</i><b>CDC pathway</b><small>For eligible complying development. Certifier-led and typically faster.</small></button><button className={roadmapPath === "da" ? "active" : ""} onClick={() => setRoadmapPath("da")}><i>FULL</i><b>DA pathway</b><small>Council assessment for proposals outside the complying pathway.</small></button><p>FRC will confirm the pathway after reviewing controls, title, survey and the project brief.</p><button className="stage-next" onClick={() => setSetupStep(3)}>Generate success roadmap <span>→</span></button></aside>
        </div>}

        {setupStep === 3 && <div className="starter-stage roadmap-stage">
          <div className="roadmap-summary"><span className="stage-number">03 / Roadmap generated</span><h3>From property<br />to <em>progress.</em></h3><div className="summary-address"><small>Project</small><strong>{projectAddress || "Your NSW property"}</strong><span>{lotDp || "Lot / DP pending"} · {landArea} m² · {frontage}m frontage</span></div><div className="roadmap-signal"><div><span>Project model</span><b>{projectGoal === "home" ? "New home" : projectGoal === "dual" ? "Dual occupancy" : "Major renovation"}</b></div><div><span>Working pathway</span><b>{roadmapPath.toUpperCase()}</b></div><div><span>Parcel status</span><b>{propertyVerified ? "Client verified" : "Pending"}</b></div><div><span>Success priorities</span><b>{priorities.length}</b></div></div><button className="download-roadmap" onClick={() => window.print()}>Print / save roadmap <span>↓</span></button><button className="restart-roadmap" onClick={() => setSetupStep(1)}>Edit project inputs</button></div>
          <div className="roadmap-timeline">{roadmap.map(([number, title, detail, time], index) => <article key={number} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}><i>{number}</i><div><h4>{title}</h4><p>{detail}</p></div><span>{time}</span><b>{index === 0 && propertyVerified ? "Ready" : index === 1 ? "Start here" : "Upcoming"}</b></article>)}<div className="roadmap-cta"><div><small>Your highest-leverage next move</small><strong>Book the feasibility sprint.</strong><p>We validate the planning pathway, test the site and turn this roadmap into a project-specific proposal.</p></div><a href="mailto:hello@frcdesign.com.au?subject=Project feasibility sprint">Send this project to FRC <span>↗</span></a></div></div>
        </div>}
      </section>
      <footer><div className="brand footer-brand"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></div><p>Architecture, planning and documentation<br />for considered projects across Australia.</p><div><a href="#top">Back to top ↑</a><span>© 2026 FRC Design & Construction</span></div></footer>
    </main>
  );
}
