export type CourseRecordOrigin =
  | "syllabus"
  | "manual"
  | "community_import";

export interface EditablePerson {
  id?: string;
  name: string;
  role: "instructor" | "teaching_assistant" | "other";
  email: string | null;
  officeLocation: string | null;
  externalProfileUrl: string | null;
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface EditableOfficeHour {
  id?: string;
  personId: string | null;
  recurrenceText: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  timeZone: string | null;
  location: string | null;
  meetingUrl: string | null;
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface EditableEvent {
  id?: string;
  title: string;
  type:
    | "exam"
    | "quiz"
    | "assignment"
    | "project"
    | "office_hour"
    | "class_session"
    | "deadline"
    | "other";
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  status: "confirmed" | "cancelled";
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface EditableCategory {
  id?: string;
  name: string;
  weightPercent: number;
  aggregationMode: "points" | "equal" | "custom";
  isComplete: boolean;
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface EditablePolicy {
  id?: string;
  kind:
    | "drop_lowest"
    | "replacement"
    | "curve"
    | "extra_credit"
    | "attendance"
    | "other";
  description: string;
  calculatorSupport: "unsupported" | "supported";
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface EditableAssessment {
  id?: string;
  name: string;
  categoryId: string;
  dueEventId: string | null;
  earnedPoints: number | null;
  maxPoints: number | null;
  expectedPercent: number | null;
  status: "planned" | "graded" | "excused";
  origin: CourseRecordOrigin;
  isHidden: boolean;
}

export interface CourseEditorData {
  courseId: string;
  courseTimeZone: string;
  people: EditablePerson[];
  officeHours: EditableOfficeHour[];
  events: EditableEvent[];
  categories: EditableCategory[];
  policies: EditablePolicy[];
  assessments: EditableAssessment[];
  sources: Array<{
    id: string;
    originalName: string;
    pageCount: number | null;
    processingStatus: string;
    createdAt: string;
  }>;
}

export const originLabel: Record<CourseRecordOrigin, string> = {
  syllabus: "From syllabus",
  manual: "Added manually",
  community_import: "Imported from community",
};
