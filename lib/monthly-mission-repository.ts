import "server-only";

import {
  normalizeMonthlyMissionState,
  type MonthlyMissionState,
} from "@/lib/monthly-mission";
import type { OnboardingPersistenceSource } from "@/lib/onboarding";
import {
  createOrUpdateProfileFromSeed,
  findProfileByIdentity,
  type PersistenceIdentity,
} from "@/lib/profile-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MonthlyMissionRow = {
  month_start: string;
  focus_theme: string | null;
  primary_mission: string | null;
  why_this_matters: string | null;
  must_protect: string | null;
  must_ignore: string | null;
  current_week_focus: string | null;
  targets: unknown;
};

export async function loadPersistedMonthlyMission(
  identity: PersistenceIdentity,
  monthStart: string,
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return null;
  }

  const { data, error } = await supabase
    .from("monthly_missions")
    .select(
      "month_start, focus_theme, primary_mission, why_this_matters, must_protect, must_ignore, current_week_focus, targets",
    )
    .eq("profile_id", profile.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as MonthlyMissionRow;

  return normalizeMonthlyMissionState(
    {
      monthStart: row.month_start,
      focusTheme: row.focus_theme ?? "",
      primaryMission: row.primary_mission ?? "",
      whyThisMatters: row.why_this_matters ?? "",
      mustProtect: row.must_protect ?? "",
      mustIgnore: row.must_ignore ?? "",
      currentWeekFocus: row.current_week_focus ?? "",
      targets: Array.isArray(row.targets)
        ? (row.targets as MonthlyMissionState["targets"])
        : [],
    },
    monthStart,
  );
}

export async function savePersistedMonthlyMission(
  identity: PersistenceIdentity,
  mission: MonthlyMissionState,
  profileSeed?: {
    name?: string;
    tone?: "Honest" | "Strict" | "Supportive";
  },
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();
  const normalized = normalizeMonthlyMissionState(mission, mission.monthStart);
  const profileId = await createOrUpdateProfileFromSeed(identity, profileSeed);

  const { error } = await supabase.from("monthly_missions").upsert(
    {
      profile_id: profileId,
      month_start: normalized.monthStart,
      focus_theme: normalized.focusTheme,
      primary_mission: normalized.primaryMission,
      why_this_matters: normalized.whyThisMatters,
      must_protect: normalized.mustProtect,
      must_ignore: normalized.mustIgnore,
      current_week_focus: normalized.currentWeekFocus,
      targets: normalized.targets,
    },
    {
      onConflict: "profile_id,month_start",
    },
  );

  if (error) {
    throw error;
  }

  return "supabase";
}

