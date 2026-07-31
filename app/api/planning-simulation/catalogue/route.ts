import {
  calculateCataloguePrice,
  CUSTOMER_TYPES,
  DECISION_OBJECTIVES,
  REPORT_CATALOGUE,
  REPORT_CATALOGUE_VERSION,
  REPORT_PRICING_VERSION,
  SITE_AREA_PRICING_RULES,
  type CustomerTypeId,
} from "../../../lib/report-platform/report-catalogue";

export function GET() {
  return Response.json({
    catalogueVersion: REPORT_CATALOGUE_VERSION,
    pricingVersion: REPORT_PRICING_VERSION,
    customerTypes: CUSTOMER_TYPES,
    decisionObjectives: DECISION_OBJECTIVES,
    reports: REPORT_CATALOGUE,
    siteAreaPricing: SITE_AREA_PRICING_RULES,
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const site = body.site && typeof body.site === "object" && !Array.isArray(body.site) ? body.site as Record<string, unknown> : {};
    const result = calculateCataloguePrice({
      reportIds: Array.isArray(body.reportIds) ? body.reportIds.filter((id): id is string => typeof id === "string") : [],
      customerType: String(body.customerType ?? "") as CustomerTypeId,
      site: {
        areaSqm: typeof site.areaSqm === "number" ? site.areaSqm : null,
        areaStatus: String(site.areaStatus ?? "unavailable") as Parameters<typeof calculateCataloguePrice>[0]["site"]["areaStatus"],
        parcelCount: Number.isInteger(site.parcelCount) ? Number(site.parcelCount) : 1,
        ruralOrNonStandard: site.ruralOrNonStandard === true,
      },
      professionalReviewRequested: body.professionalReviewRequested === true,
      priorityReviewRequested: body.priorityReviewRequested === true,
    });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pricing could not be calculated." }, { status: 400 });
  }
}
