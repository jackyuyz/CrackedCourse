import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import {
  demoCourses,
  demoGradeCategories,
  type AppCourse,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface GradeWorkspaceCategory {
  id: string;
  name: string;
  weightPercent: number;
  scorePercent: number | null;
}

export interface GradeWorkspaceData {
  course: Pick<
    AppCourse,
    "id" | "code" | "title" | "section" | "termName" | "color" | "status"
  >;
  categories: GradeWorkspaceCategory[];
  policyWarnings: string[];
}

function safeColor(value: string): AppCourse["color"] {
  return (
    ["ocean", "orange", "gold", "navy"].includes(value) ? value : "ocean"
  ) as AppCourse["color"];
}

export async function getGradeWorkspace(
  viewer: Viewer,
  courseId: string,
): Promise<GradeWorkspaceData | null> {
  if (viewer.isDemo) {
    const course =
      demoCourses.find((item) => item.id === courseId) ?? demoCourses[0];
    return {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        section: course.section,
        termName: course.termName,
        color: course.color,
        status: course.status,
      },
      categories: demoGradeCategories.map((category, categoryIndex) => ({
        id: `category-${categoryIndex}`,
        name: category.name,
        weightPercent: category.weightPercent,
        scorePercent: category.scorePercent,
      })),
      policyWarnings: [
        "The lowest written homework score is dropped. This calculator does not apply that rule yet.",
      ],
    };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id,code,title,section,term_name,color_key,status,grading_categories(id,name,weight_percent,student_score_percent,display_order,is_hidden),grading_policies(description,calculator_support,is_hidden)",
    )
    .eq("id", courseId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!course) return null;

  return {
    course: {
      id: course.id,
      code: course.code ?? "Course",
      title: course.title ?? "Untitled course",
      section: course.section,
      termName: course.term_name ?? "Current term",
      color: safeColor(course.color_key),
      status: course.status,
    },
    categories: (course.grading_categories ?? [])
      .filter((category) => !category.is_hidden)
      .sort((a, b) => a.display_order - b.display_order)
      .map((category) => ({
        id: category.id,
        name: category.name,
        weightPercent: Number(category.weight_percent),
        scorePercent:
          category.student_score_percent == null
            ? null
            : Number(category.student_score_percent),
      })),
    policyWarnings: (course.grading_policies ?? [])
      .filter((policy) => !policy.is_hidden)
      .filter((policy) => policy.calculator_support === "unsupported")
      .map((policy) => policy.description),
  };
}
