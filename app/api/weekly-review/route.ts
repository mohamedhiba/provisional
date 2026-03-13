import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { type OnboardingPersistenceSource, type OnboardingState } from "@/lib/onboarding";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";
import {
  createEmptyWeeklySummary,
  getCurrentWeekStart,
  normalizeWeeklyReviewState,
  type WeeklyReviewState,
  type WeeklyReviewSummary,
} from "@/lib/weekly-review";
import {
  loadPersistedWeeklyReviewSnapshot,
  savePersistedWeeklyReview,
} from "@/lib/weekly-review-repository";

type ApiResponse = {
  state: WeeklyReviewState | null;
  summary: WeeklyReviewSummary;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const referenceDate = searchParams.get("date") ?? undefined;
  const weekStart = searchParams.get("weekStart") ?? getCurrentWeekStart(referenceDate);

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: null,
        summary: createEmptyWeeklySummary(weekStart),
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const snapshot = await loadPersistedWeeklyReviewSnapshot(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      weekStart,
      referenceDate,
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: snapshot.review,
        summary: snapshot.summary,
        source: snapshot.review ? "supabase" : "none",
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: null,
        summary: createEmptyWeeklySummary(weekStart),
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
    review?: Partial<WeeklyReviewState>;
    profile?: Partial<OnboardingState>;
    referenceDate?: string;
  };
  const referenceDate = body.referenceDate;
  const weekStart = body.review?.weekStart ?? getCurrentWeekStart(referenceDate);
  const state = normalizeWeeklyReviewState(body.review, weekStart);

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        summary: createEmptyWeeklySummary(weekStart),
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const source = await savePersistedWeeklyReview(
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
    const snapshot = await loadPersistedWeeklyReviewSnapshot(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      weekStart,
      referenceDate,
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        summary: snapshot.summary,
        source,
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        summary: createEmptyWeeklySummary(weekStart),
        source: "local",
        remoteEnabled: false,
        message: "Supabase save failed. Local persistence is still active.",
      }),
      identity,
    );
  }
}
