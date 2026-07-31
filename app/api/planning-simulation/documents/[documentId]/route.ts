import { getReportPlatformRepository } from "../../../../lib/report-platform/repository";
import { getPrivateStorageProvider } from "../../../../lib/report-platform/storage";
import { tokenMatches } from "../../../../lib/report-platform/security";

async function authorisedDocument(request: Request, documentId: string) {
  const repository = await getReportPlatformRepository();
  const document = await repository.getDocument(documentId);
  if (!document) return { repository, document: null, authorised: false };
  const order = await repository.getOrder(document.orderId);
  const token = request.headers.get("x-frc-order-token") ?? "";
  return {
    repository,
    document,
    authorised: Boolean(order && await tokenMatches(token, order.ownerHash)),
  };
}

export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  const { document, authorised } = await authorisedDocument(request, documentId);
  if (!document) return new Response("Document not found.", { status: 404 });
  if (!authorised) return new Response("Document access denied.", { status: 403 });
  const object = await getPrivateStorageProvider().get(document.storageReference);
  if (!object) return new Response("Private file is unavailable.", { status: 404 });
  return new Response(object.bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Disposition": `inline; filename="${object.filename.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  const { repository, document, authorised } = await authorisedDocument(request, documentId);
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (!authorised) return Response.json({ error: "Document access denied." }, { status: 403 });
  const order = await repository.getOrder(document.orderId);
  if (!order || !["draft", "awaiting_uploads"].includes(order.status)) {
    return Response.json({ error: "Documents cannot be removed after checkout confirmation." }, { status: 409 });
  }
  await getPrivateStorageProvider().remove(document.storageReference);
  await repository.deleteDocument(document.id);
  await repository.addOrderEvent({
    id: crypto.randomUUID(),
    orderId: document.orderId,
    eventType: "document_removed",
    actor: "client",
    metadata: { documentId: document.id, category: document.category },
    createdAt: new Date().toISOString(),
  });
  return Response.json({ removed: true });
}
