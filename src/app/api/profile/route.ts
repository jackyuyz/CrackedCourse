import { revalidatePath } from "next/cache";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  defaultInstitutionId: z.uuid().nullable().optional(),
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

  if (parsed.data.defaultInstitutionId) {
    const { data: institution, error: institutionError } =
      await session.supabase
        .from("institutions")
        .select("id")
        .eq("id", parsed.data.defaultInstitutionId)
        .eq("is_active", true)
        .maybeSingle();

    if (institutionError || !institution) {
      return errorResponse(
        "INVALID_INSTITUTION",
        "Choose a school from the U.S. or Canadian directory.",
        400,
      );
    }
  }

  const { data: profile, error } = await session.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      ...(parsed.data.defaultInstitutionId !== undefined
        ? { default_institution_id: parsed.data.defaultInstitutionId }
        : {}),
    })
    .eq("id", session.userId)
    .select("display_name,default_institution_id")
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
    {
      profile: {
        displayName: profile.display_name,
        defaultInstitutionId: profile.default_institution_id,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
