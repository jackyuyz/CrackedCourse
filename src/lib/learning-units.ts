import { z } from "zod";

export const learningUnitNoteVisibilitySchema = z.enum(["public", "private"]);
export type LearningUnitNoteVisibility = z.infer<
  typeof learningUnitNoteVisibilitySchema
>;

export const learningUnitInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1_000).nullable().optional(),
});

export const learningUnitUpdateSchema = learningUnitInputSchema.partial().extend({
  isHidden: z.boolean().optional(),
});

export const learningUnitReorderSchema = z.object({
  unitIds: z.array(z.string().uuid()).min(1).max(500),
});

export const learningUnitNoteInputSchema = z.object({
  visibility: learningUnitNoteVisibilitySchema,
  bodyMarkdown: z.string().max(120_000),
});

export const materialLinkInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  learningUnitId: z.string().uuid().nullable(),
  externalUrl: z.url({ protocol: /^https:$/ }).max(2_000),
});

export const materialFileRegistrationSchema = z.object({
  title: z.string().trim().min(1).max(180),
  learningUnitId: z.string().uuid().nullable(),
  storagePath: z.string().min(1).max(1_000),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
});

export const materialUpdateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  learningUnitId: z.string().uuid().nullable().optional(),
  isHidden: z.boolean().optional(),
});

export type LearningUnitNote = {
  id: string;
  visibility: LearningUnitNoteVisibility;
  bodyMarkdown: string;
  updatedAt: string;
};

export type LearningUnit = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isHidden: boolean;
  notes: Partial<Record<LearningUnitNoteVisibility, LearningUnitNote>>;
};

export type CourseMaterial = {
  id: string;
  title: string;
  kind: "file" | "link";
  materialType: "pdf" | "slides" | "link" | "other";
  learningUnitId: string | null;
  externalUrl: string | null;
  originalName: string | null;
  sizeBytes: number | null;
  isHidden: boolean;
};

export const publishedLearningUnitSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(1_000).nullable(),
  displayOrder: z.number().int().nonnegative(),
  noteMarkdown: z.string().trim().min(1).max(120_000),
  noteUpdatedAt: z.string().datetime(),
});

export type PublishedLearningUnit = z.infer<typeof publishedLearningUnitSchema>;

export function parsePublishedLearningUnits(value: unknown): PublishedLearningUnit[] {
  const parsed = z.array(publishedLearningUnitSchema).safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.sort((left, right) => left.displayOrder - right.displayOrder);
}

export function materialTypeForMimeType(
  mimeType: z.infer<typeof materialFileRegistrationSchema>["mimeType"],
): "pdf" | "slides" {
  return mimeType === "application/pdf" ? "pdf" : "slides";
}
