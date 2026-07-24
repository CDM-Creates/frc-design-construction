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
  { slug: "crown-line", name: "Crown Line Residence", location: "NSW", type: "New home", image: "/projects/crown-line/perspective.jpg", gallery: ["/projects/crown-line/perspective.jpg", "/projects/crown-line/isometric.jpg", "/projects/crown-line/floor-plan.jpg", "/projects/crown-line/elevations.jpg"], labels: ["Front and rear perspectives", "Spatial isometric", "Floor plan", "North and south elevations"] },
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

export default function Home() {
  const storyRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [projectType, setProjectType] = useState<"new" | "dual" | "reno">("dual");
  const [scope, setScope] = useState<"concept" | "approval" | "full">("full");
  const [buildCost, setBuildCost] = useState(1400);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [workMenuOpen, setWorkMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

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
    const typeFactor = { new: 1, dual: 1.22, reno: 1.12 }[projectType];
    const scopeFactor = { concept: 0.028, approval: 0.052, full: 0.085 }[scope];
    const midpoint = buildCost * 1000 * typeFactor * scopeFactor;
    return {
      low: Math.round(midpoint * .88 / 1000) * 1000,
      high: Math.round(midpoint * 1.16 / 1000) * 1000,
      programme: scope === "concept" ? "4-8 weeks" : scope === "approval" ? "4-8 months" : "8-14 months",
    };
  }, [buildCost, projectType, scope]);

  const p = Math.round(progress * 100);
  const realReveal = Math.max(0, Math.min(1, (progress - .27) * 1.8));
  const formatMoney = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  const galleryFor = (index: number) => projects[index].gallery ?? standardGallery(projects[index].slug, projects[index].image);
  const labelsFor = (index: number) => projects[index].labels ?? ["AI-enhanced perspective", "Architectural perspective", "Floor plan", "Elevations"];

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
        <div className="elevation-wrap"><img src="/projects/betula/perspectives.png" alt="Betula Avenue architectural perspective sheet" /><div className="elevation-caption">Front / rear perspectives · Design documentation</div></div>
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
        <div className="section-kicker">Architectural fee guide · Interactive</div>
        <div className="estimator-head"><h2>A useful range.<br />Not a <em>fake quote.</em></h2><p>Model an indicative architecture fee using project type, service scope and a realistic construction budget. Consultant, authority and construction costs are separate.</p></div>
        <div className="estimator-panel">
          <div className="controls">
            <fieldset><legend>Project type</legend><div className="segmented">{([["new", "New home"], ["dual", "Dual occupancy"], ["reno", "Renovation"]] as const).map(([value, label]) => <button key={value} className={projectType === value ? "active" : ""} onClick={() => setProjectType(value)}>{label}</button>)}</div></fieldset>
            <fieldset><legend>Service scope</legend><div className="segmented">{([["concept", "Concept"], ["approval", "To approval"], ["full", "Full service"]] as const).map(([value, label]) => <button key={value} className={scope === value ? "active" : ""} onClick={() => setScope(value)}>{label}</button>)}</div></fieldset>
            <label><span>Estimated construction budget <b>${(buildCost / 1000).toFixed(2)}m</b></span><input aria-label="Estimated construction budget" type="range" min="500" max="4000" step="50" value={buildCost} onChange={(e) => setBuildCost(Number(e.target.value))} /><i><small>$500k</small><small>$4m+</small></i></label>
            <button className="site-check" onClick={() => document.querySelector("#quote")?.scrollIntoView()}>Request a tailored fee proposal <span>↗</span></button>
          </div>
          <div className="estimate-output" aria-live="polite"><span>Indicative architecture fee</span><strong>{formatMoney(estimate.low)}—{formatMoney(estimate.high)}</strong><div><span>Selected scope</span><b>{scope === "concept" ? "Concept design" : scope === "approval" ? "Design + approval" : "Design to construction"}</b></div><div><span>Likely design programme</span><b>{estimate.programme}</b></div><div><span>Construction budget</span><b>{formatMoney(buildCost * 1000)}</b></div><small>Early guidance only, including GST. Final fees depend on site constraints, planning pathway, complexity, deliverables and consultant coordination. Construction and third-party fees are excluded.</small></div>
        </div>
      </section>

      <section className="quote" id="quote"><div><span className="section-kicker">Start with clarity</span><h2>Tell us the address.<br />We’ll show you the <em>potential.</em></h2></div><form onSubmit={(e) => e.preventDefault()}><label><span>Project address</span><input type="text" placeholder="e.g. 95 Betula Avenue" /></label><label><span>What are you planning?</span><select defaultValue=""><option value="" disabled>Select your project type</option><option>New home</option><option>Renovation or addition</option><option>Dual occupancy</option><option>Commercial or community</option></select></label><label><span>Your email</span><input type="email" placeholder="you@email.com" /></label><button type="submit">Get my project roadmap <span>↗</span></button><small>No hard sell. We’ll review your details and respond with the best next step.</small></form></section>
      <footer><div className="brand footer-brand"><span className="brand-mark">FRC</span><span>DESIGN +<br />CONSTRUCTION</span></div><p>Architecture, planning and documentation<br />for considered projects across Australia.</p><div><a href="#top">Back to top ↑</a><span>© 2026 FRC Design & Construction</span></div></footer>
    </main>
  );
}
