import { getProjectFilesBucket, verifySignedFileRequest } from "../../lib/project-files";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const expires = url.searchParams.get("expires") || "";
  const signature = url.searchParams.get("sig") || "";
  if (!key || !(await verifySignedFileRequest(key, expires, signature))) return new Response("Invalid or expired file link.", { status: 403 });
  const bucket = getProjectFilesBucket();
  if (!bucket) return new Response("Project file storage is not configured.", { status: 503 });
  const object = await bucket.get(key);
  if (!object) return new Response("File not found.", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("Content-Disposition", `inline; filename="${object.customMetadata?.originalName || "project-file"}"`);
  return new Response(object.body, { headers });
}
