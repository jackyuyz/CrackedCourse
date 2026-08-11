import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ courseId: string; materialId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to open course material.", 401);
  const { courseId, materialId } = await params;
  const { data: material } = await session.supabase
    .from("course_materials")
    .select("storage_path")
    .eq("id", materialId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .eq("kind", "file")
    .eq("is_hidden", false)
    .maybeSingle();
  if (!material?.storage_path) return errorResponse("NOT_FOUND", "Course material not found.", 404);
  const { data: signed, error } = await session.supabase.storage
    .from("course-materials")
    .createSignedUrl(material.storage_path, 60);
  if (error || !signed?.signedUrl) {
    return errorResponse("MATERIAL_LINK_FAILED", "We couldn’t open that material. Try again.", 500);
  }
  return Response.redirect(signed.signedUrl, 302);
}
