import { calculateSiteCapacity } from "../../lib/ai/site-capacity";
import { orchestrateSimulation } from "../../lib/ai/orchestrator";
import { createEmptyProject, mergeProjectData } from "../../lib/project-data";
import { completeSimulationRecords, createSimulationRecords } from "../../lib/simulation-repository";
import { setSimulationMemory } from "../../lib/simulation-memory";

type QuoteProject = {
  sourceStep?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  lotDp?: string;
  landArea?: number;
  mappedParcelArea?: number | null;
  calculatedGeometryArea?: number | null;
  parcelId?: string;
  frontage?: number;
  depth?: number;
  lotType?: string;
  slope?: string;
  existingDwelling?: boolean;
  storeys?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  projectGoal?: string;
  roadmapPath?: string;
  priorities?: string[];
  propertyVerified?: boolean;
  planning?: {
    council?: string;
    zone?: string;
    zoneName?: string;
    maxHeight?: string;
    fsr?: string;
    minimumLotSize?: string;
    heritage?: string;
    bushfire?: string;
    flooding?: string;
  };
};

type QuoteRequest = {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferredContact?: string;
  budget?: string;
  timeline?: string;
  message?: string;
  confirmed?: boolean;
  website?: string;
  project?: QuoteProject;
};

const text = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const html = (value: unknown) => text(value, 8000)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;")
  .replaceAll("\n", "<br />");

function projectType(value?: string) {
  if (value === "dual") return "Dual occupancy";
  if (value === "renovation") return "Major renovation";
  return "New home";
}

function row(label: string, value: unknown) {
  const clean = text(value, 3000) || "Not supplied";
  return `<tr><td style="padding:10px 12px;border-bottom:1px solid #d8d5ca;color:#6b716d;font:11px monospace;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;width:170px">${html(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #d8d5ca;color:#17221d;font:14px Arial,sans-serif;line-height:1.45">${html(clean)}</td></tr>`;
}

function list(items: string[]) {
  return items.length
    ? `<ul style="margin:8px 0 20px;padding-left:20px">${items.map((item) => `<li style="margin:0 0 7px;line-height:1.5">${html(item)}</li>`).join("")}</ul>`
    : `<p style="color:#6b716d">None recorded.</p>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as QuoteRequest;

    // Honeypot: acknowledge obvious bot submissions without sending an email.
    if (text(body.website, 200)) return Response.json({ ok: true });

    const fullName = text(body.fullName, 120);
    const email = text(body.email, 200);
    const phone = text(body.phone, 80);
    const message = text(body.message, 5000);
    const project = body.project ?? {};

    if (!fullName || !email || !phone || !message || body.confirmed !== true) {
      return Response.json({ error: "Complete the required contact fields, project message and confirmation before sending." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.HEAD_ARCHITECT_EMAIL ?? "sheila_delmonte@yahoo.com";
    const from = process.env.QUOTE_FROM_EMAIL ?? "FRC Website <onboarding@resend.dev>";

    if (!apiKey) {
      return Response.json({ error: "Email delivery is not configured yet. Add RESEND_API_KEY, HEAD_ARCHITECT_EMAIL and QUOTE_FROM_EMAIL to the deployment environment." }, { status: 503 });
    }

    const propertyAddress = text(project.address, 300) || [text(project.suburb, 120), project.postcode ? `NSW ${text(project.postcode, 10)}` : ""].filter(Boolean).join(", ");
    const planning = project.planning ?? {};
    const priorities = Array.isArray(project.priorities) ? project.priorities.map((item) => text(item, 120)).filter(Boolean).join(", ") : "";
    const site = [
      project.landArea ? `${project.landArea} m²` : "",
      project.frontage ? `${project.frontage}m frontage` : "",
      project.depth ? `${project.depth}m depth` : "",
    ].filter(Boolean).join(" · ");
    const design = [
      projectType(project.projectGoal),
      project.storeys ? `${project.storeys} storeys` : "",
      project.bedrooms ? `${project.bedrooms} bedrooms` : "",
      project.bathrooms ? `${project.bathrooms} bathrooms total` : "",
      Number.isFinite(project.parking) ? `${project.parking} car spaces` : "",
    ].filter(Boolean).join(" · ");
    const conditions = [
      project.lotType ? `${text(project.lotType, 60)} lot` : "",
      project.slope ? `${text(project.slope, 60)} slope` : "",
      project.existingDwelling ? "Existing dwelling" : "No existing dwelling indicated",
    ].filter(Boolean).join(" · ");

    const empty = createEmptyProject();
    const capacityProject = mergeProjectData(empty, {
      client: {
        ...empty.client,
        name: fullName,
        email,
        phone,
        company: text(body.company, 200),
        preferred_contact_method: text(body.preferredContact, 80) || "Email",
      },
      property: {
        ...empty.property,
        address: propertyAddress,
        suburb: text(project.suburb, 120),
        postcode: text(project.postcode, 10),
        lot_details: text(project.lotDp, 200),
        site_area: project.landArea ? String(project.landArea) : "",
        client_site_area: project.landArea ? String(project.landArea) : "",
        mapped_site_area: project.mappedParcelArea ? String(project.mappedParcelArea) : "",
        calculated_geometry_area: project.calculatedGeometryArea ? String(project.calculatedGeometryArea) : "",
        selected_parcel_id: text(project.parcelId, 200),
        site_width: project.frontage ? String(project.frontage) : "",
        site_depth: project.depth ? String(project.depth) : "",
        lot_type: text(project.lotType, 60) || "unknown",
        existing_structures: project.existingDwelling ? "Existing dwelling" : "",
      },
      planning: {
        ...empty.planning,
        council: text(planning.council, 200),
        zoning: text(planning.zone, 100),
        zone_name: text(planning.zoneName, 200),
        height_limit: text(planning.maxHeight, 100),
        floor_space_ratio: text(planning.fsr, 100),
        minimum_lot_size: text(planning.minimumLotSize, 100),
        heritage: text(planning.heritage, 500),
        bushfire: text(planning.bushfire, 500),
        flooding: text(planning.flooding, 500),
      },
      ambition: {
        ...empty.ambition,
        project_type: text(project.projectGoal, 50) || "home",
        storeys: project.storeys ? String(project.storeys) : "1",
        bedrooms: project.bedrooms ? String(project.bedrooms) : "4",
        bathrooms: project.bathrooms ? String(project.bathrooms) : "2",
        parking: Number.isFinite(project.parking) ? String(project.parking) : "0",
        special_rooms: Array.isArray(project.priorities) ? project.priorities.map((item) => text(item, 120)).filter(Boolean) : [],
      },
      roadmap: { ...empty.roadmap, budget: text(body.budget, 200), completion_goal: text(body.timeline, 200) },
      simulation: { ...empty.simulation, client_description: message },
      consent: { concept_disclaimer_accepted: true, accepted_at: new Date().toISOString() },
      metadata: { ...empty.metadata, source: "frc-quote-workflow", updated_at: new Date().toISOString() },
    });
    const capacity = calculateSiteCapacity(capacityProject);
    const subjectLocation = text(project.suburb, 80) || "NSW project";
    const professionalSubject = `Quote review · ${projectType(project.projectGoal)} · ${subjectLocation} · ${fullName}`;
    const jobId = crypto.randomUUID();
    capacityProject.id = crypto.randomUUID();
    const records = await createSimulationRecords(jobId, capacityProject);
    capacityProject.id = records.projectId;
    const handover = await orchestrateSimulation(jobId, capacityProject);
    setSimulationMemory(handover);
    await completeSimulationRecords(handover);
    const internalUrl = new URL(`/simulation-results/${jobId}`, request.url).toString();
    const emailHtml = `
      <div style="margin:0;padding:28px;background:#efede6;color:#17221d;font-family:Arial,sans-serif">
        <div style="max-width:780px;margin:0 auto;background:white;border:1px solid #d8d5ca">
          <div style="padding:30px;background:#111914;color:white">
            <div style="color:#cfff2f;font:11px monospace;text-transform:uppercase;letter-spacing:.15em">FRC · lead architect quote triage</div>
            <h1 style="margin:18px 0 8px;font:42px/1 Georgia,serif;font-weight:400">New architectural quote request.</h1>
            <p style="margin:0;color:#aab2ac;font-size:14px;line-height:1.55">A structured intake package assembled from the client-confirmed brief and available NSW property data. Measurements retain their source and missing controls remain missing.</p>
          </div>

          <div style="padding:26px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Client details</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Full name", fullName)}
              ${row("Email", email)}
              ${row("Phone", phone)}
              ${row("Company", body.company)}
              ${row("Preferred contact", body.preferredContact)}
              ${row("Indicative budget", body.budget)}
              ${row("Ideal timing", body.timeline)}
            </table>
          </div>

          <div style="padding:18px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Carried-forward project brief</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Started from", project.sourceStep)}
              ${row("Property", propertyAddress)}
              ${row("Lot / DP", project.lotDp)}
              ${row("Site", site)}
              ${row("Site conditions", conditions)}
              ${row("Project", design)}
              ${row("Working pathway", project.roadmapPath ? text(project.roadmapPath, 20).toUpperCase() : "")}
              ${row("Priorities", priorities)}
              ${row("Property check", project.propertyVerified ? "Client completed and confirmed" : "Not completed yet")}
              ${row("Council", planning.council)}
              ${row("Zone", [planning.zone, planning.zoneName].filter(Boolean).join(" · "))}
              ${row("Mapped height", planning.maxHeight)}
              ${row("Mapped FSR", planning.fsr)}
              ${row("Minimum lot size", planning.minimumLotSize)}
              ${row("Heritage", planning.heritage)}
              ${row("Bush fire prone land", planning.bushfire)}
              ${row("Flood planning", planning.flooding)}
            </table>
          </div>

          <div style="padding:18px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Preliminary capacity for quote scoping</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Calculation status", capacity.status_label)}
              ${row("Area used", capacity.site_area_sqm ? `${capacity.site_area_sqm} m² · ${capacity.area_source}` : "Not calculable")}
              ${row("Preliminary maximum GFA", capacity.envelope.preliminary_max_gfa_sqm ? `${capacity.envelope.preliminary_max_gfa_sqm} m² · not approved area` : "Not calculable from available controls")}
              ${row("Recommended concept target", capacity.envelope.recommended_design_gfa_sqm ? `${capacity.envelope.recommended_design_gfa_sqm} m² · not approved area` : "Requires verified controls")}
              ${row("Limiting control", capacity.limiting_control || "Not established")}
              ${row("Household programme fit", `${capacity.programme_fit.status} · ${capacity.programme_fit.explanation}`)}
            </table>
            <h3 style="margin:22px 0 8px;font:18px Georgia,serif;font-weight:400">Visible conflicts and warnings</h3>
            ${list([...capacity.conflicts, ...capacity.warnings])}
            <h3 style="margin:22px 0 8px;font:18px Georgia,serif;font-weight:400">Information to obtain before scope confirmation</h3>
            ${list(capacity.verification_required.slice(0, 10))}
            <p style="margin:24px 0"><a style="display:inline-block;background:#111914;color:#fff;padding:14px 18px;text-decoration:none;font-weight:bold" href="${html(internalUrl)}">Open full internal feasibility handover</a></p>
          </div>

          <div style="padding:18px 30px 30px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">What the client wants to do</h2>
            <div style="padding:20px;background:#cfff2f;color:#17221d;font:16px/1.6 Georgia,serif">${html(message)}</div>
            <p style="margin:16px 0 0;color:#6b716d;font-size:13px;line-height:1.55"><b>Recommended architect action:</b> review the private address and client priorities, confirm the investigations required for fee scope, then reply directly to the client using the email above.</p>
          </div>
        </div>
      </div>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: professionalSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Quote email delivery failed", emailResponse.status, details);
      return Response.json({ error: "The project brief was complete, but email delivery failed. Please try again later." }, { status: 502 });
    }

    return Response.json({ ok: true, jobId, internalPath: `/simulation-results/${jobId}` });
  } catch (error) {
    console.error("Quote request error", error);
    return Response.json({ error: "The quote request could not be processed." }, { status: 500 });
  }
}
