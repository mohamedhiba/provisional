import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  getCurrentMonthStart,
  normalizeMonthlyMissionState,
  type MonthlyMissionState,
} from "@/lib/monthly-mission";
import {
  loadPersistedMonthlyMission,
  savePersistedMonthlyMission,
} from "@/lib/monthly-mission-repository";
import { type OnboardingPersistenceSource, type OnboardingState } from "@/lib/onboarding";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";

type ApiResponse = {
  state: MonthlyMissionState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const monthStart = searchParams.get("monthStart") ?? getCurrentMonthStart();

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: null,
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const state = await loadPersistedMonthlyMission(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      monthStart,
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        source: state ? "supabase" : "none",
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: null,
        source: "local",
        remoteEnabled: false,
        message: "Supabase load failed. Falling back to local persistence.",
      }),
      identity,
    );
  }
}

export async function POST(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const body = (await request.json()) as {
    mission?: Partial<MonthlyMissionState>;
    profile?: Partial<OnboardingState>;
  };
  const monthStart = body.mission?.monthStart ?? getCurrentMonthStart();
  const state = normalizeMonthlyMissionState(body.mission, monthStart);

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const source = await savePersistedMonthlyMission(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      state,
      {
        name: body.profile?.name,
        tone: body.profile?.tone,
      },
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        source,
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        source: "local",
        remoteEnabled: false,
        message: "Supabase save failed. Local persistence is still active.",
      }),
      identity,
    );
  }
}

