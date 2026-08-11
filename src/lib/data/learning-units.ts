import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import {
  type CourseMaterial,
  type LearningUnit,
  type LearningUnitNote,
} from "@/lib/learning-units";
import { demoCourses } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface LearningWorkspaceData {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  units: LearningUnit[];
  hiddenUnits: LearningUnit[];
  materials: CourseMaterial[];
  publishedAt: string | null;
  publicationVersion: number | null;
}

function mapNote(row: {
  id: string;
  visibility: "public" | "private";
  body_markdown: string;
  updated_at: string;
}): LearningUnitNote {
  return {
    id: row.id,
    visibility: row.visibility,
    bodyMarkdown: row.body_markdown,
    updatedAt: row.updated_at,
  };
}

function mapUnit(row: {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_hidden: boolean;
  learning_unit_notes: Array<{
    id: string;
    visibility: "public" | "private";
    body_markdown: string;
    updated_at: string;
  }> | null;
}): LearningUnit {
  const notes = (row.learning_unit_notes ?? []).reduce<
    LearningUnit["notes"]
  >((current, note) => {
    current[note.visibility] = mapNote(note);
    return current;
  }, {});
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isHidden: row.is_hidden,
    notes,
  };
}

function mapMaterial(row: {
  id: string;
  title: string;
  kind: "file" | "link";
  material_type: "pdf" | "slides" | "link" | "other";
  learning_unit_id: string | null;
  external_url: string | null;
  original_name: string | null;
  size_bytes: number | null;
  is_hidden: boolean;
}): CourseMaterial {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    materialType: row.material_type,
    learningUnitId: row.learning_unit_id,
    externalUrl: row.external_url,
    originalName: row.original_name,
    sizeBytes: row.size_bytes,
    isHidden: row.is_hidden,
  };
}

function demoWorkspace(courseId: string): LearningWorkspaceData | null {
  const course = demoCourses.find((item) => item.id === courseId);
  if (!course) return null;
  return {
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    publicationVersion: null,
    publishedAt: null,
    units: [
      {
        id: "demo-unit-foundations",
        title: "Foundations",
        description: "Core concepts and notation from the first week.",
        displayOrder: 0,
        isHidden: false,
        notes: {
          public: {
            id: "demo-public-foundations",
            visibility: "public",
            bodyMarkdown:
              "## Key idea\n\nStart each problem by stating the invariant before choosing an implementation.",
            updatedAt: "2026-08-11T12:00:00.000Z",
          },
          private: {
            id: "demo-private-foundations",
            visibility: "private",
            bodyMarkdown: "Rework problem set 1 before Friday.",
            updatedAt: "2026-08-11T12:00:00.000Z",
          },
        },
      },
      {
        id: "demo-unit-recursion",
        title: "Recursion",
        description: "Recursive decomposition and proof patterns.",
        displayOrder: 1,
        isHidden: false,
        notes: {},
      },
    ],
    hiddenUnits: [],
    materials: [
      {
        id: "demo-material-slides",
        title: "Week 1 slides",
        kind: "file",
        materialType: "slides",
        learningUnitId: "demo-unit-foundations",
        externalUrl: null,
        originalName: "week-1-slides.pptx",
        sizeBytes: 1_400_000,
        isHidden: false,
      },
      {
        id: "demo-material-link",
        title: "Reference reading",
        kind: "link",
        materialType: "link",
        learningUnitId: null,
        externalUrl: "https://example.edu/course/reading",
        originalName: null,
        sizeBytes: null,
        isHidden: false,
      },
    ],
  };
}

export async function getLearningWorkspace(
  viewer: Viewer,
  courseId: string,
): Promise<LearningWorkspaceData | null> {
  if (viewer.isDemo) return demoWorkspace(courseId);

  const supabase = await createClient();
  const [{ data: course }, { data: units }, { data: materials }, { data: publication }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id,code,title")
        .eq("id", courseId)
        .eq("owner_id", viewer.id)
        .maybeSingle(),
      supabase
        .from("learning_units")
        .select(
          "id,title,description,display_order,is_hidden,learning_unit_notes(id,visibility,body_markdown,updated_at)",
        )
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("display_order"),
      supabase
        .from("course_materials")
        .select(
          "id,title,kind,material_type,learning_unit_id,external_url,original_name,size_bytes,is_hidden",
        )
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("display_order"),
      supabase
        .from("community_publications")
        .select("published_at,snapshot_version")
        .eq("source_course_id", courseId)
        .eq("owner_id", viewer.id)
        .maybeSingle(),
    ]);
  if (!course) return null;

  const mappedUnits = (units ?? []).map(mapUnit);
  return {
    courseId: course.id,
    courseCode: course.code ?? "Course",
    courseTitle: course.title ?? "Untitled course",
    units: mappedUnits.filter((unit) => !unit.isHidden),
    hiddenUnits: mappedUnits.filter((unit) => unit.isHidden),
    materials: (materials ?? []).map(mapMaterial),
    publishedAt: publication?.published_at ?? null,
    publicationVersion: publication?.snapshot_version ?? null,
  };
}
