import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { onboardingDeviceCookieKey } from "@/lib/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResolvedPersistenceIdentity = {
  authUserId: string | null;
  deviceId: string | null;
  needsDeviceCookie: boolean;
};

export async function resolvePersistenceIdentity() {
  const cookieStore = await cookies();
  const existingDeviceId = cookieStore.get(onboardingDeviceCookieKey)?.value ?? null;
  const resolvedDeviceId = existingDeviceId ?? crypto.randomUUID();

  if (env.hasSupabaseClientEnv) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return {
          authUserId: user.id,
          deviceId: resolvedDeviceId,
          needsDeviceCookie: !existingDeviceId,
        } satisfies ResolvedPersistenceIdentity;
      }
    } catch {
      // Fall back to device persistence when auth is not active.
    }
  }

  return {
    authUserId: null,
    deviceId: resolvedDeviceId,
    needsDeviceCookie: !existingDeviceId,
  } satisfies ResolvedPersistenceIdentity;
}

export function withDeviceCookie<T>(
  response: NextResponse<T>,
  identity: ResolvedPersistenceIdentity,
) {
  if (!identity.deviceId || !identity.needsDeviceCookie) {
    return response;
  }

  response.cookies.set({
    name: onboardingDeviceCookieKey,
    value: identity.deviceId,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
