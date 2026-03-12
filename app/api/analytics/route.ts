import { NextResponse } from "next/server";

import { loadAnalyticsSnapshot } from "@/lib/analytics-repository";
import { createEmptyAnalyticsSnapshot } from "@/lib/analytics";
import { env } from "@/lib/env";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";

export async function GET() {
  const identity = await resolvePersistenceIdentity();

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json({
        snapshot: createEmptyAnalyticsSnapshot(),
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const snapshot = await loadAnalyticsSnapshot({
      authUserId: identity.authUserId,
      deviceId: identity.deviceId,
    });

    return withDeviceCookie(
      NextResponse.json({
        snapshot,
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json({
        snapshot: createEmptyAnalyticsSnapshot(),
        remoteEnabled: false,
      }),
      identity,
    );
  }
}

