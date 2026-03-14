import "server-only";

import {
  normalizeOnboardingState,
  normalizeWeekStartPreference,
  type OnboardingPersistenceSource,
  type OnboardingState,
} from "@/lib/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTimeZone } from "@/lib/time-zone";

export type PersistenceIdentity = {
  authUserId: string | null;
  deviceId: string | null;
};

type StoredProfileRow = {
  id: string;
  auth_user_id: string | null;
  device_id: string | null;
  name: string;
  mission: string | null;
  long_term_goal: string | null;
  time_zone: string | null;
  week_starts_on: string | null;
  non_negotiables: string | null;
  default_first_move: string | null;
  tone: string | null;
};

type ProfileRow = Pick<
  StoredProfileRow,
  | "id"
  | "name"
  | "mission"
  | "long_term_goal"
  | "time_zone"
  | "week_starts_on"
  | "non_negotiables"
  | "default_first_move"
  | "tone"
>;

type PillarRow = {
  id: string;
  name: string;
  position: number | null;
};

type WeeklyTargetRow = {
  id: string;
  pillar_id: string | null;
  label: string;
  target_number: number;
  target_unit: string;
  position: number | null;
};

type DailyPlanTransferRow = {
  id: string;
  plan_date: string;
  one_thing: string;
  one_thing_done: boolean | null;
  top_three: unknown;
  day_score: number | null;
  status: string | null;
  created_at: string;
};

type DailyReviewTransferRow = {
  id: string;
  review_date: string;
  finished_text: string | null;
  avoided_text: string | null;
  why_avoided_text: string | null;
  wasted_time_text: string | null;
  tomorrow_first_move: string | null;
  self_rating: number | null;
  created_at: string;
};

type WeeklyReviewTransferRow = {
  id: string;
  week_start: string;
  wins: string | null;
  failures: string | null;
  patterns: string | null;
  next_week_focus: string | null;
  created_at: string;
};

type MonthlyMissionTransferRow = {
  id: string;
  month_start: string;
  focus_theme: string;
  primary_mission: string | null;
  why_this_matters: string | null;
  must_protect: string | null;
  must_ignore: string | null;
  current_week_focus: string | null;
  targets: unknown;
  created_at: string;
};

type FocusSessionTransferRow = {
  id: string;
  session_date: string;
  task_title: string;
  planned_minutes: number;
  actual_minutes: number | null;
  quality_rating: number | null;
  work_depth: string | null;
  preload_minutes: number | null;
  recovery_minutes: number | null;
  focus_mode: string | null;
  activation_label: string | null;
  environment_label: string | null;
  recovery_label: string | null;
  distraction_count: number | null;
  session_status: string | null;
  closure_notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  pillar_id: string | null;
};

const profileSelectColumns =
  "id, auth_user_id, device_id, name, mission, long_term_goal, time_zone, week_starts_on, non_negotiables, default_first_move, tone";

function toPublicProfile(profile: StoredProfileRow | null): ProfileRow | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    mission: profile.mission,
    long_term_goal: profile.long_term_goal,
    time_zone: profile.time_zone,
    week_starts_on: profile.week_starts_on,
    non_negotiables: profile.non_negotiables,
    default_first_move: profile.default_first_move,
    tone: profile.tone,
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function selectPreferredText(primary: string | null, fallback: string | null) {
  const primaryText = normalizeText(primary);

  if (primaryText) {
    return primaryText;
  }

  return normalizeText(fallback);
}

function selectPreferredName(primary: string | null, fallback: string | null) {
  const primaryText = normalizeText(primary);

  if (primaryText && primaryText !== "Proof User") {
    return primaryText;
  }

  const fallbackText = normalizeText(fallback);

  if (fallbackText) {
    return fallbackText;
  }

  return primaryText || "Proof User";
}

function selectPreferredTone(
  primary: StoredProfileRow["tone"],
  fallback: StoredProfileRow["tone"],
): OnboardingState["tone"] {
  const validTones = new Set<OnboardingState["tone"]>([
    "Honest",
    "Strict",
    "Supportive",
  ]);

  if (primary && validTones.has(primary as OnboardingState["tone"])) {
    return primary as OnboardingState["tone"];
  }

  if (fallback && validTones.has(fallback as OnboardingState["tone"])) {
    return fallback as OnboardingState["tone"];
  }

  return "Honest";
}

function selectPreferredTimeZone(
  primary: StoredProfileRow["time_zone"],
  fallback: StoredProfileRow["time_zone"],
) {
  return normalizeTimeZone(primary) || normalizeTimeZone(fallback) || null;
}

function selectPreferredWeekStart(
  primary: StoredProfileRow["week_starts_on"],
  fallback: StoredProfileRow["week_starts_on"],
) {
  if (primary?.trim()) {
    return normalizeWeekStartPreference(primary);
  }

  return normalizeWeekStartPreference(fallback);
}

function mergePillarNames(primary: PillarRow[], fallback: PillarRow[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const pillar of [...primary, ...fallback]) {
    const name = pillar.name.trim();

    if (!name) {
      continue;
    }

    const key = name.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(name);
  }

  return merged;
}

function mapWeeklyTargets(
  rows: WeeklyTargetRow[],
  pillarMap: Map<string, string>,
): OnboardingState["weeklyTargets"] {
  return rows.map((target, index) => ({
    id: target.id || `target-${index}`,
    pillar: target.pillar_id ? (pillarMap.get(target.pillar_id) ?? "") : "",
    label: target.label,
    targetNumber: String(target.target_number),
    targetUnit: target.target_unit,
  }));
}

function mergeWeeklyTargets(
  primary: OnboardingState["weeklyTargets"],
  fallback: OnboardingState["weeklyTargets"],
) {
  const seen = new Set<string>();
  const merged: OnboardingState["weeklyTargets"] = [];

  for (const target of [...primary, ...fallback]) {
    const key = [
      target.pillar.trim().toLowerCase(),
      target.label.trim().toLowerCase(),
      target.targetUnit.trim().toLowerCase(),
    ].join("::");

    if (!target.label.trim() || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(target);
  }

  return merged;
}

async function findStoredProfileByAuthUserId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelectColumns)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as StoredProfileRow | null) ?? null;
}

async function findStoredProfileByDeviceId(deviceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelectColumns)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as StoredProfileRow | null) ?? null;
}

async function resolveStoredProfileByIdentity(identity: PersistenceIdentity) {
  if (identity.authUserId) {
    const authProfile = await findStoredProfileByAuthUserId(identity.authUserId);

    if (authProfile) {
      return authProfile;
    }
  }

  if (identity.deviceId) {
    return findStoredProfileByDeviceId(identity.deviceId);
  }

  return null;
}

async function loadProfileStructure(profileId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: pillars, error: pillarsError }, { data: weeklyTargets, error: weeklyTargetsError }] =
    await Promise.all([
      supabase
        .from("pillars")
        .select("id, name, position")
        .eq("profile_id", profileId)
        .order("position", { ascending: true }),
      supabase
        .from("weekly_targets")
        .select("id, pillar_id, label, target_number, target_unit, position")
        .eq("profile_id", profileId)
        .order("position", { ascending: true }),
    ]);

  if (pillarsError) {
    throw pillarsError;
  }

  if (weeklyTargetsError) {
    throw weeklyTargetsError;
  }

  return {
    pillars: (pillars ?? []) as PillarRow[],
    weeklyTargets: (weeklyTargets ?? []) as WeeklyTargetRow[],
  };
}

async function replaceProfileStructure(profileId: string, state: OnboardingState) {
  const supabase = createSupabaseAdminClient();
  const normalizedState = normalizeOnboardingState(state);

  const { error: deleteTargetsError } = await supabase
    .from("weekly_targets")
    .delete()
    .eq("profile_id", profileId);

  if (deleteTargetsError) {
    throw deleteTargetsError;
  }

  const { error: deletePillarsError } = await supabase
    .from("pillars")
    .delete()
    .eq("profile_id", profileId);

  if (deletePillarsError) {
    throw deletePillarsError;
  }

  const pillarPayload = normalizedState.pillars.map((name, index) => ({
    profile_id: profileId,
    name,
    position: index,
    is_active: true,
  }));

  let pillarIdMap = new Map<string, string>();

  if (pillarPayload.length > 0) {
    const { data: insertedPillars, error: pillarsError } = await supabase
      .from("pillars")
      .insert(pillarPayload)
      .select("id, name");

    if (pillarsError) {
      throw pillarsError;
    }

    pillarIdMap = new Map(
      (insertedPillars ?? []).map((pillar) => [pillar.name as string, pillar.id as string]),
    );
  }

  if (normalizedState.weeklyTargets.length === 0) {
    return;
  }

  const targetPayload = normalizedState.weeklyTargets.map((target, index) => ({
    profile_id: profileId,
    pillar_id: pillarIdMap.get(target.pillar) ?? null,
    label: target.label,
    target_number: Number(target.targetNumber) || 0,
    target_unit: target.targetUnit,
    position: index,
  }));

  const { error: targetsError } = await supabase
    .from("weekly_targets")
    .insert(targetPayload);

  if (targetsError) {
    throw targetsError;
  }
}

async function moveRowsByUniqueColumn(input: {
  table: "daily_plans" | "daily_reviews" | "weekly_reviews" | "monthly_missions";
  uniqueColumn: "plan_date" | "review_date" | "week_start" | "month_start";
  selectColumns: string;
  sourceProfileId: string;
  targetProfileId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const [{ data: sourceRows, error: sourceError }, { data: targetRows, error: targetError }] =
    await Promise.all([
      supabase
        .from(input.table)
        .select(input.selectColumns)
        .eq("profile_id", input.sourceProfileId),
      supabase
        .from(input.table)
        .select(input.uniqueColumn)
        .eq("profile_id", input.targetProfileId),
    ]);

  if (sourceError) {
    throw sourceError;
  }

  if (targetError) {
    throw targetError;
  }

  const targetRowsList = (targetRows ?? []) as unknown as Array<Record<string, unknown>>;
  const sourceRowsList = (sourceRows ?? []) as unknown as Array<Record<string, unknown>>;

  const targetKeys = new Set(
    targetRowsList.map((row) =>
      String(row[input.uniqueColumn] ?? ""),
    ),
  );

  const rowsToMove = sourceRowsList
    .filter((row) => !targetKeys.has(String(row[input.uniqueColumn] ?? "")))
    .map((row) => ({
      ...row,
      profile_id: input.targetProfileId,
    }));

  if (rowsToMove.length === 0) {
    return;
  }

  const { error: upsertError } = await supabase.from(input.table).upsert(rowsToMove, {
    onConflict: "id",
  });

  if (upsertError) {
    throw upsertError;
  }
}

async function loadFocusSessionsByProfile(profileId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("focus_sessions")
    .select(
      "id, session_date, task_title, planned_minutes, actual_minutes, quality_rating, work_depth, preload_minutes, recovery_minutes, focus_mode, activation_label, environment_label, recovery_label, distraction_count, session_status, closure_notes, started_at, ended_at, created_at, pillar_id",
    )
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }

  return (data ?? []) as FocusSessionTransferRow[];
}

async function moveFocusSessions(input: {
  rows: FocusSessionTransferRow[];
  targetProfileId: string;
  sourcePillars: PillarRow[];
  targetPillars: PillarRow[];
}) {
  const supabase = createSupabaseAdminClient();
  const rows = input.rows;

  if (rows.length === 0) {
    return;
  }

  const sourcePillarNameById = new Map(
    input.sourcePillars.map((pillar) => [pillar.id, pillar.name]),
  );
  const targetPillarIdByName = new Map(
    input.targetPillars.map((pillar) => [pillar.name, pillar.id]),
  );

  const { error: upsertError } = await supabase.from("focus_sessions").upsert(
    rows.map((row) => ({
      id: row.id,
      profile_id: input.targetProfileId,
      session_date: row.session_date,
      task_title: row.task_title,
      planned_minutes: row.planned_minutes,
      actual_minutes: row.actual_minutes,
      quality_rating: row.quality_rating,
      work_depth: row.work_depth,
      preload_minutes: row.preload_minutes,
      recovery_minutes: row.recovery_minutes,
      focus_mode: row.focus_mode,
      activation_label: row.activation_label,
      environment_label: row.environment_label,
      recovery_label: row.recovery_label,
      distraction_count: row.distraction_count,
      session_status: row.session_status,
      closure_notes: row.closure_notes,
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      pillar_id: row.pillar_id
        ? (targetPillarIdByName.get(sourcePillarNameById.get(row.pillar_id) ?? "") ?? null)
        : null,
    })),
    {
      onConflict: "id",
    },
  );

  if (upsertError) {
    throw upsertError;
  }
}

async function mergeAuthProfileIntoDeviceProfile(
  deviceProfile: StoredProfileRow,
  authProfile: StoredProfileRow,
) {
  const supabase = createSupabaseAdminClient();
  const [deviceStructure, authStructure, deviceSessions, authSessions] = await Promise.all([
    loadProfileStructure(deviceProfile.id),
    loadProfileStructure(authProfile.id),
    loadFocusSessionsByProfile(deviceProfile.id),
    loadFocusSessionsByProfile(authProfile.id),
  ]);

  const devicePillarMap = new Map(deviceStructure.pillars.map((pillar) => [pillar.id, pillar.name]));
  const authPillarMap = new Map(authStructure.pillars.map((pillar) => [pillar.id, pillar.name]));

  const mergedOnboardingState = normalizeOnboardingState({
    name: selectPreferredName(deviceProfile.name, authProfile.name),
    mission: selectPreferredText(deviceProfile.mission, authProfile.mission),
    longTermGoal: selectPreferredText(
      deviceProfile.long_term_goal,
      authProfile.long_term_goal,
    ),
    timeZone: selectPreferredTimeZone(
      deviceProfile.time_zone,
      authProfile.time_zone,
    ) ?? "",
    weekStartsOn: selectPreferredWeekStart(
      deviceProfile.week_starts_on,
      authProfile.week_starts_on,
    ),
    nonNegotiables: selectPreferredText(
      deviceProfile.non_negotiables,
      authProfile.non_negotiables,
    ),
    defaultFirstMove: selectPreferredText(
      deviceProfile.default_first_move,
      authProfile.default_first_move,
    ),
    tone: selectPreferredTone(deviceProfile.tone, authProfile.tone),
    pillars: mergePillarNames(deviceStructure.pillars, authStructure.pillars),
    weeklyTargets: mergeWeeklyTargets(
      mapWeeklyTargets(deviceStructure.weeklyTargets, devicePillarMap),
      mapWeeklyTargets(authStructure.weeklyTargets, authPillarMap),
    ),
  });

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      name: mergedOnboardingState.name,
      mission: mergedOnboardingState.mission,
      long_term_goal: mergedOnboardingState.longTermGoal,
      time_zone: normalizeTimeZone(mergedOnboardingState.timeZone) || null,
      week_starts_on: mergedOnboardingState.weekStartsOn,
      non_negotiables: mergedOnboardingState.nonNegotiables,
      default_first_move: mergedOnboardingState.defaultFirstMove,
      tone: mergedOnboardingState.tone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deviceProfile.id);

  if (updateProfileError) {
    throw updateProfileError;
  }

  await replaceProfileStructure(deviceProfile.id, mergedOnboardingState);

  const mergedTargetStructure = await loadProfileStructure(deviceProfile.id);

  await Promise.all([
    moveRowsByUniqueColumn({
      table: "daily_plans",
      uniqueColumn: "plan_date",
      selectColumns:
        "id, plan_date, one_thing, one_thing_done, top_three, day_score, status, created_at",
      sourceProfileId: authProfile.id,
      targetProfileId: deviceProfile.id,
    }),
    moveRowsByUniqueColumn({
      table: "daily_reviews",
      uniqueColumn: "review_date",
      selectColumns:
        "id, review_date, finished_text, avoided_text, why_avoided_text, wasted_time_text, tomorrow_first_move, self_rating, created_at",
      sourceProfileId: authProfile.id,
      targetProfileId: deviceProfile.id,
    }),
    moveRowsByUniqueColumn({
      table: "weekly_reviews",
      uniqueColumn: "week_start",
      selectColumns:
        "id, week_start, wins, failures, patterns, next_week_focus, created_at",
      sourceProfileId: authProfile.id,
      targetProfileId: deviceProfile.id,
    }),
    moveRowsByUniqueColumn({
      table: "monthly_missions",
      uniqueColumn: "month_start",
      selectColumns:
        "id, month_start, focus_theme, primary_mission, why_this_matters, must_protect, must_ignore, current_week_focus, targets, created_at",
      sourceProfileId: authProfile.id,
      targetProfileId: deviceProfile.id,
    }),
    moveFocusSessions({
      rows: deviceSessions,
      targetProfileId: deviceProfile.id,
      sourcePillars: deviceStructure.pillars,
      targetPillars: mergedTargetStructure.pillars,
    }),
    moveFocusSessions({
      rows: authSessions,
      targetProfileId: deviceProfile.id,
      sourcePillars: authStructure.pillars,
      targetPillars: mergedTargetStructure.pillars,
    }),
  ]);

  const { error: deleteAuthProfileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", authProfile.id);

  if (deleteAuthProfileError) {
    throw deleteAuthProfileError;
  }

  const { error: attachAccountError } = await supabase
    .from("profiles")
    .update({
      auth_user_id: authProfile.auth_user_id,
      device_id: deviceProfile.device_id ?? authProfile.device_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deviceProfile.id);

  if (attachAccountError) {
    throw attachAccountError;
  }
}

export async function findProfileByIdentity(identity: PersistenceIdentity) {
  if (!identity.authUserId && !identity.deviceId) {
    return null;
  }

  const storedProfile = await resolveStoredProfileByIdentity(identity);

  return toPublicProfile(storedProfile);
}

export async function attachAuthenticatedProfile(identity: PersistenceIdentity) {
  const supabase = createSupabaseAdminClient();

  if (!identity.authUserId) {
    throw new Error("An authenticated user is required before attaching a profile.");
  }

  const authProfile = await findStoredProfileByAuthUserId(identity.authUserId);
  const deviceProfile = identity.deviceId
    ? await findStoredProfileByDeviceId(identity.deviceId)
    : null;

  if (authProfile && deviceProfile && authProfile.id !== deviceProfile.id) {
    await mergeAuthProfileIntoDeviceProfile(deviceProfile, authProfile);
    return {
      profileId: deviceProfile.id,
      status: "merge-completed",
    } as const;
  }

  if (!authProfile && deviceProfile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        auth_user_id: identity.authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deviceProfile.id);

    if (error) {
      throw error;
    }

    return {
      profileId: deviceProfile.id,
      status: "device-linked",
    } as const;
  }

  if (authProfile) {
    if (identity.deviceId && !deviceProfile && !authProfile.device_id) {
      const { error } = await supabase
        .from("profiles")
        .update({
          device_id: identity.deviceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authProfile.id);

      if (error) {
        throw error;
      }
    }

    return {
      profileId: authProfile.id,
      status: deviceProfile ? "already-connected" : "account-only",
    } as const;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: identity.authUserId,
      name: "Proof User",
      tone: "Honest",
      week_starts_on: "monday",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    profileId: data.id as string,
    status: "profile-created",
  } as const;
}

export async function createOrUpdateProfileFromSeed(
  identity: PersistenceIdentity,
  seed?: {
    name?: string;
    tone?: OnboardingState["tone"];
    timeZone?: string;
    weekStartsOn?: OnboardingState["weekStartsOn"];
  },
) {
  const supabase = createSupabaseAdminClient();

  if (!identity.authUserId && !identity.deviceId) {
    throw new Error("A device or auth identity is required.");
  }

  const existingProfile = await resolveStoredProfileByIdentity(identity);

  if (existingProfile) {
    return existingProfile.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: identity.authUserId,
      device_id: identity.deviceId,
      name: seed?.name?.trim() || "Proof User",
      tone: seed?.tone ?? "Honest",
      time_zone: normalizeTimeZone(seed?.timeZone) || null,
      week_starts_on: normalizeWeekStartPreference(seed?.weekStartsOn),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function loadPersistedOnboardingState(identity: PersistenceIdentity) {
  const resolvedProfile = await resolveStoredProfileByIdentity(identity);

  if (!resolvedProfile) {
    return null;
  }

  const { pillars, weeklyTargets } = await loadProfileStructure(resolvedProfile.id);
  const pillarMap = new Map(pillars.map((pillar) => [pillar.id, pillar.name]));

  return normalizeOnboardingState({
    name: resolvedProfile.name,
    mission: resolvedProfile.mission ?? "",
    longTermGoal: resolvedProfile.long_term_goal ?? "",
    timeZone: resolvedProfile.time_zone ?? "",
    weekStartsOn: normalizeWeekStartPreference(resolvedProfile.week_starts_on),
    nonNegotiables: resolvedProfile.non_negotiables ?? "",
    defaultFirstMove: resolvedProfile.default_first_move ?? "",
    tone: (resolvedProfile.tone as OnboardingState["tone"] | null) ?? "Honest",
    pillars: pillars.map((pillar) => pillar.name),
    weeklyTargets: weeklyTargets.map((target, index) => ({
      id: target.id || `target-${index}`,
      pillar: target.pillar_id ? (pillarMap.get(target.pillar_id) ?? "") : "",
      label: target.label,
      targetNumber: String(target.target_number),
      targetUnit: target.target_unit,
    })),
  });
}

export async function savePersistedOnboardingState(
  identity: PersistenceIdentity,
  state: OnboardingState,
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();
  const normalizedState = normalizeOnboardingState(state);

  if (!identity.authUserId && !identity.deviceId) {
    throw new Error("A device or auth identity is required to persist onboarding.");
  }

  const existingProfile = await resolveStoredProfileByIdentity(identity);

  const profilePayload = {
    auth_user_id: identity.authUserId ?? existingProfile?.auth_user_id ?? null,
    device_id: existingProfile?.device_id ?? identity.deviceId,
    name: normalizedState.name,
    mission: normalizedState.mission,
    long_term_goal: normalizedState.longTermGoal,
    time_zone: normalizeTimeZone(normalizedState.timeZone) || null,
    week_starts_on: normalizedState.weekStartsOn,
    non_negotiables: normalizedState.nonNegotiables,
    default_first_move: normalizedState.defaultFirstMove,
    tone: normalizedState.tone,
    updated_at: new Date().toISOString(),
  };

  const { data: savedProfile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      existingProfile
        ? {
            id: existingProfile.id,
            ...profilePayload,
          }
        : profilePayload,
      {
        onConflict: identity.authUserId !== null ? "auth_user_id" : "device_id",
      },
    )
    .select("id")
    .single();

  if (profileError) {
    throw profileError;
  }

  await replaceProfileStructure(savedProfile.id as string, normalizedState);

  return "supabase";
}
