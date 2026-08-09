import "server-only";

import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  isDemo: boolean;
}

export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode()) {
    return {
      id: "00000000-0000-4000-8000-000000000001",
      email: "maya@example.edu",
      displayName: "Maya",
      isDemo: true,
    };
  }

  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

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
    .select("display_name")
    .eq("id", data.claims.sub)
    .maybeSingle();
  const displayName = profile?.display_name?.trim() || metadataDisplayName;

  return {
    id: data.claims.sub,
    email,
    displayName,
    isDemo: false,
  };
}
