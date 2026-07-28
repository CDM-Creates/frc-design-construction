import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { architectReviewRequests } from "../../../db/schema";
import { getSimulationMemory } from "../../lib/simulation-memory";
import { readSimulationRecord } from "../../lib/simulation-repository";

const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function POST(request: Request) {
  try {
    const body = await request.json() as { jobId?: string; message?: string };
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 3000) : "Please review the generated concept study and contact me about the next stage.";
    if (!jobId) return Response.json({ error: "The simulation job ID is required." }, { status: 400 });
    const result = getSimulationMemory(jobId) || await readSimulationRecord(jobId);
    if (!result) return Response.json({ error: "The simulation result could not be found." }, { status: 404 });

    try {
      const db = getDb();
      await db.insert(architectReviewRequests).values({ id: crypto.randomUUID(), jobId, status: "requested", clientMessage: message, createdAt: new Date().toISOString() });
      await db.update(architectReviewRequests).set({ status: "requested" }).where(eq(architectReviewRequests.jobId, jobId));
    } catch (error) {
      console.warn("Architect review request was not persisted.", error);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.HEAD_ARCHITECT_EMAIL;
    const from = process.env.QUOTE_FROM_EMAIL || "FRC Website <onboarding@resend.dev>";
    if (!apiKey || !recipient) return Response.json({ ok: true, emailed: false, message: "Review request recorded. Email delivery is not configured." });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: result.project.client.email || undefined,
        subject: `Architect review requested — ${result.final_report.project_title}`,
        html: `<div style="font-family:Arial,sans-serif;padding:28px"><h1>Architect review requested</h1><p><b>${escapeHtml(result.project.client.name)}</b> has requested a formal review of simulation <code>${escapeHtml(jobId)}</code>.</p><blockquote style="border-left:4px solid #cfff2f;padding-left:16px">${escapeHtml(message)}</blockquote><p><a href="${escapeHtml(new URL(`/simulation-results/${jobId}`, request.url).toString())}">Open concept study</a></p></div>`,
      }),
    });
    return Response.json({ ok: true, emailed: response.ok });
  } catch (error) {
    console.error("Architect review request failed", error);
    return Response.json({ error: "The architect review request could not be sent." }, { status: 500 });
  }
}
