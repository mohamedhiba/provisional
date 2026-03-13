import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { onboardingDeviceCookieKey } from "@/lib/onboarding";
import { attachAuthenticatedProfile } from "@/lib/profile-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/today";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, request.url);

  if (!code) {
    redirectUrl.searchParams.set("auth", "error");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      redirectUrl.searchParams.set("auth", "error");
      return NextResponse.redirect(redirectUrl);
    }

    const cookieStore = await cookies();
    const deviceId = cookieStore.get(onboardingDeviceCookieKey)?.value ?? null;

    await attachAuthenticatedProfile({
      authUserId: data.user.id,
      deviceId,
    });

    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("auth", "error");
    return NextResponse.redirect(redirectUrl);
  }
}
