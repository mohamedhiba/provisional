import "server-only";

import {
  normalizeDailyPlanState,
  type DailyPlanState,
} from "@/lib/daily-plan";
import type { OnboardingPersistenceSource } from "@/lib/onboarding";
import {
  createOrUpdateProfileFromSeed,
  findProfileByIdentity,
  type PersistenceIdentity,
} from "@/lib/profile-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DailyPlanRow = {
  plan_date: string;
  one_thing: string;
  one_thing_done: boolean | null;
  top_three: unknown;
  status: string | null;
};

export async function loadPersistedDailyPlan(
  identity: PersistenceIdentity,
  planDate: string,
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return null;
  }

  const { data, error } = await supabase
    .from("daily_plans")
    .select("plan_date, one_thing, one_thing_done, top_three, status")
    .eq("profile_id", profile.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as DailyPlanRow;

  return normalizeDailyPlanState(
    {
      planDate: row.plan_date,
      oneThing: row.one_thing,
      oneThingDone: row.one_thing_done ?? false,
      topThree: Array.isArray(row.top_three)
        ? (row.top_three as DailyPlanState["topThree"])
        : [],
      status: row.status === "completed" ? "completed" : "active",
    },
    planDate,
  );
}

export async function savePersistedDailyPlan(
  identity: PersistenceIdentity,
  plan: DailyPlanState,
  profileSeed?: {
    name?: string;
    tone?: "Honest" | "Strict" | "Supportive";
  },
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();
  const normalizedPlan = normalizeDailyPlanState(plan, plan.planDate);
  const profileId = await createOrUpdateProfileFromSeed(identity, profileSeed);

  const { error } = await supabase.from("daily_plans").upsert(
    {
      profile_id: profileId,
      plan_date: normalizedPlan.planDate,
      one_thing: normalizedPlan.oneThing,
      one_thing_done: normalizedPlan.oneThingDone,
      top_three: normalizedPlan.topThree,
      day_score: 0,
      status: normalizedPlan.status,
    },
    {
      onConflict: "profile_id,plan_date",
    },
  );

  if (error) {
    throw error;
  }

  return "supabase";
}
