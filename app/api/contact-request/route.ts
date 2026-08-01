import { checkRateLimit } from "../../lib/rate-limit";

type ContactRequest = {
  fullName?: string;
  email?: string;
  phone?: string;
  enquiryType?: string;
  preferredContact?: string;
  suburb?: string;
  message?: string;
  website?: string;
};

const clean = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export async function POST(request: Request) {
  try {
    const body = await request.json() as ContactRequest;
    if (clean(body.website, 200)) return Response.json({ ok: true });

    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 200);
    const message = clean(body.message, 4000);
    const enquiryType = clean(body.enquiryType, 80);
    const preferredContact = clean(body.preferredContact, 80);
    if (!fullName || !email || !message || !enquiryType || !preferredContact) {
      return Response.json({ error: "Complete the required name, email, enquiry type, preferred contact method and message fields." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = checkRateLimit(`contact:${forwarded}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return Response.json({ error: "Too many enquiries were submitted from this connection. Please try again later or contact Sheila directly." }, { status: 429 });

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.HEAD_ARCHITECT_EMAIL || "frcdesignconstruction@gmail.com";
    const from = process.env.QUOTE_FROM_EMAIL || "FRC Website <onboarding@resend.dev>";
    if (!apiKey) return Response.json({ error: "Secure email delivery is not configured yet. Please contact Sheila directly using the phone or email details on this page." }, { status: 503 });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: `Website ${enquiryType.toLowerCase()} · ${clean(body.suburb, 150) || "Location not supplied"} · ${fullName}`,
        html: `<div style="background:#efede6;padding:28px;font-family:Arial,sans-serif;color:#17221d"><div style="max-width:720px;margin:auto;background:#fff;border:1px solid #d8d5ca"><header style="padding:28px;background:#111914;color:#fff"><small style="color:#cfff2f;text-transform:uppercase;letter-spacing:.14em">FRC Design &amp; Construction · Website enquiry</small><h1 style="font:36px Georgia,serif;font-weight:400;margin:16px 0 0">${escapeHtml(enquiryType)}</h1></header><div style="padding:28px"><p><b>Name:</b> ${escapeHtml(fullName)}</p><p><b>Email:</b> ${escapeHtml(email)}</p><p><b>Phone:</b> ${escapeHtml(clean(body.phone, 80) || "Not supplied")}</p><p><b>Preferred contact:</b> ${escapeHtml(preferredContact)}</p><p><b>Project location:</b> ${escapeHtml(clean(body.suburb, 150) || "Not supplied")}</p><h2 style="font:24px Georgia,serif;font-weight:400;margin-top:28px">Message</h2><div style="background:#f1efe7;padding:20px;line-height:1.6">${escapeHtml(message).replaceAll("\n", "<br />")}</div></div></div></div>`,
      }),
    });
    if (!response.ok) {
      console.error("Contact email delivery failed", response.status);
      return Response.json({ error: "The enquiry could not be delivered. Please try again or contact Sheila directly." }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Contact request failed", error);
    return Response.json({ error: "The enquiry could not be processed." }, { status: 500 });
  }
}
