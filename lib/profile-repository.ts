import "server-only";

import {
  normalizeOnboardingState,
  type OnboardingPersistenceSource,
  type OnboardingState,
} from "@/lib/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PersistenceIdentity = {
  authUserId: string | null;
  deviceId: string | null;
};

type ProfileRow = {
  id: string;
  name: string;
  mission: string | null;
  long_term_goal: string | null;
  non_negotiables: string | null;
  default_first_move: string | null;
  tone: string | null;
};

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

export async function findProfileByIdentity(identity: PersistenceIdentity) {
  const supabase = createSupabaseAdminClient();

  if (!identity.authUserId && !identity.deviceId) {
    return null;
  }

  let profileQuery = supabase.from("profiles").select(
    "id, name, mission, long_term_goal, non_negotiables, default_first_move, tone",
  );

  profileQuery =
    identity.authUserId !== null
      ? profileQuery.eq("auth_user_id", identity.authUserId)
      : profileQuery.eq("device_id", identity.deviceId);

  const { data, error } = await profileQuery.maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProfileRow | null) ?? null;
}

export async function createOrUpdateProfileFromSeed(
  identity: PersistenceIdentity,
  seed?: {
    name?: string;
    tone?: OnboardingState["tone"];
  },
) {
  const supabase = createSupabaseAdminClient();

  if (!identity.authUserId && !identity.deviceId) {
    throw new Error("A device or auth identity is required.");
  }

  const existingProfile = await findProfileByIdentity(identity);

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
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return null;
  }

  const [{ data: pillars, error: pillarsError }, { data: weeklyTargets, error: weeklyTargetsError }] =
    await Promise.all([
      supabase
        .from("pillars")
        .select("id, name, position")
        .eq("profile_id", profile.id)
        .order("position", { ascending: true }),
      supabase
        .from("weekly_targets")
        .select("id, pillar_id, label, target_number, target_unit, position")
        .eq("profile_id", profile.id)
        .order("position", { ascending: true }),
    ]);

  if (pillarsError) {
    throw pillarsError;
  }

  if (weeklyTargetsError) {
    throw weeklyTargetsError;
  }

  const typedPillars = (pillars ?? []) as PillarRow[];
  const typedWeeklyTargets = (weeklyTargets ?? []) as WeeklyTargetRow[];
  const pillarMap = new Map(typedPillars.map((pillar) => [pillar.id, pillar.name]));

  return normalizeOnboardingState({
    name: profile.name,
    mission: profile.mission ?? "",
    longTermGoal: profile.long_term_goal ?? "",
    nonNegotiables: profile.non_negotiables ?? "",
    defaultFirstMove: profile.default_first_move ?? "",
    tone: (profile.tone as OnboardingState["tone"] | null) ?? "Honest",
    pillars: typedPillars.map((pillar) => pillar.name),
    weeklyTargets: typedWeeklyTargets.map((target, index) => ({
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

  const existingProfile = await findProfileByIdentity(identity);

  const profilePayload = {
    auth_user_id: identity.authUserId,
    device_id: identity.deviceId,
    name: normalizedState.name,
    mission: normalizedState.mission,
    long_term_goal: normalizedState.longTermGoal,
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

  const profileId = savedProfile.id as string;

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

  const { data: insertedPillars, error: pillarsError } = await supabase
    .from("pillars")
    .insert(pillarPayload)
    .select("id, name");

  if (pillarsError) {
    throw pillarsError;
  }

  const pillarIdMap = new Map(
    (insertedPillars ?? []).map((pillar) => [pillar.name as string, pillar.id as string]),
  );

  if (normalizedState.weeklyTargets.length > 0) {
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

  return "supabase";
}
