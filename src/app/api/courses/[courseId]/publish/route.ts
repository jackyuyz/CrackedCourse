import { revalidatePath } from "next/cache";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session)
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to publish this course.",
      401,
    );

  const { courseId } = await params;
  const { error } = await session.supabase.rpc("publish_course", {
    p_course_id: courseId,
  });

  if (error) {
    console.error("Course publish failed", {
      courseId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const stableCodes = [
      "COURSE_NOT_FOUND",
      "REVIEW_INCOMPLETE",
      "INVALID_GRADING_WEIGHTS",
      "COURSE_DETAILS_REQUIRED",
    ];
    const code = error.message.includes("calendar_events_timed_range_check")
      ? "INVALID_EVENT_RANGE"
      : stableCodes.find((candidate) => error.message.includes(candidate));
    return errorResponse(
      code ?? "COURSE_PUBLISH_FAILED",
      code === "REVIEW_INCOMPLETE"
        ? "Resolve every pending item before creating the workspace."
        : code === "INVALID_GRADING_WEIGHTS"
          ? "Grading weights must total approximately 100%."
          : code === "COURSE_DETAILS_REQUIRED"
            ? "Add a course code and title before publishing."
            : code === "INVALID_EVENT_RANGE"
              ? "One reviewed event ends before it starts. Correct its time and try again."
            : "We couldn’t create the course workspace. Try again.",
      code === "COURSE_NOT_FOUND" ? 404 : 422,
    );
  }

  revalidatePath("/(app)", "layout");

  return Response.json({ courseId, status: "active" });
}
