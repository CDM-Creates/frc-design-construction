import { getQuoteFromEmail, getQuoteRecipientEmail, getResendApiKey } from "../../../../../lib/report-platform/quote-delivery";
import { getReportPlatformRepository } from "../../../../../lib/report-platform/repository";
import { tokenMatches } from "../../../../../lib/report-platform/security";

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br />");
}

function row(label: string, value: unknown) {
  return `<tr><td style="padding:10px 12px;border-bottom:1px solid #d8d5ca;color:#6b716d;font:11px monospace;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;width:190px">${htmlEscape(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #d8d5ca;color:#17221d;font:14px Arial,sans-serif;line-height:1.45">${htmlEscape(value || "Not supplied")}</td></tr>`;
}

function money(cents: number) {
  return `A$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Emails a confirmed simulator quote to FRC. Does not start report generation
 * or take payment — FRC follows up with the client.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
    const token = request.headers.get("x-frc-order-token") ?? "";
    const repository = await getReportPlatformRepository();
    const order = await repository.getOrder(orderId);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!(await tokenMatches(token, order.ownerHash))) {
      return Response.json({ error: "Quote access denied." }, { status: 403 });
    }
    if (order.status !== "tailored_quote_requested" && order.status !== "ready_for_checkout") {
      return Response.json(
        { error: "This order is not in a state that can be sent as a quote." },
        { status: 400 },
      );
    }

    const apiKey = getResendApiKey();
    const recipient = getQuoteRecipientEmail();
    const from = getQuoteFromEmail();

    const total = order.priceSnapshot?.totalCents ?? 0;
    const lines = (order.priceSnapshot?.lineItems ?? [])
      .map(
        (line) =>
          `<li style="margin:0 0 6px">${htmlEscape(line.publicLabel)} — ${htmlEscape(
            money(line.amountCents),
          )}</li>`,
      )
      .join("");
    const address = String(order.property.clientSuppliedAddress ?? order.property.officialAddress ?? "");
    const subject = `Simulator quote · ${address || "Property report"} · ${order.client.name}`;
    const motivation = (order.scope.projectMotivation ?? {}) as Record<string, unknown>;
    const references = order.scope.referenceMaterials ?? [];
    const clientBrief = (order.scope.clientBrief ?? {}) as Record<string, unknown>;
    const propertyResearch = (clientBrief.propertyResearch ?? {}) as Record<string, unknown>;
    const leads = (propertyResearch.clientSuppliedLeads ?? {}) as { urls?: string[]; notes?: string };
    const asText = (value: unknown) => {
      if (Array.isArray(value)) return value.filter(Boolean).join(", ");
      if (value == null || value === "") return "";
      return String(value);
    };
    const researchLinkList = (leads.urls ?? []).filter(Boolean).join("\n") || "None supplied";

    const emailHtml = `
      <div style="margin:0;padding:28px;background:#efede6;color:#17221d;font-family:Arial,sans-serif">
        <div style="max-width:780px;margin:0 auto;background:white;border:1px solid #d8d5ca">
          <div style="padding:30px;background:#111914;color:white">
            <div style="color:#cfff2f;font:11px monospace;text-transform:uppercase;letter-spacing:.15em">FRC · simulator quote</div>
            <h1 style="margin:18px 0 8px;font:36px/1.1 Georgia,serif;font-weight:400">New property-report quote request.</h1>
            <p style="margin:0;color:#aab2ac;font-size:14px;line-height:1.55">
              The client confirmed catalogue pricing and asked FRC to quote. No payment was taken.
              Draft preparation plus professional review is promised within approximately one week once the engagement proceeds.
            </p>
          </div>
          <div style="padding:26px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Client</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Name", order.client.name)}
              ${row("Email", order.client.email)}
              ${row("Phone", order.client.phone)}
              ${row("Role / customer type", order.client.role || order.client.customerType)}
              ${row("Decision objective", order.client.decisionObjective)}
            </table>
          </div>
          <div style="padding:18px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Property and scope</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Property", address)}
              ${row("Council", order.property.council)}
              ${row("Lot / DP", order.property.lotDp)}
              ${row("Selected reports", (order.scope.selectedReportIds ?? []).join(", "))}
              ${row("Notes", order.scope.notes)}
              ${row("Order id", order.id)}
            </table>
          </div>
          <div style="padding:18px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">What they want to do with the land</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Motivation selections", asText(motivation.selections))}
              ${row("Written motivation", motivation.writtenMotivation)}
              ${row("Intended users", motivation.intendedUsers)}
              ${row("Desired rooms", asText(motivation.desiredRooms))}
              ${row("Bedrooms / bathrooms", [motivation.bedroomCount, motivation.bathroomCount].filter((value) => value != null && value !== "").join(" / "))}
              ${row("Approx floor area", motivation.approximateFloorAreaSqm ? `${motivation.approximateFloorAreaSqm} m²` : "")}
              ${row("Storeys", motivation.storeyPreference)}
              ${row("Accessibility", asText(motivation.accessibilityRequirements))}
              ${row("Preferred style", motivation.preferredStyle)}
              ${row("Preferred materials", asText(motivation.preferredMaterials))}
              ${row("Relationship to existing dwelling", motivation.relationshipToExistingDwelling)}
              ${row("Privacy", asText(motivation.privacyPreferences))}
              ${row("Outdoor priorities", asText(motivation.outdoorSpacePriorities))}
              ${row("Parking", motivation.parkingNeeds)}
              ${row("Budget", motivation.budgetRange)}
              ${row("Timeframe", motivation.timeframe)}
            </table>
          </div>
          <div style="padding:18px 30px 12px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Look and feel references</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse">
              ${row("Reference URL", references[0]?.url)}
              ${row("Written brief / what they like", references[0]?.writtenBrief)}
              ${row("Extra research links", researchLinkList)}
              ${row("Research notes", leads.notes)}
            </table>
          </div>
          <div style="padding:18px 30px 30px">
            <h2 style="margin:0 0 12px;font:24px Georgia,serif;font-weight:400">Estimated quote total</h2>
            <p style="font:28px Georgia,serif;margin:0 0 12px">${htmlEscape(money(total))}</p>
            <ul style="margin:0;padding-left:20px">${lines || "<li>No line items recorded</li>"}</ul>
            <p style="margin:18px 0 0;color:#6b716d;font-size:13px;line-height:1.55">
              This is an estimated catalogue cost for the quote request only — not a final invoice.
              Reply directly to the client email above to confirm engagement, invoice, or clarify scope.
            </p>
          </div>
        </div>
      </div>`;

    if (!apiKey) {
      console.error("[simulator-quote] RESEND_API_KEY missing");
      return Response.json(
        {
          error:
            "Email is not configured. Add RESEND_API_KEY to .env.local and restart npm run dev.",
        },
        { status: 503 },
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: order.client.email,
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("[simulator-quote] email failed", emailResponse.status, {
        from,
        recipient,
        details,
      });
      let resendMessage = details.slice(0, 500);
      try {
        const parsed = JSON.parse(details) as { message?: string; name?: string };
        resendMessage = parsed.message || parsed.name || resendMessage;
      } catch {
        // keep raw text
      }
      return Response.json(
        {
          error: `Quote email failed (${emailResponse.status}): ${resendMessage}. Local development can send email — this is usually an unverified From address/domain in Resend, a bad API key, or the need to restart npm run dev after editing .env.local. For a quick test set QUOTE_FROM_EMAIL=FRC Website <onboarding@resend.dev>.`,
        },
        { status: 502 },
      );
    }

    console.info("[simulator-quote] emailed", { recipient, from, orderId: order.id, subject });

    if (order.status === "ready_for_checkout") {
      await repository.transitionOrder(order.id, "tailored_quote_requested", "client", {
        reason: "simulator_quote_request",
      });
    }

    await repository.addOrderEvent({
      id: crypto.randomUUID(),
      orderId: order.id,
      eventType: "simulator_quote_emailed",
      actor: "client",
      metadata: { recipient, from, totalCents: total, delivery: "resend" },
      createdAt: new Date().toISOString(),
    });

    const fresh = await repository.getOrder(order.id);
    if (fresh && !fresh.tailoredQuote) {
      fresh.tailoredQuote = true;
      fresh.paymentStatus = "not_applicable";
      fresh.updatedAt = new Date().toISOString();
      await repository.saveOrder(fresh);
    }

    return Response.json({
      ok: true,
      orderId: order.id,
      recipient,
      totalCents: total,
      message: `Your quote request was emailed to ${recipient}. FRC will confirm the engagement and deliver the reviewed report pack within approximately one week once work proceeds.`,
    });
  } catch (error) {
    console.error("[simulator-quote]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "The quote could not be sent." },
      { status: 500 },
    );
  }
}
