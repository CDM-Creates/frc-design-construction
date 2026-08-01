import { DOCUMENT_CATEGORY_BY_CODE } from "../../../lib/planning-simulation/document-categories";
import type { DocumentCategoryCode } from "../../../lib/planning-simulation/types";
import { getReportPlatformRepository } from "../../../lib/report-platform/repository";
import { getPrivateStorageProvider, MAX_BYTES_PER_ORDER, MAX_FILES_PER_DOCUMENT_CATEGORY } from "../../../lib/report-platform/storage";
import { tokenMatches } from "../../../lib/report-platform/security";
import type { DocumentRecord } from "../../../lib/report-platform/types";
import { assessUploadedDocument, documentAiIsRequired } from "../../../lib/report-platform/document-ai";
import { getMalwareScanner } from "../../../lib/report-platform/malware";

const text = (value: FormDataEntryValue | null, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) || null : null;

function safeDocument(document: DocumentRecord) {
  const intakeAssessment = document.extractedFacts.find(
    (fact) => fact && typeof fact === "object" && (fact as { schemaVersion?: unknown }).schemaVersion === "FRC_DOCUMENT_INTAKE_V1",
  ) ?? null;
  return {
    id: document.id,
    category: document.category,
    filename: document.originalFilename,
    safeFilename: document.safeFilename,
    mimeType: document.mimeType,
    byteSize: document.byteSize,
    author: document.author,
    issueDate: document.issueDate,
    revision: document.revision,
    clientNote: document.clientNote,
    uploadedAt: document.uploadedAt,
    status: document.status,
    malwareScanStatus: document.malwareScanStatus,
    automatedInterpretationEligible: document.automatedInterpretationEligible,
    intakeAssessment,
    validationAccepted: !documentAiIsRequired() || ["validated", "processed", "requires_professional_review"].includes(document.status),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId")?.trim().slice(0, 80) ?? "";
    const token = request.headers.get("X-FRC-Order-Token")?.trim().slice(0, 160) ?? "";
    if (!orderId || !token) {
      return Response.json(
        { error: "Order authorisation is required." },
        { status: 400 },
      );
    }
    const repository = await getReportPlatformRepository();
    const order = await repository.getOrder(orderId);
    if (!order || !(await tokenMatches(token, order.ownerHash))) {
      return Response.json(
        { error: "Document access authorisation failed." },
        { status: 403 },
      );
    }
    const documents = await repository.listDocuments(orderId);
    return Response.json(
      { documents: documents.map(safeDocument) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The uploaded-document register could not be loaded.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const orderId = text(form.get("orderId"), 80);
    const token = text(form.get("accessToken"), 160);
    const category = text(form.get("category"), 80) as DocumentCategoryCode | null;
    const file = form.get("file");
    if (!orderId || !token || !category || !(file instanceof File)) {
      throw new Error("Order authorisation, document category and file are required.");
    }
    if (!DOCUMENT_CATEGORY_BY_CODE.has(category)) throw new Error("The document category is not supported.");

    const repository = await getReportPlatformRepository();
    const order = await repository.getOrder(orderId);
    if (!order || !(await tokenMatches(token, order.ownerHash))) {
      return Response.json({ error: "Document upload authorisation failed." }, { status: 403 });
    }
    if (!["draft", "awaiting_uploads"].includes(order.status)) {
      throw new Error("Documents cannot be changed after checkout review has been confirmed.");
    }
    const existing = await repository.listDocuments(orderId);
    if (existing.filter((document) => document.category === category).length >= MAX_FILES_PER_DOCUMENT_CATEGORY) {
      throw new Error(`Upload no more than ${MAX_FILES_PER_DOCUMENT_CATEGORY} files for this document category.`);
    }
    if (existing.reduce((sum, document) => sum + document.byteSize, 0) + file.size > MAX_BYTES_PER_ORDER) {
      throw new Error("The order upload limit is 150 MB.");
    }

    const documentId = crypto.randomUUID();
    const storage = getPrivateStorageProvider();
    const stored = await storage.put({ orderId, documentId, file });
    const uploadedAt = new Date().toISOString();
    const scan = await getMalwareScanner().scan({
      storageReference: stored.storageReference,
      sha256: stored.sha256,
      mimeType: stored.detectedMimeType,
    });
    if (scan.status === "rejected") {
      await storage.remove(stored.storageReference);
      throw new Error(`${file.name}: the file failed security screening and was not retained.`);
    }
    let assessment = null;
    let assessmentError = "";
    if (scan.status === "clean" && stored.automatedInterpretationEligible) {
      try {
        assessment = await assessUploadedDocument({
          bytes: new Uint8Array(await file.arrayBuffer()),
          mimeType: stored.detectedMimeType,
          filename: stored.safeFilename,
          category,
          propertyAddress: text(form.get("propertyAddress"), 500) ?? String(order.property.clientSuppliedAddress ?? order.property.officialAddress ?? ""),
          selectedReportIds: (text(form.get("selectedReportIds"), 1_000) ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20),
        });
      } catch (error) {
        assessmentError = error instanceof Error ? error.message : "Document AI validation failed.";
      }
    }
    const acceptedAssessment = assessment?.result === "relevant";
    const rejectedAssessment = assessment && ["wrong_category", "property_mismatch", "unreadable"].includes(assessment.result);
    const documentStatus: DocumentRecord["status"] = rejectedAssessment
      ? "rejected_irrelevant"
      : acceptedAssessment
        ? "validated"
        : assessment?.result === "uncertain"
          ? "requires_professional_review"
          : documentAiIsRequired()
            ? "validation_pending"
            : "uploaded_unprocessed";
    const document: DocumentRecord = {
      id: documentId,
      orderId,
      storageReference: stored.storageReference,
      originalFilename: file.name.slice(0, 240),
      safeFilename: stored.safeFilename,
      mimeType: stored.detectedMimeType,
      byteSize: file.size,
      pageCount: null,
      sha256: stored.sha256,
      category,
      author: text(form.get("author"), 160),
      issueDate: text(form.get("issueDate"), 20),
      revision: text(form.get("revision"), 80),
      clientNote: text(form.get("clientNote"), 1000),
      uploadedAt,
      status: documentStatus,
      extractionProvider: assessment?.provider ?? null,
      extractionModel: assessment?.model ?? null,
      extractionSchemaVersion: assessment?.schemaVersion ?? null,
      extractedFacts: assessment ? [assessment] : assessmentError ? [{ schemaVersion: "FRC_DOCUMENT_INTAKE_ERROR_V1", message: assessmentError }] : [],
      sourceCitations: [],
      detectedConflicts: [],
      professionalReviewStatus: assessment?.result === "uncertain" ? "pending" : "not_required",
      supersededDocumentId: null,
      malwareScanStatus: scan.status,
      automatedInterpretationEligible: stored.automatedInterpretationEligible,
    };
    try {
      await repository.addDocument(document);
      if (order.status === "draft") await repository.transitionOrder(orderId, "awaiting_uploads", "client", { category });
    } catch (error) {
      await storage.remove(stored.storageReference);
      throw error;
    }
    return Response.json({ document: safeDocument(document) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The document could not be uploaded." }, { status: 400 });
  }
}
