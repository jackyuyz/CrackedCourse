import { revalidatePath } from "next/cache";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ publicationId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to endorse a course.", 401);
  }
  const { publicationId } = await params;
  const { data: publication } = await session.supabase
    .from("community_publications")
    .select("owner_id")
    .eq("id", publicationId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (!publication) {
    return errorResponse("NOT_FOUND", "Published course not found.", 404);
  }
  if (publication.owner_id === session.userId) {
    return errorResponse(
      "SELF_ENDORSEMENT_NOT_ALLOWED",
      "Contributors cannot endorse their own publication.",
      409,
    );
  }

  const { data: existing } = await session.supabase
    .from("community_endorsements")
    .select("publication_id")
    .eq("publication_id", publicationId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing) {
    const { error } = await session.supabase
      .from("community_endorsements")
      .delete()
      .eq("publication_id", publicationId)
      .eq("user_id", session.userId);
    if (error) {
      return errorResponse(
        "ENDORSEMENT_FAILED",
        "We couldn’t update your endorsement. Try again.",
        500,
      );
    }
  } else {
    const { error } = await session.supabase
      .from("community_endorsements")
      .insert({ publication_id: publicationId, user_id: session.userId });
    if (error) {
      return errorResponse(
        "ENDORSEMENT_FAILED",
        "We couldn’t save your endorsement. Try again.",
        500,
      );
    }
  }

  revalidatePath("/community");
  revalidatePath(`/community/${publicationId}`);
  return Response.json(
    { endorsed: !existing },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
