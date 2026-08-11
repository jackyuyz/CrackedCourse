import "server-only";

import { cache } from "react";

import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import type { InstitutionOption } from "@/lib/institutions";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  defaultInstitution: InstitutionOption | null;
  isDemo: boolean;
}

export type ViewerState =
  | { kind: "authenticated"; viewer: Viewer }
  | { kind: "unauthenticated" }
  | { kind: "rate_limited" };

function isRateLimitedAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; code?: unknown };
  return (
    candidate.status === 429 || candidate.code === "over_request_rate_limit"
  );
}

export const getViewerState = cache(async (): Promise<ViewerState> => {
  if (isDemoMode()) {
    return {
      kind: "authenticated",
      viewer: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "maya@example.edu",
        displayName: "Maya",
        defaultInstitution: {
          id: "00000000-0000-4000-8000-000000000100",
          name: "Carnegie Mellon University",
          city: "Pittsburgh",
          region: "PA",
          country: "US",
          timeZone: "America/New_York",
        },
        isDemo: true,
      },
    };
  }

  if (!hasSupabaseEnv()) return { kind: "unauthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    return isRateLimitedAuthError(error)
      ? { kind: "rate_limited" }
      : { kind: "unauthenticated" };
  }
  if (!data?.claims?.sub) return { kind: "unauthenticated" };

  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const metadataDisplayName =
    typeof data.claims.user_metadata === "object" &&
    data.claims.user_metadata &&
    "display_name" in data.claims.user_metadata &&
    typeof data.claims.user_metadata.display_name === "string"
      ? data.claims.user_metadata.display_name
      : email.split("@")[0] || "Student";
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name,institutions:default_institution_id(id,canonical_name,city,region_code,country_code,default_time_zone)",
    )
    .eq("id", data.claims.sub)
    .maybeSingle();
  const displayName = profile?.display_name?.trim() || metadataDisplayName;
  const institution = Array.isArray(profile?.institutions)
    ? profile.institutions[0]
    : profile?.institutions;

  return {
    kind: "authenticated",
    viewer: {
      id: data.claims.sub,
      email,
      displayName,
      defaultInstitution: institution
        ? {
            id: institution.id,
            name: institution.canonical_name,
            city: institution.city,
            region: institution.region_code,
            country: institution.country_code as "US" | "CA",
            timeZone: institution.default_time_zone,
          }
        : null,
      isDemo: false,
    },
  };
});

export async function getViewer(): Promise<Viewer | null> {
  const state = await getViewerState();
  return state.kind === "authenticated" ? state.viewer : null;
}
