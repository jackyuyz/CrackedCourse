import "server-only";

import { createHash } from "node:crypto";

import type { LearningAssistantRequest } from "@/lib/learning-ai";

export type LearningGuideNoteRow = {
  id: string;
  visibility: "public" | "private";
  body_markdown: string;
  updated_at: string;
};

export type LearningGuideMaterialRow = {
  id: string;
  title: string;
  storage_path: string | null;
  material_type: "pdf" | "slides" | "link" | "other";
  kind: "file" | "link";
  size_bytes: number | null;
  updated_at: string;
  display_order: number;
};

export function defaultLearningGuideSources(
  notes: LearningGuideNoteRow[],
  materials: LearningGuideMaterialRow[],
): LearningAssistantRequest["sources"] {
  const noteSources = notes
    .filter((note) => note.body_markdown.trim())
    .toSorted((left, right) => left.visibility.localeCompare(right.visibility))
    .map((note) => ({
      kind: "note" as const,
      visibility: note.visibility,
    }));
  const materialSources = materials
    .filter(
      (material) =>
        material.kind === "file" &&
        material.material_type === "pdf" &&
        Boolean(material.storage_path),
    )
    .toSorted(
      (left, right) =>
        left.display_order - right.display_order ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3)
    .map((material) => ({
      kind: "material" as const,
      materialId: material.id,
    }));
  return [...noteSources, ...materialSources];
}

export function learningGuideSourceFingerprint(input: {
  notes: LearningGuideNoteRow[];
  materials: LearningGuideMaterialRow[];
}) {
  const notes = input.notes
    .filter((note) => note.body_markdown.trim())
    .map((note) => ({
      id: note.id,
      visibility: note.visibility,
      bodyMarkdown: note.body_markdown,
      updatedAt: note.updated_at,
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id));
  const materials = input.materials
    .filter(
      (material) =>
        material.kind === "file" &&
        material.material_type === "pdf" &&
        Boolean(material.storage_path),
    )
    .map((material) => ({
      id: material.id,
      storagePath: material.storage_path,
      sizeBytes: material.size_bytes,
      updatedAt: material.updated_at,
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id));

  return createHash("sha256")
    .update(JSON.stringify({ notes, materials }))
    .digest("hex");
}
