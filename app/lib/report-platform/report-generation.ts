import { DOCUMENT_CATEGORIES } from "../planning-simulation/document-categories";
import { buildPlanningReportTemplate } from "../planning-simulation/report-templates";
import type { DocumentCategoryCode } from "../planning-simulation/types";
import { getMalwareScanner } from "./malware";
import { sendClientReportReadyNotification, sendInternalOrderNotification } from "./notification-provider";
import { getReportAiProvider, type FrcReportGenerationInputV1 } from "./report-ai-provider";
import { getReportPlatformRepository } from "./repository";
import { REPORT_BY_ID, reportIdsForDevelopmentItems } from "./report-catalogue";
import { REPORT_TEMPLATE_BY_ID, validateStructuredReportV2 } from "./report-template-registry";
import { generateValidatedMockVisualisations } from "./architectural-visualisations";
import { createAccessToken, hashAccessToken } from "./security";
import type { FinalReportRecord, ReportJob, ReportOrder } from "./types";

function templateKind(order: ReportOrder) {
  if (order.tailoredQuote) return "tailored_quote_brief" as const;
  if (order.reportType === "council_readiness") return "council_submission_readiness" as const;
  if (order.professionalReviewRequired) return "architect_handover" as const;
  return "preliminary_property_report" as const;
}

function baselineMissingDocuments(uploaded: Set<DocumentCategoryCode>) {
  const baseline: DocumentCategoryCode[] = [
    "registered_detail_survey",
    "section_10_7_certificate",
    "title_and_deposited_plan",
  ];
  return baseline
    .filter((code) => !uploaded.has(code))
    .map((code) => DOCUMENT_CATEGORIES.find((item) => item.code === code)?.label ?? code);
}

export async function runMockReportGeneration(orderId: string) {
  const repository = await getReportPlatformRepository();
  let order = await repository.getOrder(orderId);
  if (!order || !order.priceSnapshot) throw new Error("A paid order with a frozen price is required.");
  if (order.paymentStatus !== "paid") throw new Error("Report generation cannot start until payment is verified.");
  const frozenPriceSnapshot = order.priceSnapshot;

  const legacyTemplate = buildPlanningReportTemplate({
    kind: templateKind(order),
    assessmentMode: order.scope.assessmentMode === "alternatives" ? "alternatives" : order.scope.selectedItems.length > 1 ? "combined" : "single",
    selectedItems: order.scope.selectedItems,
  });
  const selectedReportIds = order.scope.selectedReportIds?.length
    ? order.scope.selectedReportIds
    : reportIdsForDevelopmentItems(order.scope.selectedItems.map((item) => item.code));
  const selectedCatalogueReports = selectedReportIds.map((id) => REPORT_BY_ID.get(id)).filter((entry) => entry !== undefined);
  const registeredTemplates = selectedCatalogueReports.map((entry) => REPORT_TEMPLATE_BY_ID.get(entry.templateId)).filter((entry) => entry !== undefined);
  const registrySections = [...new Map(registeredTemplates.flatMap((template) => template.requiredSections).map((section) => [section.code, section])).values()];
  if (typeof order.property.mappedAreaSqm === "number" && order.property.mappedAreaSqm > 1_000 && order.property.mappedAreaSqm <= 10_000) {
    registrySections.push({ code: "large_site_analysis", title: "Large-site analysis" });
  }
  const template = registeredTemplates.length ? {
    templateId: registeredTemplates.map((entry) => entry.id).join("+"),
    sections: registrySections.map((section) => ({ key: section.code, heading: section.title })),
  } : legacyTemplate;
  const now = new Date().toISOString();
  const job: ReportJob = {
    id: crypto.randomUUID(),
    orderId,
    status: "queued",
    progressStage: "order_confirmed",
    aiProvider: "mock-report-ai",
    templateId: template.templateId,
    promptVersion: "FRC_REPORT_PROMPT_2026_01",
    schemaVersion: "FRC_REPORT_SCHEMA_V1",
    generationAttempt: 1,
    failureReason: null,
    reviewRequired: order.professionalReviewRequired,
    createdAt: now,
    startedAt: now,
    completedAt: null,
  };
  await repository.createReportJob(job);

  try {
    order = await repository.transitionOrder(orderId, "queued", "system", { jobId: job.id });
    job.status = "securing_files";
    job.progressStage = "files_secured";
    await repository.saveReportJob(job);
    order = await repository.transitionOrder(orderId, "securing_files", "system");
    const documents = await repository.listDocuments(orderId);
    const scanner = getMalwareScanner();
    for (const document of documents) {
      const scan = await scanner.scan({ storageReference: document.storageReference, sha256: document.sha256, mimeType: document.mimeType });
      document.malwareScanStatus = scan.status === "clean" ? "clean" : "unavailable";
      document.status = "processing";
      await repository.saveDocument(document);
    }

    order = await repository.transitionOrder(orderId, "analysing_property", "system");
    job.status = "analysing_property";
    job.progressStage = "property_sources_checked";
    await repository.saveReportJob(job);

    order = await repository.transitionOrder(orderId, "analysing_documents", "system");
    job.status = "analysing_documents";
    job.progressStage = "documents_analysed";
    await repository.saveReportJob(job);
    for (const document of documents) {
      document.extractionProvider = "mock-report-ai";
      document.extractionModel = "deterministic-fixture";
      document.extractionSchemaVersion = "FRC_DOCUMENT_EXTRACTION_V1";
      document.extractedFacts = [{
        statementType: "missing_information",
        text: "Mock mode records the supplied document without asserting extracted planning facts.",
        sourceDocumentId: document.id,
        verificationState: "requires_professional_review",
      }];
      document.sourceCitations = [{ documentId: document.id, filename: document.safeFilename }];
      document.status = document.automatedInterpretationEligible ? "processed" : "requires_professional_review";
      document.professionalReviewStatus = document.automatedInterpretationEligible ? "not_required" : "pending";
      await repository.saveDocument(document);
    }

    order = await repository.transitionOrder(orderId, "generating_report", "system");
    job.status = "generating_report";
    job.progressStage = "report_sections_prepared";
    await repository.saveReportJob(job);
    const uploadedCodes = new Set(documents.map((document) => document.category));
    const missingDocuments = baselineMissingDocuments(uploadedCodes);
    const generationPackage: FrcReportGenerationInputV1 = {
      schemaVersion: "FRC_REPORT_GENERATION_INPUT_V1",
      order: {
        id: order.id,
        reportType: order.reportType,
        selectedScope: order.scope.selectedItems,
        frozenPriceSnapshot,
        professionalReviewRequired: order.professionalReviewRequired,
      },
      propertyIdentity: order.property,
      officialPropertyFacts: order.property.sourceStatus === "official_source_retrieved" ? [{
        sourceId: "NSW-PROPERTY-DATA",
        address: order.property.officialAddress ?? order.property.clientSuppliedAddress,
        lotDp: order.property.lotDp ?? null,
        council: order.property.council ?? null,
        mappedAreaSqm: order.property.mappedAreaSqm ?? null,
        boundaryStatus: order.property.boundaryStatus ?? "official_parcel_mapped",
      }] : [],
      sourceRegister: order.property.sourceStatus === "official_source_retrieved" ? [{
        id: "NSW-PROPERTY-DATA",
        name: "NSW property-data workflow",
        status: "official_verified",
        retrievedAt: now,
      }] : [],
      uploadedDocumentRegister: documents,
      extractedDocumentFacts: documents.flatMap((document) => document.extractedFacts as Array<Record<string, unknown>>),
      sourceConflicts: documents.flatMap((document) => document.detectedConflicts as Array<Record<string, unknown>>),
      missingDocuments,
      projectDetails: {
        assessmentMode: order.scope.assessmentMode,
        selectedItems: order.scope.selectedItems,
        selectedReportIds,
        projectMotivation: order.scope.projectMotivation ?? {},
        referenceMaterials: order.scope.referenceMaterials ?? [],
      },
      clientObjectives: order.scope.notes,
      selectedReportSections: template.sections.map((item) => item.key),
      professionalReviewRequirement: order.professionalReviewRequired,
      reportLimitations: [
        "This report does not constitute development consent, council approval or a guaranteed approval pathway.",
        "It is not legal advice, surveying certification, engineering certification or a substitute for specialist investigations.",
        "Unverified controls and missing source material are identified rather than inferred.",
      ],
      outputTemplateId: template.templateId,
      reportSchemaVersion: "FRC_REPORT_SCHEMA_V1",
    };
    const provider = getReportAiProvider();
    const sections = [];
    for (const definition of template.sections) {
      const section = await provider.generateSection({ package: generationPackage, code: definition.key, heading: definition.heading });
      const validation = await provider.validateSection({ section, package: generationPackage });
      if (!validation.valid) throw new Error(`Report safety validation failed: ${validation.issues.join("; ")}`);
      sections.push(section);
    }
    await repository.saveReportSections(job.id, sections);

    order = await repository.transitionOrder(orderId, "automated_validation", "system");
    job.status = "automated_validation";
    job.progressStage = "evidence_and_safety_validation";
    await repository.saveReportJob(job);
    const reportId = crypto.randomUUID();
    const reportAccessToken = createAccessToken();
    const structuredReport = await provider.synthesiseReport({
      package: generationPackage,
      sections,
      reportId,
      clientName: order.client.name,
    });
    for (const registeredTemplate of registeredTemplates) {
      const validation = validateStructuredReportV2({
        report: structuredReport,
        templateId: registeredTemplate.id,
        allowedSourceIds: new Set([
          "CLIENT-PROPERTY-INPUT",
          ...generationPackage.sourceRegister.map((source) => String(source.id ?? source.sourceId ?? "")),
          ...generationPackage.uploadedDocumentRegister.map((document) => document.id),
        ]),
      });
      if (!validation.valid) throw new Error(`Structured report validation failed: ${validation.issues.join("; ")}`);
    }
    const visualisations = [];
    for (const selectedReport of selectedCatalogueReports.filter((entry) => entry.developmentSpecific)) {
      job.progressStage = "concept_direction_prepared";
      await repository.saveReportJob(job);
      const motivation = order.scope.projectMotivation ?? {};
      const boundaryStatus = String(order.property.boundaryStatus ?? (
        order.property.sourceStatus === "official_source_retrieved" ? "official_parcel_mapped" : "unavailable"
      )) as "survey_confirmed" | "deposited_plan_supported" | "official_parcel_mapped" | "client_supplied" | "approximate_only" | "unavailable" | "conflict_detected";
      const generated = await generateValidatedMockVisualisations({
        schemaVersion: "FRC_ARCHITECTURAL_VISUALISATION_V1",
        orderId: order.id,
        reportId,
        jobId: job.id,
        propertyReference: String(order.property.clientSuppliedAddress ?? "Private property"),
        selectedReportId: selectedReport.id,
        customerCategory: order.client.customerType ?? order.client.role,
        projectMotivation: {
          selections: Array.isArray(motivation.selections) ? motivation.selections.filter((item): item is string => typeof item === "string") : [],
          writtenMotivation: typeof motivation.writtenMotivation === "string" ? motivation.writtenMotivation : order.scope.notes,
          intendedUsers: typeof motivation.intendedUsers === "string" ? motivation.intendedUsers : "",
          desiredRooms: Array.isArray(motivation.desiredRooms) ? motivation.desiredRooms.filter((item): item is string => typeof item === "string") : [],
          bedroomCount: typeof motivation.bedroomCount === "number" ? motivation.bedroomCount : null,
          bathroomCount: typeof motivation.bathroomCount === "number" ? motivation.bathroomCount : null,
          approximateFloorAreaSqm: typeof motivation.approximateFloorAreaSqm === "number" ? motivation.approximateFloorAreaSqm : null,
          storeyPreference: typeof motivation.storeyPreference === "string" ? motivation.storeyPreference : null,
          accessibilityRequirements: Array.isArray(motivation.accessibilityRequirements) ? motivation.accessibilityRequirements.filter((item): item is string => typeof item === "string") : [],
          preferredStyle: typeof motivation.preferredStyle === "string" ? motivation.preferredStyle : null,
          preferredMaterials: Array.isArray(motivation.preferredMaterials) ? motivation.preferredMaterials.filter((item): item is string => typeof item === "string") : [],
          relationshipToExistingDwelling: typeof motivation.relationshipToExistingDwelling === "string" ? motivation.relationshipToExistingDwelling : null,
          privacyPreferences: Array.isArray(motivation.privacyPreferences) ? motivation.privacyPreferences.filter((item): item is string => typeof item === "string") : [],
          outdoorSpacePriorities: Array.isArray(motivation.outdoorSpacePriorities) ? motivation.outdoorSpacePriorities.filter((item): item is string => typeof item === "string") : [],
          parkingNeeds: typeof motivation.parkingNeeds === "string" ? motivation.parkingNeeds : null,
          budgetRange: typeof motivation.budgetRange === "string" ? motivation.budgetRange : null,
          timeframe: typeof motivation.timeframe === "string" ? motivation.timeframe : null,
        },
        writtenBrief: order.scope.notes,
        desiredSpaces: [],
        referenceMaterialSummary: (order.scope.referenceMaterials ?? []).map((item) => String(item.title ?? item.url ?? "Client reference")),
        uploadedImageReferences: documents.filter((document) => ["reference_material", "architectural_plans", "site_photographs"].includes(document.category)).map((document) => ({
          id: document.id,
          kind: document.category,
          usable: document.malwareScanStatus === "clean" && document.automatedInterpretationEligible,
        })),
        propertyPhotographs: documents.filter((document) => document.category === "site_photographs").map((document) => {
          const area = String(document.revision ?? "other").toLowerCase();
          const areaShown = ["front", "rear", "side", "internal", "aerial"].includes(area)
            ? area as "front" | "rear" | "side" | "internal" | "aerial"
            : "other" as const;
          return {
            id: document.id,
            directionFaced: document.author,
            approximateCaptureLocation: document.clientNote,
            capturedAt: document.issueDate,
            clientNote: document.clientNote,
            areaShown,
            usable: document.malwareScanStatus === "clean" && document.automatedInterpretationEligible,
          };
        }),
        verifiedPropertyFacts: [],
        parcelGeometry: typeof order.property.parcelGeometry === "object" ? order.property.parcelGeometry as Record<string, unknown> : null,
        boundaryStatus,
        northDirection: typeof order.property.northDirection === "string" ? order.property.northDirection : null,
        landAreaSqm: typeof order.property.mappedAreaSqm === "number" ? order.property.mappedAreaSqm : null,
        existingBuildingFacts: [],
        proposedDevelopmentType: selectedReport.name,
        planningConstraints: [],
        uploadedSurveyFacts: documents.filter((document) => document.category === "registered_detail_survey").map((document) => ({ fact: "Registered survey supplied for review.", sourceId: document.id })),
        titleAndEasementFacts: documents.filter((document) => document.category === "title_and_deposited_plan").map((document) => ({ fact: "Title or deposited plan supplied for review.", sourceId: document.id })),
        sewerAndServiceFacts: documents.filter((document) => document.category === "sewer_services_diagram").map(() => ({ fact: "Client-supplied service diagram available for interpretation.", sourceStatus: "uploaded_document" as const })),
        stormwaterFacts: documents.filter((document) => document.category === "stormwater_drawings").map(() => ({ fact: "Client-supplied stormwater drawing available for interpretation.", sourceStatus: "uploaded_document" as const })),
        treesAndVegetation: [],
        floodAndBushfireInformation: [],
        privacyConsiderations: [],
        professionalReviewRequirement: order.professionalReviewRequired,
        prohibitedClaims: [
          "Confirmed development approval",
          "Surveyed boundary without registered survey evidence",
          "Confirmed service route without authoritative evidence",
          "Construction-ready design",
        ],
      });
      visualisations.push(...generated);
    }
    structuredReport.visualisations = visualisations;
    const finalReport: FinalReportRecord = {
      id: reportId,
      orderId,
      jobId: job.id,
      accessHash: await hashAccessToken(reportAccessToken),
      structuredReport,
      htmlReference: `/planning-report/${reportId}`,
      pdfReference: null,
      status: order.professionalReviewRequired ? "awaiting_review" : "released",
      reviewerRecord: null,
      releasedAt: order.professionalReviewRequired ? null : new Date().toISOString(),
      version: 1,
    };
    await repository.saveFinalReport(finalReport);

    if (order.professionalReviewRequired) {
      order = await repository.transitionOrder(orderId, "awaiting_professional_review", "system");
      job.status = "awaiting_professional_review";
      job.progressStage = "professional_review";
    } else {
      order = await repository.transitionOrder(orderId, "approved_for_release", "system");
      order = await repository.transitionOrder(orderId, "completed", "system");
      job.status = "completed";
      job.progressStage = "report_ready";
      job.completedAt = new Date().toISOString();
    }
    await repository.saveReportJob(job);
    await sendInternalOrderNotification({ order, job, documents, conflicts: generationPackage.sourceConflicts });
    if (!order.professionalReviewRequired) {
      await sendClientReportReadyNotification({
        order,
        reportId,
        jobId: job.id,
        accessFragment: reportAccessToken,
      });
    }
    return { order, job, report: finalReport, reportAccessToken };
  } catch (error) {
    job.status = "failed";
    job.progressStage = "failed";
    job.failureReason = error instanceof Error ? error.message : "Report generation failed.";
    job.completedAt = new Date().toISOString();
    await repository.saveReportJob(job);
    const current = await repository.getOrder(orderId);
    if (current && current.status !== "failed") {
      try {
        await repository.transitionOrder(orderId, "failed", "system", { failureReason: job.failureReason });
      } catch {
        // Preserve the completed stages even if a terminal transition is already recorded.
      }
    }
    throw error;
  }
}
