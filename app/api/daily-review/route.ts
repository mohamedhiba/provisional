import { NextResponse } from "next/server";

import {
  getTodayIsoDate,
} from "@/lib/daily-plan";
import {
  normalizeDailyReviewState,
  type DailyReviewState,
} from "@/lib/daily-review";
import {
  loadPersistedDailyReview,
  savePersistedDailyReview,
} from "@/lib/daily-review-repository";
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
  state: DailyReviewState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const reviewDate = searchParams.get("date") ?? getTodayIsoDate();

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
    const state = await loadPersistedDailyReview(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      reviewDate,
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
    review?: Partial<DailyReviewState>;
    profile?: Partial<OnboardingState>;
  };
  const reviewDate = body.review?.reviewDate ?? getTodayIsoDate();
  const state = normalizeDailyReviewState(body.review, reviewDate);

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
    const source = await savePersistedDailyReview(
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
