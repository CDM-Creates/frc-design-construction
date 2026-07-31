import {
  DOCUMENT_ANALYSIS_UPGRADE_BY_CODE,
  DOCUMENT_CATEGORIES,
} from "../planning-simulation/document-categories";
import { buildPlanningReportTemplate } from "../planning-simulation/report-templates";
import type { DocumentCategoryCode } from "../planning-simulation/types";
import { getMalwareScanner } from "./malware";
import { sendClientReportReadyNotification, sendInternalOrderNotification } from "./notification-provider";
import { getReportAiProvider, type FrcReportGenerationInputV2 } from "./report-ai-provider";
import { getReportPlatformRepository } from "./repository";
import {
  documentAnalysisIncludedForReports,
  REPORT_BY_ID,
  reportIdsForDevelopmentItems,
} from "./report-catalogue";
import {
  REPORT_SCHEMA_VERSION,
  REPORT_TEMPLATE_BY_ID,
  validateStructuredReportV2,
} from "./report-template-registry";
import { generateValidatedMockVisualisations } from "./architectural-visualisations";
import { REPORT_PROMPT_VERSION } from "./report-prompts";
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildOfficialPropertyResearch(order: ReportOrder, fallbackDate: string) {
  if (order.property.propertyResearchStatus !== "complete") {
    return { facts: [], sources: [] };
  }
  const retrievedAt =
    typeof order.property.propertyResearchRetrievedAt === "string"
      ? order.property.propertyResearchRetrievedAt
      : fallbackDate;
  const planningFields = asRecord(order.property.planningFields);
  const sourceMetadata = asRecord(order.property.source);
  const controlProvenance = asRecord(
    asRecord(order.property.controls).provenance,
  );
  const facts: Array<Record<string, unknown>> = [
    {
      sourceId: "NSW-PROPERTY-DATA",
      field: "property_identity",
      value: {
        address:
          order.property.officialAddress ??
          order.property.clientSuppliedAddress,
        lotDp: order.property.lotDp ?? null,
        council: order.property.council ?? null,
        mappedAreaSqm: order.property.mappedAreaSqm ?? null,
        boundaryStatus:
          order.property.boundaryStatus ?? "official_parcel_mapped",
      },
      status: "mapped",
      sourceName: "NSW official property-data workflow",
      retrievedAt,
    },
  ];
  const sources: Array<Record<string, unknown>> = [
    {
      id: "NSW-PROPERTY-DATA",
      name: "NSW official property-data workflow",
      status: "official_verified",
      retrievedAt,
      provider: order.property.propertyResearchProvider,
      attribution: sourceMetadata.dataAttribution,
      sourceUrl:
        sourceMetadata.planningPortal ??
        sourceMetadata.cadastralLotLayer ??
        null,
    },
  ];

  for (const [field, rawValue] of Object.entries(planningFields)) {
    const propertyField = asRecord(rawValue);
    const sourceId = `NSW-PROPERTY-${field
      .replace(/[^a-z0-9]+/gi, "-")
      .toUpperCase()}`;
    facts.push({
      sourceId,
      field,
      value: propertyField.value ?? null,
      status: propertyField.status ?? "unavailable",
      sourceName:
        propertyField.sourceName ?? "NSW official property-data workflow",
      sourceLayer: propertyField.sourceLayer ?? null,
      sourceFeatureId: propertyField.sourceFeatureId ?? null,
      sourceUrl:
        controlProvenance[field] ??
        (field === "lotDp" || field === "parcelArea"
          ? sourceMetadata.cadastralLotLayer
          : null),
      retrievedAt: propertyField.retrievedAt ?? retrievedAt,
    });
    sources.push({
      id: sourceId,
      name:
        propertyField.sourceName ?? "NSW official property-data workflow",
      layer: propertyField.sourceLayer ?? null,
      featureId: propertyField.sourceFeatureId ?? null,
      sourceUrl:
        controlProvenance[field] ??
        (field === "lotDp" || field === "parcelArea"
          ? sourceMetadata.cadastralLotLayer
          : null),
      status:
        propertyField.status === "mapped"
          ? "official_verified"
          : propertyField.status === "conflict_detected"
            ? "conflict_detected"
            : "unavailable",
      retrievedAt: propertyField.retrievedAt ?? retrievedAt,
    });
  }
  return { facts, sources };
}

export async function createQueuedMockReportJob(orderId: string) {
  const repository = await getReportPlatformRepository();
  const existingJobs = await repository.listReportJobs(orderId);
  const existing = existingJobs.find((job) =>
    !["completed", "failed", "cancelled"].includes(job.status),
  );
  if (existing) return existing;
  const order = await repository.getOrder(orderId);
  if (!order || order.paymentStatus !== "paid") {
    throw new Error("A paid order is required before report generation can be queued.");
  }
  const now = new Date().toISOString();
  const job: ReportJob = {
    id: crypto.randomUUID(),
    orderId,
    status: "queued",
    progressStage: "payment_verified",
    aiProvider: "mock-report-ai",
    templateId: "pending_template_resolution",
    promptVersion: REPORT_PROMPT_VERSION,
    schemaVersion: REPORT_SCHEMA_VERSION,
    generationAttempt: 1,
    failureReason: null,
    reviewRequired: order.professionalReviewRequired,
    createdAt: now,
    startedAt: null,
    completedAt: null,
  };
  await repository.createReportJob(job);
  return job;
}

export async function runMockReportGeneration(
  orderId: string,
  queuedJobId?: string,
) {
  const repository = await getReportPlatformRepository();
  let order = await repository.getOrder(orderId);
  if (!order || !order.priceSnapshot) throw new Error("A paid order with a frozen price is required.");
  if (order.paymentStatus !== "paid") throw new Error("Report generation cannot start until payment is verified.");
  if (
    order.scope.selectedReportIds?.length &&
    order.property.propertyResearchStatus !== "complete"
  ) {
    throw new Error(
      "Official property research must complete before report generation.",
    );
  }
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
  const templateSnapshots = selectedCatalogueReports.flatMap((entry) => {
    const registeredTemplate = REPORT_TEMPLATE_BY_ID.get(entry.templateId);
    return registeredTemplate
      ? [{
          reportId: entry.id,
          reportName: entry.name,
          templateId: registeredTemplate.id,
          templateVersion: registeredTemplate.version,
          requiredSectionCodes: registeredTemplate.requiredSections.map(
            (section) => section.code,
          ),
          conditionalSectionCodes: registeredTemplate.conditionalSections.map(
            (section) => section.code,
          ),
        }]
      : [];
  });
  const registrySections = [...new Map(registeredTemplates.flatMap((template) => template.requiredSections).map((section) => [section.code, section])).values()];
  if (typeof order.property.mappedAreaSqm === "number" && order.property.mappedAreaSqm > 1_000 && order.property.mappedAreaSqm <= 10_000) {
    registrySections.push({ code: "large_site_analysis", title: "Large-site analysis" });
  }
  if (order.scope.documentAnalysisUpgrades?.length) {
    registrySections.push({
      code: "document_analysis_schedule",
      title: "Purchased technical document-analysis schedule",
    });
  }
  const template = registeredTemplates.length ? {
    templateId: registeredTemplates.map((entry) => entry.id).join("+"),
    sections: registrySections.map((section) => ({ key: section.code, heading: section.title })),
  } : legacyTemplate;
  const now = new Date().toISOString();
  const queuedJob = queuedJobId
    ? await repository.getReportJob(queuedJobId)
    : null;
  const job: ReportJob = queuedJob ?? {
    id: crypto.randomUUID(),
    orderId,
    status: "queued",
    progressStage: "order_confirmed",
    aiProvider: "mock-report-ai",
    templateId: template.templateId,
    promptVersion: REPORT_PROMPT_VERSION,
    schemaVersion: REPORT_SCHEMA_VERSION,
    generationAttempt: 1,
    failureReason: null,
    reviewRequired: order.professionalReviewRequired,
    createdAt: now,
    startedAt: now,
    completedAt: null,
  };
  if (job.orderId !== orderId) {
    throw new Error("The queued report job does not belong to this order.");
  }
  job.templateId = template.templateId;
  job.promptVersion = REPORT_PROMPT_VERSION;
  job.schemaVersion = REPORT_SCHEMA_VERSION;
  job.startedAt = job.startedAt ?? now;
  if (queuedJob) await repository.saveReportJob(job);
  else await repository.createReportJob(job);

  try {
    if (order.status === "paid") {
      order = await repository.transitionOrder(orderId, "queued", "system", { jobId: job.id });
    } else if (order.status !== "queued") {
      throw new Error(
        `Report generation cannot start from order status ${order.status}.`,
      );
    }
    job.status = "securing_files";
    job.progressStage = "files_secured";
    await repository.saveReportJob(job);
    order = await repository.transitionOrder(orderId, "securing_files", "system");
    const selectedDocumentCategories = new Set(
      order.scope.availableDocumentCategories,
    );
    const documents = (await repository.listDocuments(orderId)).filter(
      (document) =>
        selectedDocumentCategories.size === 0 ||
        selectedDocumentCategories.has(document.category),
    );
    const scanner = getMalwareScanner();
    for (const document of documents) {
      const scan = await scanner.scan({ storageReference: document.storageReference, sha256: document.sha256, mimeType: document.mimeType });
      document.malwareScanStatus = scan.status;
      if (scan.status === "rejected") {
        document.status = "failed";
        await repository.saveDocument(document);
        throw new Error(
          `${document.safeFilename} failed malware screening and was quarantined.`,
        );
      }
      document.status = "processing";
      await repository.saveDocument(document);
    }

    order = await repository.transitionOrder(orderId, "analysing_property", "system");
    job.status = "analysing_property";
    job.progressStage = "property_sources_checked";
    await repository.saveReportJob(job);
    const officialResearch = buildOfficialPropertyResearch(order, now);

    order = await repository.transitionOrder(orderId, "analysing_documents", "system");
    job.status = "analysing_documents";
    job.progressStage = "documents_analysed";
    await repository.saveReportJob(job);
    const selectedDocumentAnalysisUpgrades = [
      ...new Set([
        ...(order.scope.documentAnalysisUpgrades ?? []),
        ...documentAnalysisIncludedForReports(selectedReportIds),
      ]),
    ];
    for (const document of documents) {
      const purchasedAnalysis = selectedDocumentAnalysisUpgrades.find(
        (code) =>
          DOCUMENT_ANALYSIS_UPGRADE_BY_CODE.get(
            code,
          )?.eligibleDocumentCategories.includes(document.category),
      );
      const analysisDefinition = purchasedAnalysis
        ? DOCUMENT_ANALYSIS_UPGRADE_BY_CODE.get(purchasedAnalysis)
        : undefined;
      document.extractionProvider = "mock-report-ai";
      document.extractionModel = "deterministic-fixture";
      document.extractionSchemaVersion = "FRC_DOCUMENT_EXTRACTION_V1";
      document.extractedFacts =
        purchasedAnalysis &&
        analysisDefinition &&
        document.automatedInterpretationEligible
          ? [{
              statementType: "extracted_document_fact",
              text: `${analysisDefinition.label} was included in the frozen order scope for ${document.safeFilename}. Mock mode records the technical-analysis contract and evidence source without inventing drawing, survey or consultant findings.`,
              sourceId: document.id,
              sourceDocumentId: document.id,
              sourceType: "client_uploaded_document",
              sourceStatus: "client_supplied",
              issueOrRetrievalDate:
                document.issueDate ?? document.uploadedAt,
              verificationState: "mock_analysis_scope_recorded",
              professionalReviewRequired:
                order.professionalReviewRequired,
              analysisUpgradeCode: purchasedAnalysis,
              analysisLabel: analysisDefinition.label,
            }]
          : [{
              statementType: "missing_information",
              text: "Mock mode records the supplied document without asserting extracted planning facts. No separate technical document-analysis scope was purchased for this file.",
              sourceId: document.id,
              sourceDocumentId: document.id,
              sourceType: "client_uploaded_document",
              sourceStatus: "client_supplied",
              issueOrRetrievalDate:
                document.issueDate ?? document.uploadedAt,
              verificationState: "requires_professional_review",
              professionalReviewRequired: true,
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
    const generationPackage: FrcReportGenerationInputV2 = {
      schemaVersion: "FRC_REPORT_GENERATION_INPUT_V2",
      order: {
        id: order.id,
        reportType: order.reportType,
        selectedScope: order.scope.selectedItems,
        frozenPriceSnapshot,
        professionalReviewRequired: order.professionalReviewRequired,
      },
      propertyIdentity: order.property,
      officialPropertyFacts: officialResearch.facts,
      sourceRegister: officialResearch.sources,
      uploadedDocumentRegister: documents,
      extractedDocumentFacts: documents.flatMap((document) => document.extractedFacts as Array<Record<string, unknown>>),
      documentAnalysisUpgrades: selectedDocumentAnalysisUpgrades,
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
      reportSchemaVersion: REPORT_SCHEMA_VERSION,
      templateSnapshots,
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
        verifiedPropertyFacts: officialResearch.facts.map((fact) => ({
          key: String(fact.field ?? "property_fact"),
          value:
            typeof fact.value === "string"
              ? fact.value
              : JSON.stringify(fact.value ?? null),
          sourceId: String(fact.sourceId ?? "NSW-PROPERTY-DATA"),
        })),
        parcelGeometry: Array.isArray(order.property.parcelGeometry)
          ? { rings: order.property.parcelGeometry }
          : typeof order.property.parcelGeometry === "object"
            ? order.property.parcelGeometry as Record<string, unknown>
            : null,
        boundaryStatus,
        northDirection: typeof order.property.northDirection === "string" ? order.property.northDirection : null,
        landAreaSqm: typeof order.property.mappedAreaSqm === "number" ? order.property.mappedAreaSqm : null,
        existingBuildingFacts: [],
        proposedDevelopmentType: selectedReport.name,
        planningConstraints: Array.isArray(order.property.constraints)
          ? (order.property.constraints as Array<Record<string, unknown>>).map(
              (constraint) => ({
                label: String(
                  constraint.name ?? constraint.label ?? "Property constraint",
                ),
                sourceStatus:
                  constraint.status === "unknown" ||
                  constraint.status === "specialist"
                    ? "unknown" as const
                    : "official_mapped_source" as const,
              }),
            )
          : [],
        uploadedSurveyFacts: documents.filter((document) => document.category === "registered_detail_survey").map((document) => ({ fact: "Registered survey supplied for review.", sourceId: document.id })),
        titleAndEasementFacts: documents.filter((document) => document.category === "title_and_deposited_plan").map((document) => ({ fact: "Title or deposited plan supplied for review.", sourceId: document.id })),
        sewerAndServiceFacts: documents.filter((document) => document.category === "sewer_services_diagram").map(() => ({ fact: "Client-supplied service diagram available for interpretation.", sourceStatus: "uploaded_document" as const })),
        stormwaterFacts: documents.filter((document) => document.category === "stormwater_drawings").map(() => ({ fact: "Client-supplied stormwater drawing available for interpretation.", sourceStatus: "uploaded_document" as const })),
        treesAndVegetation: [],
        floodAndBushfireInformation: officialResearch.facts
          .filter((fact) =>
            ["flooding", "bushfire"].includes(String(fact.field)),
          )
          .map((fact) => ({
            fact: `${String(fact.field)}: ${String(fact.value ?? "No mapped value returned")}`,
            sourceStatus:
              fact.status === "mapped"
                ? "official_mapped_source" as const
                : "unknown" as const,
          })),
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
        reportNames: selectedCatalogueReports.map((entry) => entry.name),
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
