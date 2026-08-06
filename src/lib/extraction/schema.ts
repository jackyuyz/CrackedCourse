import { z } from "zod";

export const evidenceSchema = z
  .object({
    pageNumber: z.number().int().positive().nullable(),
    quote: z.string().min(1).max(1_000),
    startOffset: z.number().int().nonnegative().nullable().optional(),
    endOffset: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    ({ startOffset, endOffset }) =>
      startOffset == null || endOffset == null || endOffset >= startOffset,
    { message: "Evidence end offset must follow its start offset." },
  );

function extractedValueSchema<T extends z.ZodType>(value: T) {
  return z.object({
    value,
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidenceSchema),
    ambiguity: z.string().nullable().optional(),
  });
}

const nullableText = z.string().trim().min(1).nullable();

export const warningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["info", "review", "blocking"]),
});

export const syllabusExtractionV1Schema = z.object({
  schemaVersion: z.literal("1"),
  course: z.object({
    code: extractedValueSchema(nullableText),
    title: extractedValueSchema(nullableText),
    section: extractedValueSchema(nullableText),
    term: extractedValueSchema(nullableText),
    timeZone: extractedValueSchema(nullableText),
  }),
  people: z.array(
    extractedValueSchema(
      z.object({
        name: z.string().trim().min(1),
        role: z.enum(["instructor", "teaching_assistant", "other"]),
        email: z.string().email().nullable().optional(),
        officeLocation: z.string().trim().min(1).nullable().optional(),
      }),
    ),
  ),
  officeHours: z.array(
    extractedValueSchema(
      z.object({
        personName: z.string().trim().min(1).nullable().optional(),
        recurrenceText: z.string().trim().min(1).nullable().optional(),
        dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
        startTime: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        timeZone: z.string().nullable().optional(),
        location: z.string().trim().min(1).nullable().optional(),
        meetingUrl: z.string().url().nullable().optional(),
      }),
    ),
  ),
  events: z.array(
    extractedValueSchema(
      z.object({
        title: z.string().trim().min(1),
        type: z.enum([
          "exam",
          "quiz",
          "assignment",
          "project",
          "deadline",
          "class_session",
          "other",
        ]),
        startDate: z.string().nullable(),
        startTime: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        endTime: z.string().nullable().optional(),
        isAllDay: z.boolean(),
        location: z.string().trim().min(1).nullable().optional(),
      }),
    ),
  ),
  gradingCategories: z.array(
    extractedValueSchema(
      z.object({
        name: z.string().trim().min(1),
        weightPercent: z.number().min(0).max(100).nullable(),
      }),
    ),
  ),
  gradingPolicies: z.array(
    extractedValueSchema(
      z.object({
        kind: z.enum([
          "drop_lowest",
          "replacement",
          "curve",
          "extra_credit",
          "attendance",
          "other",
        ]),
        description: z.string().trim().min(1),
        supportedByCalculator: z.literal(false),
      }),
    ),
  ),
  warnings: z.array(warningSchema),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type SyllabusExtractionV1 = z.infer<typeof syllabusExtractionV1Schema>;

export interface ExtractorInput {
  sourceId: string;
  pages: Array<{ pageNumber: number; text: string }>;
  locale?: string;
  assumedTerm?: {
    name?: string;
    startDate?: string;
    endDate?: string;
    timeZone?: string;
  };
}

export interface SyllabusExtractor {
  extract(input: ExtractorInput): Promise<SyllabusExtractionV1>;
}
