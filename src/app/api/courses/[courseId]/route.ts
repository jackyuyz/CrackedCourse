import { revalidatePath } from "next/cache";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to delete a course.", 401);
  }

  const { courseId } = await params;
  const { data: sources, error: sourceError } = await session.supabase
    .from("syllabus_sources")
    .select("storage_path")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId);

  if (sourceError) {
    return errorResponse(
      "COURSE_DELETE_FAILED",
      "We couldn’t prepare this course for deletion. Try again.",
      500,
    );
  }

  const { data: deletedCourse, error: deleteError } = await session.supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return errorResponse(
      "COURSE_DELETE_FAILED",
      "We couldn’t delete this course. Try again.",
      500,
    );
  }

  revalidatePath("/(app)", "layout");

  if (!deletedCourse) {
    return Response.json(
      { courseId, deleted: false, alreadyMissing: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const storagePaths = (sources ?? [])
    .map((source) => source.storage_path)
    .filter((path): path is string => Boolean(path));
  let storageCleanupPending = false;

  for (const storagePath of storagePaths) {
    const { error } = await session.supabase.storage
      .from("syllabi")
      .remove([storagePath]);
    if (error) storageCleanupPending = true;
  }

  return Response.json(
    {
      courseId,
      deleted: true,
      storageCleanupPending,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
