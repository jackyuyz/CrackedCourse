import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const reportSchema = z.object({
  reason: z.enum([
    "copyright",
    "personal_information",
    "incorrect",
    "spam",
    "other",
  ]),
  details: z.string().trim().max(1000).nullable().optional(),
});

type RouteContext = { params: Promise<{ publicationId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to report a course.", 401);
  }
  const parsed = reportSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse("INVALID_REPORT", "Choose a report reason.", 400);
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
      "SELF_REPORT_NOT_ALLOWED",
      "Use your course settings to unpublish your own course.",
      409,
    );
  }

  const { error } = await session.supabase.from("community_reports").insert({
    publication_id: publicationId,
    reporter_id: session.userId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error?.code === "23505") {
    return errorResponse(
      "ALREADY_REPORTED",
      "You already reported this publication.",
      409,
    );
  }
  if (error) {
    return errorResponse(
      "REPORT_FAILED",
      "We couldn’t submit this report. Try again.",
      500,
    );
  }

  return Response.json(
    { reported: true },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
