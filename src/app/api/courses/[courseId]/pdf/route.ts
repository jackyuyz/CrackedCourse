import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to view this PDF.", 401);
  }

  const sourceId = new URL(request.url).searchParams.get("sourceId");
  if (!sourceId) {
    return errorResponse("SOURCE_REQUIRED", "Choose a syllabus to preview.", 400);
  }

  const { courseId } = await params;
  const { data: source, error } = await session.supabase
    .from("syllabus_sources")
    .select("storage_path")
    .eq("id", sourceId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (error || !source?.storage_path) {
    return errorResponse("NOT_FOUND", "Saved syllabus not found.", 404);
  }

  const { data: signed, error: signedError } = await session.supabase.storage
    .from("syllabi")
    .createSignedUrl(source.storage_path, 60);
  if (signedError || !signed?.signedUrl) {
    return errorResponse(
      "PDF_LINK_FAILED",
      "We couldn’t open this PDF. Try again.",
      500,
    );
  }

  return Response.redirect(signed.signedUrl, 302);
}
