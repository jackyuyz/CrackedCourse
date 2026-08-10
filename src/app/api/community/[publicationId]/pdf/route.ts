import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ publicationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to view this PDF.", 401);
  }

  const { publicationId } = await params;
  const { data: publication, error } = await session.supabase
    .from("community_publications")
    .select("source_storage_path")
    .eq("id", publicationId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error || !publication) {
    return errorResponse("NOT_FOUND", "Published syllabus not found.", 404);
  }

  const { data: signed, error: signedError } = await session.supabase.storage
    .from("syllabi")
    .createSignedUrl(publication.source_storage_path, 60);
  if (signedError || !signed?.signedUrl) {
    return errorResponse(
      "PDF_LINK_FAILED",
      "We couldn’t open this PDF. Try again.",
      500,
    );
  }

  return Response.redirect(signed.signedUrl, 302);
}
