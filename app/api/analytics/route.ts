import { NextResponse } from "next/server";

import { loadAnalyticsSnapshot } from "@/lib/analytics-repository";
import { createEmptyAnalyticsSnapshot } from "@/lib/analytics";
import { env } from "@/lib/env";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";
import { getTodayIsoDate } from "@/lib/daily-plan";

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const referenceDate = searchParams.get("date") ?? getTodayIsoDate();
  const weekStart = searchParams.get("weekStart") ?? undefined;

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json({
        snapshot: createEmptyAnalyticsSnapshot(referenceDate, weekStart),
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const snapshot = await loadAnalyticsSnapshot({
      authUserId: identity.authUserId,
      deviceId: identity.deviceId,
    }, referenceDate, weekStart);

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
        snapshot: createEmptyAnalyticsSnapshot(referenceDate, weekStart),
        remoteEnabled: false,
      }),
      identity,
    );
  }
}
