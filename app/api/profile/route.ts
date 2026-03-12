import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  normalizeOnboardingState,
  type OnboardingPersistenceSource,
  type OnboardingState,
} from "@/lib/onboarding";
import {
  loadPersistedOnboardingState,
  savePersistedOnboardingState,
} from "@/lib/profile-repository";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";

type ApiResponse = {
  state: OnboardingState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET() {
  const identity = await resolvePersistenceIdentity();

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
    const state = await loadPersistedOnboardingState({
      authUserId: identity.authUserId,
      deviceId: identity.deviceId,
    });

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
      NextResponse.json<ApiResponse>(
        {
          state: null,
          source: "local",
          remoteEnabled: false,
          message: "Supabase load failed. Falling back to local persistence.",
        },
        { status: 200 },
      ),
      identity,
    );
  }
}

export async function POST(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const body = (await request.json()) as Partial<OnboardingState>;
  const state = normalizeOnboardingState(body);

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
    const source = await savePersistedOnboardingState(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      state,
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
      NextResponse.json<ApiResponse>(
        {
          state,
          source: "local",
          remoteEnabled: false,
          message: "Supabase save failed. Local persistence is still active.",
        },
        { status: 200 },
      ),
      identity,
    );
  }
}
