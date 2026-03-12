import { NextResponse } from "next/server";

import {
  getTodayIsoDate,
  normalizeDailyPlanState,
  type DailyPlanState,
} from "@/lib/daily-plan";
import {
  loadPersistedDailyPlan,
  savePersistedDailyPlan,
} from "@/lib/daily-plan-repository";
import { env } from "@/lib/env";
import {
  type OnboardingPersistenceSource,
  type OnboardingState,
} from "@/lib/onboarding";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";

type ApiResponse = {
  state: DailyPlanState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const planDate = searchParams.get("date") ?? getTodayIsoDate();

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
    const state = await loadPersistedDailyPlan(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      planDate,
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
    plan?: Partial<DailyPlanState>;
    profile?: Partial<OnboardingState>;
  };
  const seedDate = body.plan?.planDate ?? getTodayIsoDate();
  const state = normalizeDailyPlanState(body.plan, seedDate);

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
    const source = await savePersistedDailyPlan(
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
