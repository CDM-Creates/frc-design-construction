import { zipSync, strToU8 } from "fflate";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderMockVisualisationImage } from "./architectural-visualisations";
import { REPORT_BY_ID } from "./report-catalogue";
import type {
  ArchitecturalVisualisationRecord,
  DocumentRecord,
  StructuredPlanningReport,
} from "./types";

export const REPORT_PACK_VERSION = "FRC_REPORT_PACK_2026_01";
export const SOURCE_REGISTER_VERSION = "FRC_SOURCE_REGISTER_2026_01";
export const DOCUMENT_REGISTER_VERSION = "FRC_DOCUMENT_REGISTER_2026_01";
export const RISK_REGISTER_VERSION = "FRC_RISK_REGISTER_2026_01";

export type ReportPackFile = {
  path: string;
  bytes: Uint8Array;
  mediaType: string;
  source: "generated" | "accepted_visualisation" | "authorised_client_upload";
};

export type ReportPackManifest = {
  version: typeof REPORT_PACK_VERSION;
  orderId: string;
  reportIds: string[];
  reportNames: string[];
  templateVersions: string[];
  pricingVersion: string;
  generatedAt: string;
  files: Array<{ path: string; byteSize: number; sha256: string; mediaType: string }>;
  professionalReviewStatus: string;
  sourceRegisterVersion: typeof SOURCE_REGISTER_VERSION;
  documentRegisterVersion: typeof DOCUMENT_REGISTER_VERSION;
  riskRegisterVersion: typeof RISK_REGISTER_VERSION;
};

const cleanFilename = (value: string) => value
  .normalize("NFKD")
  .replace(/[^\w.\- ]+/g, "")
  .trim()
  .replace(/\s+/g, "_")
  .replace(/^\.+/, "")
  .slice(0, 120) || "file";

export function uniquePackPath(path: string, used: Set<string>) {
  const sanitised = path.split("/").map(cleanFilename).join("/");
  if (!used.has(sanitised)) {
    used.add(sanitised);
    return sanitised;
  }
  const dot = sanitised.lastIndexOf(".");
  const base = dot > -1 ? sanitised.slice(0, dot) : sanitised;
  const extension = dot > -1 ? sanitised.slice(dot) : "";
  let counter = 2;
  while (used.has(`${base}_${counter}${extension}`)) counter += 1;
  const unique = `${base}_${counter}${extension}`;
  used.add(unique);
  return unique;
}

function wrapText(text: string, maximumCharacters = 88) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maximumCharacters) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderStructuredReportPdf(report: StructuredPlanningReport, title = report.title) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = document.addPage(pageSize);
  let y = 790;
  const addPage = () => {
    page = document.addPage(pageSize);
    y = 790;
  };
  const drawLines = (text: string, size = 10, font = regular, colour = rgb(0.12, 0.15, 0.18)) => {
    for (const line of wrapText(text, size >= 18 ? 52 : 94)) {
      if (y < 55) addPage();
      page.drawText(line, { x: 48, y, size, font, color: colour });
      y -= size + 5;
    }
  };
  drawLines("FRC DESIGN & CONSTRUCTION", 9, bold, rgb(0.55, 0.32, 0.1));
  y -= 20;
  drawLines(title, 23, bold);
  y -= 8;
  drawLines(report.propertyReference, 13, regular);
  drawLines(report.watermark, 10, bold, rgb(0.7, 0.18, 0.16));
  y -= 24;
  drawLines(report.limitations.join(" "), 9);
  for (const section of report.sections) {
    y -= 18;
    if (y < 100) addPage();
    drawLines(section.heading, 15, bold);
    drawLines(section.summary, 10);
    for (const bullet of section.bullets) drawLines(`• ${bullet}`, 9);
    for (const statement of section.statements) {
      drawLines(`${statement.text} [${statement.sourceId} · ${statement.verificationState}]`, 8, regular, rgb(0.28, 0.31, 0.34));
    }
  }
  return new Uint8Array(await document.save());
}

export async function renderSimplePdf(title: string, paragraphs: string[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = document.addPage(pageSize);
  let y = 790;
  const draw = (text: string, size = 10, font = regular, colour = rgb(0.12, 0.15, 0.18)) => {
    for (const line of wrapText(text, size >= 18 ? 52 : 94)) {
      if (y < 55) {
        page = document.addPage(pageSize);
        y = 790;
      }
      page.drawText(line, { x: 48, y, size, font, color: colour });
      y -= size + 5;
    }
  };
  draw("FRC DESIGN & CONSTRUCTION", 9, bold, rgb(0.55, 0.32, 0.1));
  y -= 20;
  draw(title, 21, bold);
  y -= 10;
  for (const paragraph of paragraphs) {
    draw(paragraph, 10);
    y -= 8;
  }
  return new Uint8Array(await document.save());
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "Status\nNo supported entries\n";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

async function sha256(bytes: Uint8Array) {
  const source = new Uint8Array(bytes.byteLength);
  source.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildReportPack(input: {
  orderId: string;
  suburb: string;
  selectedReportIds: string[];
  report: StructuredPlanningReport;
  documents: DocumentRecord[];
  visualisations: ArchitecturalVisualisationRecord[];
  visualisationBytes?: Record<string, Uint8Array>;
  includeClientUploads: boolean;
  authorisedClientUploadBytes?: Record<string, Uint8Array>;
  professionalReviewStatus: string;
  reviewerRecord?: Record<string, unknown> | null;
}) {
  const used = new Set<string>();
  const files: ReportPackFile[] = [];
  const add = (path: string, bytes: Uint8Array, mediaType: string, source: ReportPackFile["source"] = "generated") => {
    files.push({ path: uniquePackPath(path, used), bytes, mediaType, source });
  };
  const readMe = await renderStructuredReportPdf({
    ...input.report,
    title: "FRC report pack — read me",
    sections: input.report.sections.filter((section) => ["02_report_status", "03_preliminary_notice", "15_missing_information", "23_limitations"].includes(section.code)),
  }, "FRC report pack — read me");
  add("00_READ_ME.pdf", readMe, "application/pdf");

  const boundarySections = input.report.sections.filter((section) => ["05_property_identity", "06_property_area_boundary"].includes(section.code));
  add("01_Property_and_Boundary_Baseline.pdf", await renderStructuredReportPdf({ ...input.report, sections: boundarySections }, "Property and boundary baseline"), "application/pdf");

  const reportIds = input.selectedReportIds.length ? [...new Set(input.selectedReportIds)] : ["property_intelligence"];
  for (const [index, reportId] of reportIds.entries()) {
    const catalogue = REPORT_BY_ID.get(reportId);
    const name = catalogue?.name ?? input.report.title;
    add(`${String(index + 2).padStart(2, "0")}_${cleanFilename(name)}.pdf`, await renderStructuredReportPdf(input.report, name), "application/pdf");
  }

  const acceptedVisuals = input.visualisations.filter((visual) => ["accepted", "approved"].includes(visual.status));
  for (const [index, visual] of acceptedVisuals.entries()) {
    const provided = input.visualisationBytes?.[visual.id];
    const image = provided
      ? { bytes: provided, mediaType: "image/jpeg", extension: "jpg" }
      : renderMockVisualisationImage(visual);
    add(`10_Concept_Visualisations/${String(index + 1).padStart(2, "0")}_${cleanFilename(visual.visualisationType)}.${image.extension}`, image.bytes, image.mediaType, "accepted_visualisation");
  }

  const sourceRows = input.report.sections.flatMap((section) => section.statements.map((statement) => ({
    section: section.code,
    sourceId: statement.sourceId,
    sourceType: statement.sourceType,
    sourceStatus: statement.sourceStatus,
    issueOrRetrievalDate: statement.issueOrRetrievalDate,
    verificationState: statement.verificationState,
  })));
  add("90_Source_Register.csv", strToU8(rowsToCsv(sourceRows)), "text/csv");
  add("91_Document_Register.csv", strToU8(rowsToCsv(input.report.documentRegister)), "text/csv");
  add("92_Risk_Register.csv", strToU8(rowsToCsv(input.report.riskRegister)), "text/csv");
  add("93_Action_Plan.pdf", await renderStructuredReportPdf({ ...input.report, sections: input.report.sections.filter((section) => section.code === "22_prioritised_action_plan") }, "Prioritised action plan"), "application/pdf");

  if (input.reviewerRecord && Object.keys(input.reviewerRecord).length) {
    const reviewLines = Object.entries(input.reviewerRecord).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
    add("95_Professional_Review_Record.pdf", await renderSimplePdf("Professional review record", [
      "This record is produced only after a registered professional completed the review.",
      ...reviewLines,
    ]), "application/pdf");
  }

  if (reportIds.includes("council_readiness")) {
    const councilSections = input.report.sections.filter((section) => /council|readiness|submission|document_register/i.test(section.code));
    const councilLines = councilSections.length
      ? councilSections.flatMap((section) => [section.heading, section.summary, ...section.bullets.map((bullet) => `• ${bullet}`)])
      : ["Council-readiness status is preliminary until a registered professional confirms the submission documents."];
    add("96_Council_Readiness_Checklist.pdf", await renderSimplePdf("Council-readiness checklist", councilLines), "application/pdf");
  }

  if (input.includeClientUploads) {
    for (const document of input.documents) {
      const bytes = input.authorisedClientUploadBytes?.[document.id];
      if (!bytes || document.malwareScanStatus !== "clean") continue;
      add(`Client_Uploads/${document.safeFilename}`, bytes, document.mimeType, "authorised_client_upload");
    }
  }

  const manifest: ReportPackManifest = {
    version: REPORT_PACK_VERSION,
    orderId: input.orderId,
    reportIds,
    reportNames: reportIds.map((id) => REPORT_BY_ID.get(id)?.name ?? input.report.title),
    templateVersions: [input.report.templateVersion],
    pricingVersion: input.report.pricingVersion,
    generatedAt: new Date().toISOString(),
    files: [],
    professionalReviewStatus: input.professionalReviewStatus,
    sourceRegisterVersion: SOURCE_REGISTER_VERSION,
    documentRegisterVersion: DOCUMENT_REGISTER_VERSION,
    riskRegisterVersion: RISK_REGISTER_VERSION,
  };
  manifest.files = await Promise.all(files.map(async (file) => ({
    path: file.path,
    byteSize: file.bytes.byteLength,
    sha256: await sha256(file.bytes),
    mediaType: file.mediaType,
  })));
  const manifestBytes = strToU8(JSON.stringify(manifest, null, 2));
  const manifestPath = uniquePackPath("94_Report_Manifest.json", used);
  files.push({ path: manifestPath, bytes: manifestBytes, mediaType: "application/json", source: "generated" });
  manifest.files.push({ path: manifestPath, byteSize: manifestBytes.byteLength, sha256: await sha256(manifestBytes), mediaType: "application/json" });

  const archiveEntries: Record<string, Uint8Array> = {};
  for (const file of files) archiveEntries[file.path] = file.bytes;
  const bytes = zipSync(archiveEntries, { level: 6 });
  const filename = `FRC_${cleanFilename(input.suburb || "Property")}_${cleanFilename(input.orderId)}_Report_Pack.zip`;
  return { filename, bytes, files, manifest };
}
