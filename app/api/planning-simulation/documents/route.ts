import { DOCUMENT_CATEGORY_BY_CODE } from "../../../lib/planning-simulation/document-categories";
import type { DocumentCategoryCode } from "../../../lib/planning-simulation/types";
import { getReportPlatformRepository } from "../../../lib/report-platform/repository";
import { getPrivateStorageProvider, MAX_BYTES_PER_ORDER, MAX_FILES_PER_DOCUMENT_CATEGORY } from "../../../lib/report-platform/storage";
import { tokenMatches } from "../../../lib/report-platform/security";
import type { DocumentRecord } from "../../../lib/report-platform/types";

const text = (value: FormDataEntryValue | null, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) || null : null;

function safeDocument(document: DocumentRecord) {
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
  };
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
      status: "uploaded_unprocessed",
      extractionProvider: null,
      extractionModel: null,
      extractionSchemaVersion: null,
      extractedFacts: [],
      sourceCitations: [],
      detectedConflicts: [],
      professionalReviewStatus: "not_required",
      supersededDocumentId: null,
      malwareScanStatus: "not_scanned",
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
