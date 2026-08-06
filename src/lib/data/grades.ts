import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import { demoCourses, demoGradeCategories } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface GradeWorkspaceAssessment {
  id: string;
  name: string;
  earnedPoints: number | null;
  maxPoints: number | null;
  expectedPercent: number | null;
  status: "planned" | "graded" | "excused";
}

export interface GradeWorkspaceCategory {
  id: string;
  name: string;
  weightPercent: number;
  isComplete: boolean;
  assessments: GradeWorkspaceAssessment[];
}

export interface GradeWorkspaceData {
  course: { id: string; code: string; title: string; termName: string };
  categories: GradeWorkspaceCategory[];
  policyWarnings: string[];
}

export async function getGradeWorkspace(
  viewer: Viewer,
  courseId: string,
): Promise<GradeWorkspaceData | null> {
  if (viewer.isDemo) {
    const course =
      demoCourses.find((item) => item.id === courseId) ?? demoCourses[0];
    const names = [
      [
        "Written Homework 1",
        "Written Homework 2",
        "Written Homework 3",
        "Written Homework 4",
      ],
      [
        "Programming Assignment 1",
        "Programming Assignment 2",
        "Programming Assignment 3",
      ],
      ["Midterm 1", "Midterm 2"],
      [],
    ];
    return {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        termName: course.termName,
      },
      categories: demoGradeCategories.map((category, categoryIndex) => ({
        id: `category-${categoryIndex}`,
        name: category.name,
        weightPercent: category.weightPercent,
        isComplete: category.isComplete,
        assessments: category.assessments.map(
          (assessment, assessmentIndex) => ({
            id: `assessment-${categoryIndex}-${assessmentIndex}`,
            name:
              names[categoryIndex]?.[assessmentIndex] ??
              `Assessment ${assessmentIndex + 1}`,
            earnedPoints: assessment.earnedPoints,
            maxPoints: assessment.maxPoints,
            expectedPercent: assessment.expectedPercent ?? null,
            status: assessment.status,
          }),
        ),
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
      "id,code,title,term_name,grading_categories(id,name,weight_percent,is_complete,display_order,assessments(id,name,earned_points,max_points,expected_percent,status,display_order)),grading_policies(description,calculator_support)",
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
      termName: course.term_name ?? "Current term",
    },
    categories: (course.grading_categories ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((category) => ({
        id: category.id,
        name: category.name,
        weightPercent: Number(category.weight_percent),
        isComplete: category.is_complete,
        assessments: (category.assessments ?? [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((assessment) => ({
            id: assessment.id,
            name: assessment.name,
            earnedPoints:
              assessment.earned_points == null
                ? null
                : Number(assessment.earned_points),
            maxPoints:
              assessment.max_points == null
                ? null
                : Number(assessment.max_points),
            expectedPercent:
              assessment.expected_percent == null
                ? null
                : Number(assessment.expected_percent),
            status: assessment.status,
          })),
      })),
    policyWarnings: (course.grading_policies ?? [])
      .filter((policy) => policy.calculator_support === "unsupported")
      .map((policy) => policy.description),
  };
}
