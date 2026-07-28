import type { SimulationPackage } from "./ai/contracts";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const listHtml = (items: string[]) => items.length ? `<ul>${items.map((item) => `<li style="margin:0 0 7px">${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>None supplied.</p>";

export async function sendArchitectSimulationEmail(result: SimulationPackage, internalUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.HEAD_ARCHITECT_EMAIL;
  const from = process.env.QUOTE_FROM_EMAIL || "FRC Website <onboarding@resend.dev>";
  if (!apiKey || !recipient) return { sent: false, reason: "Email delivery is not configured." };
  const project = result.project;
  const report = result.final_report;
  const subject = `New Architectural Concept Study — ${project.client.name || "New Client"} — ${project.property.address || project.property.suburb || "NSW Property"}`;
  const images = result.generated_images.filter((image) => image.image_url && !image.image_url.startsWith("data:")).map((image) => `<li><a href="${escapeHtml(image.image_url)}">${escapeHtml(image.title)}</a></li>`).join("");
  const files = project.simulation.uploaded_files.map((file) => file.url ? `<li><a href="${escapeHtml(file.url)}">${escapeHtml(file.name)}</a></li>` : `<li>${escapeHtml(file.name)} (storage not connected)</li>`).join("");
  const capacity = report.site_capacity;
  const maxGfa = capacity.envelope.preliminary_max_gfa_sqm;
  const designTarget = capacity.envelope.recommended_design_gfa_sqm;
  const fit = capacity.programme_fit;

  const html = `<div style="margin:0;padding:28px;background:#efede6;color:#17221d;font-family:Arial,sans-serif"><div style="max-width:860px;margin:0 auto;background:#fff;border:1px solid #d8d5ca">
    <header style="padding:32px;background:#111914;color:#fff"><div style="color:#cfff2f;font:11px monospace;letter-spacing:.15em;text-transform:uppercase">FRC · Architectural simulation package</div><h1 style="font:40px/1.05 Georgia,serif;font-weight:400;margin:16px 0 8px">${escapeHtml(report.project_title)}</h1><p style="color:#b9c0bb;line-height:1.55">One organised package containing the complete client brief, specialist outputs and final report.</p></header>
    <section style="padding:26px 32px"><h2>Client and property</h2><p><b>${escapeHtml(project.client.name)}</b><br>${escapeHtml(project.client.email)} · ${escapeHtml(project.client.phone)}<br>${escapeHtml(project.property.address)}, ${escapeHtml(project.property.suburb)} ${escapeHtml(project.property.postcode)}</p><p><a href="${escapeHtml(internalUrl)}">Open internal project result</a></p></section>
    <section style="padding:0 32px 24px"><h2>Client vision</h2><p style="line-height:1.65">${escapeHtml(report.client_vision)}</p><h2>Project summary</h2><p style="line-height:1.65">${escapeHtml(report.project_summary)}</p></section>
    <section style="padding:0 32px 24px"><h2>Preliminary site capacity</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;border-bottom:1px solid #ddd">Land area used</td><td style="padding:8px;border-bottom:1px solid #ddd"><b>${escapeHtml(capacity.site_area_sqm ? `${capacity.site_area_sqm} m² (${capacity.area_source})` : "Not available")}</b></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #ddd">Arithmetic maximum GFA</td><td style="padding:8px;border-bottom:1px solid #ddd"><b>${escapeHtml(maxGfa ? `${maxGfa} m²` : "Not calculable")}</b></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #ddd">Recommended concept target</td><td style="padding:8px;border-bottom:1px solid #ddd"><b>${escapeHtml(designTarget ? `${designTarget} m²` : "Not calculable")}</b></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #ddd">Brief fit</td><td style="padding:8px;border-bottom:1px solid #ddd"><b>${escapeHtml(fit.status)}</b> · ${escapeHtml(fit.explanation)}</td></tr>
      </table>
      <p style="font-size:12px;line-height:1.55">This is deterministic preliminary arithmetic from the supplied parcel and planning inputs. It is not approval advice and must be tested against the survey, title, LEP/DCP and consultant requirements.</p>
    </section>
    <section style="padding:0 32px 24px"><h2>Planning items requiring verification</h2>${listHtml(report.planning_information_requiring_verification)}<h2>Missing information</h2>${listHtml(report.missing_information)}<h2>Questions for the client</h2>${listHtml(report.questions_for_client)}</section>
    <section style="padding:0 32px 24px"><h2>Uploaded files</h2><ul>${files || "<li>No files uploaded.</li>"}</ul><h2>Generated images</h2><ul>${images || "<li>Image generation disabled, pending or stored only in the client result.</li>"}</ul></section>
    <section style="padding:22px 32px;background:#f5f3ed"><p style="font-size:12px;line-height:1.55">${escapeHtml(report.architectural_disclaimer)}</p></section>
  </div></div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [recipient], reply_to: project.client.email || undefined, subject, html }),
  });
  if (!response.ok) return { sent: false, reason: (await response.text()).slice(0, 500) };
  return { sent: true };
}
