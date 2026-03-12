import { NextResponse } from "next/server";

import {
  normalizeFocusSession,
  normalizeFocusSessions,
  type FocusSession,
} from "@/lib/focus-session";
import {
  deletePersistedFocusSession,
  loadPersistedFocusSessions,
  upsertPersistedFocusSessions,
} from "@/lib/focus-session-repository";
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
  state: FocusSession[];
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

export async function GET(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const sessionDate = searchParams.get("date");

  if (!sessionDate) {
    return NextResponse.json({ message: "Missing date" }, { status: 400 });
  }

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: [],
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    const state = await loadPersistedFocusSessions(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      sessionDate,
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state,
        source: state.length > 0 ? "supabase" : "none",
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: [],
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
    session?: Partial<FocusSession>;
    sessions?: Array<Partial<FocusSession>>;
    profile?: Partial<OnboardingState>;
  };

  const sessionDate =
    body.session?.sessionDate ??
    body.sessions?.[0]?.sessionDate;

  if (!sessionDate) {
    return NextResponse.json({ message: "Missing session date" }, { status: 400 });
  }

  const state = body.sessions
    ? normalizeFocusSessions(body.sessions, sessionDate)
    : body.session
      ? [normalizeFocusSession(body.session, sessionDate)]
      : [];

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
    const source = await upsertPersistedFocusSessions(
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

export async function DELETE(request: Request) {
  const identity = await resolvePersistenceIdentity();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Missing session id" }, { status: 400 });
  }

  if (!env.hasSupabaseAdminEnv) {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: [],
        source: "local",
        remoteEnabled: false,
      }),
      identity,
    );
  }

  try {
    await deletePersistedFocusSession(
      {
        authUserId: identity.authUserId,
        deviceId: identity.deviceId,
      },
      id,
    );

    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: [],
        source: "supabase",
        remoteEnabled: true,
      }),
      identity,
    );
  } catch {
    return withDeviceCookie(
      NextResponse.json<ApiResponse>({
        state: [],
        source: "local",
        remoteEnabled: false,
        message: "Supabase delete failed. Local persistence is still active.",
      }),
      identity,
    );
  }
}
