type QuoteProject = {
  sourceStep?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  lotDp?: string;
  landArea?: number;
  frontage?: number;
  depth?: number;
  lotType?: string;
  slope?: string;
  existingDwelling?: boolean;
  storeys?: number;
  bedrooms?: number;
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
    const recipient = process.env.HEAD_ARCHITECT_EMAIL ?? "hello@frcdesign.com.au";
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
      Number.isFinite(project.parking) ? `${project.parking} car spaces` : "",
    ].filter(Boolean).join(" · ");
    const conditions = [
      project.lotType ? `${text(project.lotType, 60)} lot` : "",
      project.slope ? `${text(project.slope, 60)} slope` : "",
      project.existingDwelling ? "Existing dwelling" : "No existing dwelling indicated",
    ].filter(Boolean).join(" · ");

    const subjectLocation = text(project.suburb, 80) || "NSW project";
    const subject = `New FRC quote request — ${projectType(project.projectGoal)} — ${subjectLocation}`;
    const emailHtml = `
      <div style="margin:0;padding:28px;background:#efede6;color:#17221d;font-family:Arial,sans-serif">
        <div style="max-width:780px;margin:0 auto;background:white;border:1px solid #d8d5ca">
          <div style="padding:30px;background:#111914;color:white">
            <div style="color:#cfff2f;font:11px monospace;text-transform:uppercase;letter-spacing:.15em">FRC website · automatic project enquiry</div>
            <h1 style="margin:18px 0 8px;font:42px/1 Georgia,serif;font-weight:400">A new client is requesting a quote.</h1>
            <p style="margin:0;color:#aab2ac;font-size:14px;line-height:1.55">The property and ambition details below were carried forward from the website workspace and confirmed by the client.</p>
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
            </table>
          </div>

          <div style="padding:18px 30px 30px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">What the client wants to do</h2>
            <div style="padding:20px;background:#cfff2f;color:#17221d;font:16px/1.6 Georgia,serif">${html(message)}</div>
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
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Quote email delivery failed", emailResponse.status, details);
      return Response.json({ error: "The project brief was complete, but email delivery failed. Please try again shortly." }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Quote request error", error);
    return Response.json({ error: "The quote request could not be processed." }, { status: 500 });
  }
}
