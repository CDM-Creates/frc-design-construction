import type { SimulationPackage } from "./ai/contracts";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const listHtml = (items: string[]) => items.length
  ? `<ul style="margin:8px 0 18px;padding-left:20px">${items.map((item) => `<li style="margin:0 0 7px;line-height:1.5">${escapeHtml(item)}</li>`).join("")}</ul>`
  : "<p style=\"color:#6b716d\">None recorded.</p>";

const row = (label: string, value: unknown) => `<tr>
  <td style="padding:9px 10px;border-bottom:1px solid #ddd;color:#66706a;width:210px;vertical-align:top">${escapeHtml(label)}</td>
  <td style="padding:9px 10px;border-bottom:1px solid #ddd;vertical-align:top"><b>${escapeHtml(value || "Not available")}</b></td>
</tr>`;

export async function sendArchitectSimulationEmail(result: SimulationPackage, internalUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.HEAD_ARCHITECT_EMAIL;
  const from = process.env.QUOTE_FROM_EMAIL || "FRC Website <onboarding@resend.dev>";
  if (!apiKey || !recipient) return { sent: false, reason: "Email delivery is not configured." };
  const project = result.project;
  const report = result.final_report;
  const capacity = report.site_capacity;
  const subject = `Feasibility handover · ${report.project_title} · ${project.client.name || "New client"}`;
  const files = project.simulation.uploaded_files.map((file) => file.url
    ? `<li><a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a></li>`
    : `<li>${escapeHtml(file.name)} · stored project file</li>`).join("");
  const roomRows = report.room_programme.map((room) => row(
    `${room.room_name} · ${room.floor}`,
    `${room.allocated_area_sqm} m² · ${room.recommended_width_m} × ${room.recommended_depth_m} m · ${room.priority} · ${room.fit_status}`,
  )).join("");
  const floorRows = report.floor_totals.map((floor) => row(
    floor.floor,
    `${floor.total_area_sqm} m² total · ${floor.internal_area_sqm} m² internal · ${floor.rooms.join(", ")}`,
  )).join("");
  const pathwayRows = report.development_pathways.map((pathway) => row(
    pathway.option_name,
    `${pathway.applicability} · ${pathway.household_programme_fit} · planning complexity ${pathway.relative_planning_complexity}`,
  )).join("");

  const emailHtml = `<div style="margin:0;padding:28px;background:#efede6;color:#17221d;font-family:Arial,sans-serif">
    <div style="max-width:900px;margin:0 auto;background:#fff;border:1px solid #d8d5ca">
      <header style="padding:32px;background:#111914;color:#fff">
        <div style="color:#cfff2f;font:11px monospace;letter-spacing:.15em;text-transform:uppercase">FRC · lead architect handover</div>
        <h1 style="font:40px/1.05 Georgia,serif;font-weight:400;margin:16px 0 8px">${escapeHtml(report.project_title)}</h1>
        <p style="color:#b9c0bb;line-height:1.55">Source-traceable preliminary feasibility, deterministic household programme and unresolved professional checks.</p>
      </header>
      <section style="padding:26px 32px">
        <h2>Client and private property identity</h2>
        <p><b>${escapeHtml(project.client.name)}</b><br>${escapeHtml(project.client.email)} · ${escapeHtml(project.client.phone)}<br>${escapeHtml(project.property.address)}, ${escapeHtml(project.property.suburb)} ${escapeHtml(project.property.postcode)}<br>${escapeHtml(project.property.lot_details)}</p>
        <p><a href="${escapeHtml(internalUrl)}">Open the full internal handover and architect edit mode</a></p>
      </section>
      <section style="padding:0 32px 24px">
        <h2>Site capacity · not approved area</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse">
          ${row("Calculation status", capacity.status_label)}
          ${row("Confidence", capacity.confidence_status)}
          ${row("Area used", capacity.site_area_sqm ? `${capacity.site_area_sqm} m² · ${capacity.area_source}` : "Not calculable")}
          ${row("Preliminary maximum GFA", capacity.envelope.preliminary_max_gfa_sqm ? `${capacity.envelope.preliminary_max_gfa_sqm} m²` : "Not calculable")}
          ${row("Recommended concept target", capacity.envelope.recommended_design_gfa_sqm ? `${capacity.envelope.recommended_design_gfa_sqm} m²` : "Not calculable")}
          ${row("Limiting control", capacity.limiting_control || "Not established")}
          ${row("Envelope status", `${capacity.parcel_analysis.envelopeStatus} · ${capacity.parcel_analysis.envelopeNote}`)}
          ${row("Household profile / fit", `${report.household_profile} · ${report.brief_fit_result.status}`)}
        </table>
        <h3>Visible conflicts and warnings</h3>${listHtml([...capacity.conflicts, ...report.warnings])}
        <h3>How this was calculated</h3>${listHtml(capacity.calculation_steps)}
      </section>
      <section style="padding:0 32px 24px">
        <h2>Floor totals</h2><table role="presentation" style="width:100%;border-collapse:collapse">${floorRows}</table>
        <h2>Deterministic room programme</h2><table role="presentation" style="width:100%;border-collapse:collapse">${roomRows}</table>
      </section>
      <section style="padding:0 32px 24px">
        <h2>Development pathways</h2><table role="presentation" style="width:100%;border-collapse:collapse">${pathwayRows}</table>
        <h2>Unresolved client questions</h2>${listHtml(report.unresolved_client_questions)}
        <h2>Missing documents</h2>${listHtml(report.missing_documents)}
        <h2>Required investigations</h2>${listHtml(report.required_professional_investigations)}
        <h2>Architect notes</h2>${listHtml(report.architect_notes)}
      </section>
      <section style="padding:0 32px 24px">
        <h2>Client vision</h2><p style="line-height:1.65">${escapeHtml(report.client_vision)}</p>
        <h2>Uploaded files</h2><ul>${files || "<li>No files uploaded.</li>"}</ul>
      </section>
      <section style="padding:22px 32px;background:#f5f3ed">
        <p style="font-size:12px;line-height:1.55">${escapeHtml(report.architectural_disclaimer)}</p>
      </section>
    </div>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [recipient], reply_to: project.client.email || undefined, subject, html: emailHtml }),
  });
  if (!response.ok) return { sent: false, reason: (await response.text()).slice(0, 500) };
  return { sent: true };
}
