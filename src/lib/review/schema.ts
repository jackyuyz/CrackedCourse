import { z } from "zod";

const nullableShortText = z.string().trim().max(300).nullable().optional();
const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();
const nullableTime = z
  .string()
  .regex(/^\d{2}:\d{2}(?::\d{2})?$/)
  .nullable()
  .optional();

export const reviewPayloadSchemas = {
  course_field: z.object({
    field: z.enum(["code", "title", "section", "term", "timeZone"]),
    value: z.string().trim().min(1).max(180),
  }),
  person: z.object({
    name: z.string().trim().min(1).max(120),
    role: z.enum(["instructor", "teaching_assistant", "other"]),
    email: z.string().email().nullable().optional(),
    officeLocation: nullableShortText,
  }),
  office_hour: z.object({
    personName: nullableShortText,
    recurrenceText: nullableShortText,
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    startTime: nullableTime,
    endTime: nullableTime,
    startDate: nullableDate,
    endDate: nullableDate,
    timeZone: nullableShortText,
    location: nullableShortText,
    meetingUrl: z.string().url().nullable().optional(),
  }),
  event: z.object({
    title: z.string().trim().min(1).max(180),
    type: z.enum([
      "exam",
      "quiz",
      "assignment",
      "project",
      "deadline",
      "class_session",
      "other",
    ]),
    startDate: nullableDate,
    startTime: nullableTime,
    endDate: nullableDate,
    endTime: nullableTime,
    isAllDay: z.boolean(),
    location: nullableShortText,
  }),
  grading_category: z.object({
    name: z.string().trim().min(1).max(120),
    weightPercent: z.number().min(0).max(100),
  }),
  grading_policy: z.object({
    kind: z.enum([
      "drop_lowest",
      "replacement",
      "curve",
      "extra_credit",
      "attendance",
      "other",
    ]),
    description: z.string().trim().min(1).max(1_000),
    supportedByCalculator: z.literal(false),
  }),
} as const;

export type ReviewItemType = keyof typeof reviewPayloadSchemas;
