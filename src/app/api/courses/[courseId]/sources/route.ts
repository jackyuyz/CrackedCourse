import { createHash } from "node:crypto";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const sourceRegistrationSchema = z.object({
  storagePath: z.string().min(1).max(1_000),
  originalName: z.string().min(1).max(255),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

type RouteContext = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to register a syllabus.",
      401,
    );
  }

  const { courseId } = await params;
  const parsed = sourceRegistrationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      "The uploaded file metadata is invalid.",
      400,
    );
  }

  const input = parsed.data;
  const maxBytes = Number(process.env.MAX_SYLLABUS_SIZE_MB ?? 15) * 1024 * 1024;
  if (input.sizeBytes > maxBytes) {
    return errorResponse(
      "FILE_TOO_LARGE",
      "Choose a PDF smaller than the upload limit.",
      413,
    );
  }
  if (!input.originalName.toLocaleLowerCase("en-US").endsWith(".pdf")) {
    return errorResponse(
      "INVALID_FILE_TYPE",
      "Only PDF syllabi are supported.",
      415,
    );
  }

  const expectedPrefix = `${session.userId}/`;
  if (
    !input.storagePath.startsWith(expectedPrefix) ||
    input.storagePath.includes("..")
  ) {
    return errorResponse(
      "UNAUTHORIZED",
      "That storage path is not available.",
      403,
    );
  }

  const { data: course } = await session.supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!course) {
    return errorResponse("NOT_FOUND", "Course draft not found.", 404);
  }

  const { data: duplicate } = await session.supabase
    .from("syllabus_sources")
    .select("id,course_id,original_name,processing_status")
    .eq("owner_id", session.userId)
    .eq("sha256", input.sha256)
    .maybeSingle();

  if (duplicate) {
    await session.supabase.storage.from("syllabi").remove([input.storagePath]);
    return errorResponse(
      "DUPLICATE_SOURCE",
      "You already uploaded this syllabus. Reuse it or start a new extraction.",
      409,
      { duplicate },
    );
  }

  const { data: file, error: downloadError } = await session.supabase.storage
    .from("syllabi")
    .download(input.storagePath);

  if (downloadError || !file) {
    return errorResponse(
      "SOURCE_DOWNLOAD_FAILED",
      "We couldn’t verify the private upload.",
      400,
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const verifiedHash = createHash("sha256").update(bytes).digest("hex");
  const isPdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const valid =
    file.type === "application/pdf" &&
    bytes.length === input.sizeBytes &&
    bytes.length <= maxBytes &&
    verifiedHash === input.sha256 &&
    isPdf;

  if (!valid) {
    await session.supabase.storage.from("syllabi").remove([input.storagePath]);
    return errorResponse(
      "INVALID_FILE_TYPE",
      "The file could not be verified as a valid PDF.",
      415,
    );
  }

  const { data: source, error: insertError } = await session.supabase
    .from("syllabus_sources")
    .insert({
      course_id: courseId,
      owner_id: session.userId,
      source_type: "pdf",
      original_name: input.originalName,
      storage_path: input.storagePath,
      source_url: null,
      mime_type: input.mimeType,
      sha256: verifiedHash,
      size_bytes: bytes.length,
      processing_status: "uploaded",
    })
    .select("id,original_name,size_bytes,processing_status,created_at")
    .single();

  if (insertError || !source) {
    return errorResponse(
      "SOURCE_REGISTER_FAILED",
      "The PDF is safe, but we couldn’t register it. Try again.",
      500,
    );
  }

  return Response.json({ source }, { status: 201 });
}
