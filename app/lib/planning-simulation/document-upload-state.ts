import type { DocumentCategoryCode } from "./types";

export type UploadedDocumentLike = {
  id: string;
  category: string;
};

export function groupUploadedDocuments<T extends UploadedDocumentLike>(
  documents: readonly T[],
  supportedCategories: ReadonlySet<DocumentCategoryCode>,
) {
  const grouped: Partial<Record<DocumentCategoryCode, T[]>> = {};
  for (const document of documents) {
    const category = document.category as DocumentCategoryCode;
    if (!supportedCategories.has(category)) continue;
    grouped[category] = [
      ...(grouped[category] ?? []).filter((item) => item.id !== document.id),
      document,
    ];
  }
  return grouped;
}

export function missingSelectedUploadCategories(
  selectedCategories: readonly DocumentCategoryCode[],
  uploadedDocuments: Partial<Record<DocumentCategoryCode, readonly unknown[]>>,
) {
  return selectedCategories.filter(
    (category) => !(uploadedDocuments[category]?.length),
  );
}
