"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlanningValueStatus, SimulationPackage } from "../../lib/ai/contracts";
import type { ProjectRoomOverride } from "../../lib/project-data";

const List = ({ items }: { items: string[] }) => items.length
  ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
  : <p className="handover-empty">None recorded.</p>;

const sqm = (value?: number | null) => value === undefined || value === null
  ? "Not calculable"
  : `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(value)} m²`;

const sourceLabel: Record<PlanningValueStatus, string> = {
  verified: "Verified",
  mapped: "NSW mapped",
  "client-supplied": "Client supplied",
  "architect-entered": "Architect entered",
  missing: "Missing",
  conflict: "Conflict",
};

function ParcelDiagram({ data }: { data: SimulationPackage }) {
  const parcel = data.final_report.site_capacity.parcel_analysis;
  const polygon = useMemo(() => {
    const ring = parcel.geometry[0] || [];
    if (ring.length < 3) return "";
    const xs = ring.map(([x]) => x);
    const ys = ring.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return `polygon(${ring.map(([x, y]) => `${8 + ((x - minX) / (maxX - minX || 1)) * 84}% ${8 + (1 - ((y - minY) / (maxY - minY || 1))) * 84}%`).join(",")})`;
  }, [parcel.geometry]);
  return (
    <div className="handover-diagram">
      <div className="handover-diagram-grid" />
      <div className={`handover-parcel ${polygon ? "mapped" : ""}`} style={polygon ? { clipPath: polygon } : undefined}>
        <span>{parcel.selectedParcelId || "Parcel geometry unavailable"}</span>
        <b>{sqm(parcel.geometryAreaSqm)}</b>
      </div>
      <i>N ↑</i>
      <p>{parcel.envelopeNote}</p>
    </div>
  );
}

export default function ResultsClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<SimulationPackage | null>(null);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [architectToken, setArchitectToken] = useState("");
  const [editor, setEditor] = useState("");
  const [reason, setReason] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [verified, setVerified] = useState(false);
  const [surveyedArea, setSurveyedArea] = useState("");
  const [fsr, setFsr] = useState("");
  const [coverage, setCoverage] = useState("");
  const [frontSetback, setFrontSetback] = useState("");
  const [rearSetback, setRearSetback] = useState("");
  const [leftSetback, setLeftSetback] = useState("");
  const [rightSetback, setRightSetback] = useState("");
  const [landscape, setLandscape] = useState("");
  const [profile, setProfile] = useState<"efficient" | "comfortable" | "generous">("comfortable");
  const [lotType, setLotType] = useState("standard");
  const [frontConfirmed, setFrontConfirmed] = useState(false);
  const [architectNotes, setArchitectNotes] = useState("");
  const [roomOverrides, setRoomOverrides] = useState<ProjectRoomOverride[]>([]);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/simulation/${jobId}`, { cache: "no-store" });
        if (response.ok) {
          const result = await response.json() as SimulationPackage;
          const capacity = result.final_report.site_capacity;
          setProfile(capacity.household_profile);
          setLotType(capacity.parcel_analysis.lotType);
          setFrontConfirmed(capacity.parcel_analysis.frontBoundaryConfirmed);
          setArchitectNotes(capacity.architect_notes.join("\n"));
          setRoomOverrides(capacity.room_programme.map((room) => ({
            room_id: room.id,
            floor: room.floor,
            recommended_width_m: room.recommended_width_m,
            recommended_depth_m: room.recommended_depth_m,
            locked: room.locked,
            priority: room.priority,
          })));
          setData(result);
          return;
        }
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "The simulation result could not be loaded.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The simulation result could not be loaded.");
      }
    };
    void load();
  }, [jobId]);

  const requestReview = async () => {
    setReviewStatus("Sending…");
    const response = await fetch("/api/architect-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, message: "Please review the source-traceable feasibility, deterministic household programme, conflicts and missing professional investigations before confirming scope." }),
    });
    const result = await response.json() as { error?: string };
    setReviewStatus(response.ok ? "Review requested" : result.error || "Could not send request");
  };

  const updateRoom = (id: string, patch: Partial<ProjectRoomOverride>) => {
    setRoomOverrides((current) => current.map((item) => item.room_id === id ? { ...item, ...patch } : item));
  };

  const saveRevision = async () => {
    setSaveStatus("Saving…");
    const values = {
      surveyed_site_area: surveyedArea,
      fsr,
      site_coverage: coverage,
      front_setback: frontSetback,
      rear_setback: rearSetback,
      left_side_setback: leftSetback,
      right_side_setback: rightSetback,
      landscaped_area: landscape,
    };
    const response = await fetch(`/api/simulation/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Architect-Token": architectToken },
      body: JSON.stringify({
        editor,
        reason,
        sourceDocument,
        verified,
        values,
        lotType,
        frontBoundaryConfirmed: frontConfirmed,
        householdProfile: profile,
        architectNotes: architectNotes.split("\n").map((item) => item.trim()).filter(Boolean),
        roomOverrides,
      }),
    });
    const result = await response.json() as SimulationPackage & { error?: string };
    if (!response.ok) {
      setSaveStatus(result.error || "Revision could not be saved.");
      return;
    }
    setData(result);
    setSaveStatus("Saved and recalculated");
    setSurveyedArea("");
    setFsr("");
    setCoverage("");
    setFrontSetback("");
    setRearSetback("");
    setLeftSetback("");
    setRightSetback("");
    setLandscape("");
  };

  if (error) return <main className="results-page"><section className="results-state"><span>FRC · Handover</span><h1>Result unavailable.</h1><p>{error}</p><Link href="/">Return home →</Link></section></main>;
  if (!data) return <main className="results-page"><section className="results-state"><i className="analysis-spinner" /><span>FRC · Architect handover</span><h1>Loading the project result.</h1></section></main>;

  const report = data.final_report;
  const capacity = report.site_capacity;

  return (
    <main className="results-page handover-page">
      <nav className="results-nav">
        <Link className="brand" href="/"><span className="brand-mark">FRC</span><span>DESIGN &<br />CONSTRUCTION</span></Link>
        <div><span className={`results-status ${capacity.status}`}>{capacity.status_label}</span><button type="button" onClick={() => window.print()}>Print handover</button></div>
      </nav>

      <header className="results-cover">
        <div><span>Internal preliminary feasibility · {new Date(data.completed_at || data.created_at).toLocaleDateString("en-AU")}</span><h1>{report.project_title}</h1><p>{report.cover_statement}</p></div>
        <aside><small>Project reference</small><strong>{jobId.slice(0, 8).toUpperCase()}</strong><dl><div><dt>Calculation</dt><dd>{capacity.status_label}</dd></div><div><dt>Narrative</dt><dd>{report.narrative_mode === "ai-assisted" ? "AI-assisted" : "Deterministic / template-assisted"}</dd></div></dl></aside>
      </header>

      <section className="results-actions">
        <button type="button" onClick={requestReview}>{reviewStatus || "Request lead architect review"}<span>↗</span></button>
        <button type="button" onClick={() => setEditOpen((value) => !value)}>{editOpen ? "Close architect edit mode" : "Architect edit mode"}<span>↗</span></button>
        <button type="button" onClick={() => window.print()}>Print / save handover<span>↓</span></button>
      </section>

      <section className="handover-section handover-property">
        <header><span>01 / Property identity</span><h2>Matched land and private project record.</h2></header>
        <dl>
          <div><dt>Private address</dt><dd>{data.project.property.address || "Not supplied"}</dd></div>
          <div><dt>Lot / DP</dt><dd>{data.project.property.lot_details || "Not returned"}</dd></div>
          <div><dt>Selected parcel</dt><dd>{capacity.parcel_analysis.selectedParcelId || "Not returned"}</dd></div>
          <div><dt>Council</dt><dd>{data.project.planning.council || "Not returned"}</dd></div>
          <div><dt>Lot type</dt><dd>{capacity.parcel_analysis.lotType}</dd></div>
          <div><dt>Geometry</dt><dd>{capacity.parcel_analysis.irregularity.replaceAll("_", " ")} · rectangularity {capacity.parcel_analysis.rectangularity ?? "unknown"}</dd></div>
        </dl>
      </section>

      <section className="handover-section">
        <header><span>02 / Data confidence and source status</span><h2>Every input keeps its source.</h2></header>
        <div className="handover-source-grid">
          {capacity.controls.map((control) => <article key={control.key}>
            <span className={`source-badge ${control.planning_value.status}`}>{sourceLabel[control.planning_value.status]}</span>
            <h3>{control.label}</h3>
            <b>{control.planning_value.value === null ? "Missing" : String(control.planning_value.value)} {control.planning_value.unit || ""}</b>
            <p>{control.planning_value.sourceName}{control.planning_value.sourceLayer ? ` · ${control.planning_value.sourceLayer}` : ""}</p>
          </article>)}
        </div>
      </section>

      <section className="handover-section">
        <header><span>03 / Site-capacity summary</span><h2>Preliminary capacity, never approved area.</h2></header>
        <div className="handover-metrics">
          <article><span>Area used</span><strong>{sqm(capacity.site_area_sqm)}</strong><small>{capacity.area_source}</small></article>
          <article><span>Footprint cap</span><strong>{sqm(capacity.envelope.selected_footprint_cap_sqm)}</strong><small>lowest available cap</small></article>
          <article><span>Preliminary maximum GFA</span><strong>{sqm(capacity.envelope.preliminary_max_gfa_sqm)}</strong><small>not approved area</small></article>
          <article><span>Recommended concept target</span><strong>{sqm(capacity.envelope.recommended_design_gfa_sqm)}</strong><small>not approved area</small></article>
          <article><span>Usable internal estimate</span><strong>{sqm(capacity.envelope.estimated_usable_internal_sqm)}</strong><small>early allowance</small></article>
          <article><span>Limiting control</span><strong>{capacity.limiting_control || "Not established"}</strong><small>{capacity.confidence_status} confidence</small></article>
        </div>
        {[...capacity.conflicts, ...capacity.warnings].length > 0 && <div className="handover-alert"><h3>Visible conflicts and warnings</h3><List items={[...capacity.conflicts, ...capacity.warnings]} /></div>}
      </section>

      <section className="handover-section handover-two">
        <article><header><span>04 / How the capacity was calculated</span><h2>Formula and values used.</h2></header><List items={capacity.calculation_steps} /></article>
        <article><header><span>05 / Parcel and preliminary envelope</span><h2>Geometry retained for review.</h2></header><ParcelDiagram data={data} /></article>
      </section>

      <section className="handover-section handover-fit">
        <header><span>06 / Client brief fit</span><h2>{capacity.household_profile} profile · {capacity.programme_fit.status}.</h2></header>
        <p>{capacity.programme_fit.explanation}</p>
        <div className="handover-metrics compact">
          <article><span>Minimum programme</span><strong>{sqm(capacity.programme_fit.minimum_gross_area_sqm)}</strong></article>
          <article><span>Selected profile</span><strong>{sqm(capacity.programme_fit.requested_net_area_sqm)}</strong></article>
          <article><span>Available target</span><strong>{sqm(capacity.programme_fit.available_design_area_sqm)}</strong></article>
          <article><span>Difference</span><strong>{capacity.programme_fit.shortfall_or_surplus_sqm === undefined ? "Unknown" : sqm(capacity.programme_fit.shortfall_or_surplus_sqm)}</strong></article>
        </div>
        <List items={capacity.programme_fit.suggested_adjustments} />
      </section>

      <section className="handover-section">
        <header><span>07 / Floor-by-floor programme</span><h2>Preliminary allocation.</h2></header>
        <div className="handover-floor-grid">{report.floor_totals.map((floor) => <article key={floor.floor}><h3>{floor.floor}</h3><strong>{sqm(floor.total_area_sqm)}</strong><p>{floor.rooms.join(" · ")}</p><small>{sqm(floor.internal_area_sqm)} internal · {sqm(floor.external_or_verify_area_sqm)} external/verify</small></article>)}</div>
      </section>

      <section className="handover-section">
        <header><span>08 / Room dimensions</span><h2>Deterministic household programme.</h2></header>
        <div className="handover-room-table">
          <div className="handover-room-row heading"><b>Room</b><b>Floor</b><b>Dimensions</b><b>Area / fit</b><b>Priority / adjacency</b></div>
          {report.room_programme.map((room) => <div className="handover-room-row" key={room.id}><strong>{room.room_name}<small>{room.main_purpose}</small></strong><span>{room.floor}</span><span>{room.recommended_width_m} × {room.recommended_depth_m} m</span><span>{sqm(room.allocated_area_sqm)}<small>{room.fit_status.replaceAll("_", " ")}</small></span><span>{room.priority}<small>{room.adjacency_list.join(", ")}</small></span></div>)}
        </div>
      </section>

      <section className="handover-section">
        <header><span>09 / Development-pathway comparison</span><h2>Three early options, no invented construction prices.</h2></header>
        <div className="handover-pathways">{report.development_pathways.map((pathway) => <article key={pathway.option_name}><span>{pathway.applicability.replaceAll("_", " ")}</span><h3>{pathway.option_name}</h3><p>{pathway.household_programme_fit}</p><dl><div><dt>Flexibility</dt><dd>{pathway.design_flexibility}</dd></div><div><dt>Planning</dt><dd>{pathway.relative_planning_complexity}</dd></div><div><dt>Relative cost</dt><dd>{pathway.relative_cost}</dd></div></dl><h4>Advantages</h4><List items={pathway.major_advantages} /><h4>Limitations</h4><List items={pathway.major_limitations} /><b>{pathway.recommended_next_step}</b></article>)}</div>
      </section>

      <section className="handover-section handover-two">
        <article><header><span>10 / Missing information</span><h2>Inputs not yet available.</h2></header><List items={[...report.missing_information, ...report.missing_documents]} /></article>
        <article><header><span>11 / Planning controls requiring verification</span><h2>Do not hide the unknowns.</h2></header><List items={report.planning_information_requiring_verification} /></article>
      </section>

      <section className={`handover-section architect-edit ${editOpen ? "open" : ""}`}>
        <header><span>12 / Architect overrides and notes</span><h2>Preserve sources, add professional judgment.</h2><button type="button" onClick={() => setEditOpen((value) => !value)}>{editOpen ? "Close edit mode" : "Open authorised edit mode"}</button></header>
        {editOpen && <div className="architect-edit-form">
          <div className="architect-edit-grid">
            <label><span>Architect access token</span><input type="password" value={architectToken} onChange={(event) => setArchitectToken(event.target.value)} /></label>
            <label><span>Editor name</span><input value={editor} onChange={(event) => setEditor(event.target.value)} /></label>
            <label className="wide"><span>Reason for change</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <label className="wide"><span>Source document reference</span><input value={sourceDocument} onChange={(event) => setSourceDocument(event.target.value)} placeholder="Survey title, revision and date" /></label>
            <label><span>Surveyed site area (m²)</span><input type="number" min="1" value={surveyedArea} onChange={(event) => setSurveyedArea(event.target.value)} /></label>
            <label><span>FSR</span><input value={fsr} onChange={(event) => setFsr(event.target.value)} placeholder="e.g. 0.5:1" /></label>
            <label><span>Site coverage</span><input value={coverage} onChange={(event) => setCoverage(event.target.value)} placeholder="e.g. 50%" /></label>
            <label><span>Landscaped area</span><input value={landscape} onChange={(event) => setLandscape(event.target.value)} placeholder="e.g. 35%" /></label>
            <label><span>Front setback (m)</span><input type="number" min="0" value={frontSetback} onChange={(event) => setFrontSetback(event.target.value)} /></label>
            <label><span>Rear setback (m)</span><input type="number" min="0" value={rearSetback} onChange={(event) => setRearSetback(event.target.value)} /></label>
            <label><span>Left setback (m)</span><input type="number" min="0" value={leftSetback} onChange={(event) => setLeftSetback(event.target.value)} /></label>
            <label><span>Right setback (m)</span><input type="number" min="0" value={rightSetback} onChange={(event) => setRightSetback(event.target.value)} /></label>
            <label><span>Household profile</span><select value={profile} onChange={(event) => setProfile(event.target.value as typeof profile)}><option value="efficient">Efficient</option><option value="comfortable">Comfortable</option><option value="generous">Generous</option></select></label>
            <label><span>Confirmed lot type</span><select value={lotType} onChange={(event) => setLotType(event.target.value)}><option value="standard">Standard</option><option value="corner">Corner</option><option value="battleaxe">Battle-axe</option><option value="tapered">Tapered</option><option value="irregular">Irregular</option></select></label>
            <label className="checkbox"><input type="checkbox" checked={frontConfirmed} onChange={(event) => setFrontConfirmed(event.target.checked)} /><span>Front boundary confirmed</span></label>
            <label className="checkbox"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span>Mark entered controls verified</span></label>
            <label className="wide"><span>Architect notes (one per line)</span><textarea rows={5} value={architectNotes} onChange={(event) => setArchitectNotes(event.target.value)} /></label>
          </div>
          <h3>Room locks, dimensions and floors</h3>
          <div className="architect-room-overrides">{report.room_programme.map((room) => {
            const override = roomOverrides.find((item) => item.room_id === room.id);
            return <div key={room.id}><b>{room.room_name}</b><input aria-label={`${room.room_name} floor`} value={override?.floor || room.floor} onChange={(event) => updateRoom(room.id, { floor: event.target.value })} /><input aria-label={`${room.room_name} width`} type="number" min="1" step=".1" value={override?.recommended_width_m || room.recommended_width_m} onChange={(event) => updateRoom(room.id, { recommended_width_m: Number(event.target.value) })} /><input aria-label={`${room.room_name} depth`} type="number" min="1" step=".1" value={override?.recommended_depth_m || room.recommended_depth_m} onChange={(event) => updateRoom(room.id, { recommended_depth_m: Number(event.target.value) })} /><label><input type="checkbox" checked={override?.locked ?? room.locked} onChange={(event) => updateRoom(room.id, { locked: event.target.checked })} /> Lock</label></div>;
          })}</div>
          <button className="architect-save" type="button" disabled={!architectToken || !editor || !reason || saveStatus === "Saving…"} onClick={saveRevision}>Save override and recalculate</button>
          {saveStatus && <p className="architect-save-status">{saveStatus}</p>}
        </div>}
        {!editOpen && <><List items={report.architect_notes} /><p>{capacity.architect_overrides.length} preserved override record(s).</p></>}
      </section>

      <section className="results-next">
        <div><span>13 / Recommended next steps</span><h2>Turn the handover<br /><em>into measured design.</em></h2></div>
        <ol>{report.recommended_next_steps.map((step, index) => <li key={step}><i>{String(index + 1).padStart(2, "0")}</i><span>{step}</span></li>)}</ol>
      </section>

      <section className="results-disclaimer"><b>14 / Architectural disclaimer</b><p>{report.architectural_disclaimer}</p><h3>Professional investigations</h3><List items={report.required_professional_investigations} /></section>

      <footer className="results-footer"><Link className="brand" href="/"><span className="brand-mark">FRC</span><span>DESIGN &<br />CONSTRUCTION</span></Link><p>Source-traceable preliminary feasibility.<br />Professional verification remains essential.</p><span>© 2026 FRC Design & Construction</span></footer>
    </main>
  );
}
