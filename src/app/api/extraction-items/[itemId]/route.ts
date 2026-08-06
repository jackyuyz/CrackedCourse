import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { reviewPayloadSchemas, type ReviewItemType } from "@/lib/review/schema";

const patchSchema = z.object({
  reviewStatus: z.enum(["pending", "confirmed", "edited", "rejected"]),
  currentPayload: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session)
    return errorResponse("UNAUTHORIZED", "Sign in to review this item.", 401);

  const { itemId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      "That review decision is invalid.",
      400,
    );
  }

  const { data: item } = await session.supabase
    .from("extraction_items")
    .select("id,item_type,current_payload")
    .eq("id", itemId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!item) return errorResponse("NOT_FOUND", "Review item not found.", 404);

  const itemType = item.item_type as ReviewItemType;
  const payload = parsed.data.currentPayload ?? item.current_payload;
  const validatedPayload = reviewPayloadSchemas[itemType].safeParse(payload);
  if (!validatedPayload.success) {
    return errorResponse(
      "INVALID_REVIEW_ITEM",
      "Check the edited values and try again.",
      400,
    );
  }

  const { data: updated, error } = await session.supabase
    .from("extraction_items")
    .update({
      current_payload: validatedPayload.data,
      review_status: parsed.data.reviewStatus,
      reviewed_at:
        parsed.data.reviewStatus === "pending"
          ? null
          : new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("owner_id", session.userId)
    .select("id,current_payload,review_status,reviewed_at")
    .single();

  if (error || !updated) {
    return errorResponse(
      "REVIEW_SAVE_FAILED",
      "Your decision wasn’t saved. Try again.",
      500,
    );
  }

  return Response.json({ item: updated });
}
