import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const searchSchema = z.object({
  q: z.string().trim().min(2).max(80),
});

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to search schools.", 401);
  }

  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: url.searchParams.get("q") });
  if (!parsed.success) {
    return Response.json(
      { institutions: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const query = escapeLikePattern(parsed.data.q.toLocaleLowerCase("en-US"));
  const { data, error } = await session.supabase
    .from("institutions")
    .select(
      "id,canonical_name,city,region_code,country_code,default_time_zone",
    )
    .eq("is_active", true)
    .ilike("search_text", `%${query}%`)
    .order("canonical_name")
    .limit(12);

  if (error) {
    return errorResponse(
      "INSTITUTION_SEARCH_FAILED",
      "We couldn’t search schools. Try again.",
      500,
    );
  }

  return Response.json(
    {
      institutions: (data ?? []).map((institution) => ({
        id: institution.id,
        name: institution.canonical_name,
        city: institution.city,
        region: institution.region_code,
        country: institution.country_code,
        timeZone: institution.default_time_zone,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
