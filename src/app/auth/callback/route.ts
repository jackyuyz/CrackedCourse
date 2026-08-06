import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { parseEmailOtpType, safeAuthRedirect } from "@/lib/auth/callback";
import { getPublicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = parseEmailOtpType(requestUrl.searchParams.get("type"));
  const providerError = requestUrl.searchParams.get("error_code");
  const next = safeAuthRedirect(requestUrl.searchParams.get("next"));

  if (providerError) return authFailure(requestUrl, providerError, next);

  const successResponse = NextResponse.redirect(
    new URL(next, requestUrl.origin),
    { status: 303 },
  );
  successResponse.headers.set("Cache-Control", "private, no-store");

  const env = getPublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options),
          );
          Object.entries(headersToSet).forEach(([name, value]) =>
            successResponse.headers.set(name, value),
          );
        },
      },
    },
  );

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && otpType
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      : null;

  if (!result) return authFailure(requestUrl, "missing_code", next);
  if (result.error)
    return authFailure(
      requestUrl,
      result.error.code ?? "exchange_failed",
      next,
    );

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return authFailure(requestUrl, "session_missing", next);
  }

  return successResponse;
}

function authFailure(requestUrl: URL, code: string, next: string) {
  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("authError", code || "link");
  errorUrl.searchParams.set("next", next);
  const response = NextResponse.redirect(errorUrl, { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
