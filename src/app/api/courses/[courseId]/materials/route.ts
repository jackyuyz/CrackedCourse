import { Buffer } from "node:buffer";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import {
  materialFileRegistrationSchema,
  materialLinkInputSchema,
  materialTypeForMimeType,
} from "@/lib/learning-units";

const materialCreateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("link"), ...materialLinkInputSchema.shape }),
  z.object({ kind: z.literal("file"), ...materialFileRegistrationSchema.shape }),
]);

type RouteContext = { params: Promise<{ courseId: string }> };

function validFileSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "application/pdf") {
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "application/vnd.ms-powerpoint") {
    return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

async function ownedUnit(
  session: Awaited<ReturnType<typeof getApiSession>> & {},
  courseId: string,
  unitId: string | null,
) {
  if (!unitId) return true;
  const { data } = await session.supabase
    .from("learning_units")
    .select("id")
    .eq("id", unitId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to add course material.", 401);
  const parsed = materialCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return errorResponse("INVALID_REQUEST", "That material is invalid.", 400);
  const { courseId } = await params;
  const { data: course } = await session.supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!course) return errorResponse("NOT_FOUND", "Course not found.", 404);
  if (!(await ownedUnit(session, courseId, parsed.data.learningUnitId))) {
    return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  }

  const { data: latest } = await session.supabase
    .from("course_materials")
    .select("display_order")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = (latest?.display_order ?? -1) + 1;

  if (parsed.data.kind === "link") {
    const { data: material, error } = await session.supabase
      .from("course_materials")
      .insert({
        course_id: courseId,
        owner_id: session.userId,
        learning_unit_id: parsed.data.learningUnitId,
        title: parsed.data.title,
        kind: "link",
        material_type: "link",
        external_url: parsed.data.externalUrl,
        display_order: displayOrder,
      })
      .select("id,title,kind,material_type,learning_unit_id,external_url,original_name,size_bytes,is_hidden")
      .single();
    if (error || !material) return errorResponse("CREATE_FAILED", "We couldn’t add that link. Try again.", 500);
    return Response.json({ material }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }

  const expectedPrefix = `${session.userId}/`;
  if (
    !parsed.data.storagePath.startsWith(expectedPrefix) ||
    parsed.data.storagePath.includes("..")
  ) {
    return errorResponse("UNAUTHORIZED", "That upload path is not available.", 403);
  }
  const { data: file, error: downloadError } = await session.supabase.storage
    .from("course-materials")
    .download(parsed.data.storagePath);
  if (downloadError || !file) {
    return errorResponse("FILE_NOT_FOUND", "We couldn’t verify that upload. Try again.", 400);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = parsed.data.originalName.toLowerCase().split(".").pop();
  const allowedExtension =
    (parsed.data.mimeType === "application/pdf" && extension === "pdf") ||
    (parsed.data.mimeType === "application/vnd.ms-powerpoint" && extension === "ppt") ||
    (parsed.data.mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" &&
      extension === "pptx");
  if (
    bytes.length !== parsed.data.sizeBytes ||
    bytes.length > 20 * 1024 * 1024 ||
    file.type !== parsed.data.mimeType ||
    !allowedExtension ||
    !validFileSignature(parsed.data.mimeType, bytes)
  ) {
    await session.supabase.storage.from("course-materials").remove([parsed.data.storagePath]);
    return errorResponse("INVALID_FILE_TYPE", "The material could not be verified as a PDF or slide deck.", 415);
  }
  const { data: material, error } = await session.supabase
    .from("course_materials")
    .insert({
      course_id: courseId,
      owner_id: session.userId,
      learning_unit_id: parsed.data.learningUnitId,
      title: parsed.data.title,
      kind: "file",
      material_type: materialTypeForMimeType(parsed.data.mimeType),
      storage_path: parsed.data.storagePath,
      original_name: parsed.data.originalName,
      mime_type: parsed.data.mimeType,
      size_bytes: bytes.length,
      display_order: displayOrder,
    })
    .select("id,title,kind,material_type,learning_unit_id,external_url,original_name,size_bytes,is_hidden")
    .single();
  if (error || !material) {
    await session.supabase.storage
      .from("course-materials")
      .remove([parsed.data.storagePath]);
    return errorResponse("CREATE_FAILED", "The file is safe, but we couldn’t save its material record. Try again.", 500);
  }
  return Response.json({ material }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
