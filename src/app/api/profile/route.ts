import { revalidatePath } from "next/cache";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export async function PATCH(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to update your profile.",
      401,
    );
  }

  const parsed = updateProfileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_PROFILE",
      "Enter a display name between 1 and 80 characters.",
      400,
    );
  }

  const { data: profile, error } = await session.supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", session.userId)
    .select("display_name")
    .maybeSingle();

  if (error) {
    return errorResponse(
      "PROFILE_UPDATE_FAILED",
      "We couldn’t save your profile. Try again.",
      500,
    );
  }
  if (!profile) {
    return errorResponse("NOT_FOUND", "Profile not found.", 404);
  }

  revalidatePath("/(app)", "layout");
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return Response.json(
    { profile: { displayName: profile.display_name } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
