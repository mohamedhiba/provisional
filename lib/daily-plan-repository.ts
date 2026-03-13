import "server-only";

import { getLegacyCorrectedDate } from "@/lib/day-boundary";
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
  id: string;
  plan_date: string;
  one_thing: string;
  one_thing_done: boolean | null;
  top_three: unknown;
  status: string | null;
  created_at: string;
};

function toPlanState(row: DailyPlanRow, fallbackDate: string) {
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
    fallbackDate,
  );
}

function getPlanRichness(plan: DailyPlanState) {
  return (
    (plan.oneThing.trim() ? 3 : 0) +
    (plan.oneThingDone ? 3 : 0) +
    plan.topThree.filter((item) => item.title.trim()).length +
    plan.topThree.filter((item) => item.done && item.title.trim()).length
  );
}

function mergeDailyPlanStates(primary: DailyPlanState, secondary: DailyPlanState, planDate: string) {
  const winner = getPlanRichness(primary) >= getPlanRichness(secondary) ? primary : secondary;
  const loser = winner === primary ? secondary : primary;

  return normalizeDailyPlanState(
    {
      planDate,
      oneThing: winner.oneThing.trim() || loser.oneThing,
      oneThingDone: winner.oneThingDone || loser.oneThingDone,
      topThree: winner.topThree.map((item, index) => {
        const fallback = loser.topThree[index];

        if (!item.title.trim() && fallback) {
          return fallback;
        }

        return item;
      }),
      status:
        winner.status === "completed" || loser.status === "completed"
          ? "completed"
          : "active",
    },
    planDate,
  );
}

export async function repairLegacyDailyPlanDate(
  identity: PersistenceIdentity,
  requestedDate: string,
  timeZone?: string | null,
) {
  if (!timeZone) {
    return { repaired: false };
  }

  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return { repaired: false };
  }

  const { data, error } = await supabase
    .from("daily_plans")
    .select("id, plan_date, one_thing, one_thing_done, top_three, status, created_at")
    .eq("profile_id", profile.id)
    .eq("plan_date", requestedDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { repaired: false };
  }

  const row = data as DailyPlanRow;
  const correctedDate = getLegacyCorrectedDate(row.plan_date, row.created_at, timeZone);

  if (!correctedDate) {
    return { repaired: false };
  }

  const currentState = toPlanState(row, correctedDate);
  const { data: existingTarget, error: targetError } = await supabase
    .from("daily_plans")
    .select("id, plan_date, one_thing, one_thing_done, top_three, status, created_at")
    .eq("profile_id", profile.id)
    .eq("plan_date", correctedDate)
    .maybeSingle();

  if (targetError) {
    throw targetError;
  }

  if (existingTarget) {
    const merged = mergeDailyPlanStates(
      toPlanState(existingTarget as DailyPlanRow, correctedDate),
      currentState,
      correctedDate,
    );

    const { error: updateError } = await supabase
      .from("daily_plans")
      .update({
        one_thing: merged.oneThing,
        one_thing_done: merged.oneThingDone,
        top_three: merged.topThree,
        status: merged.status,
      })
      .eq("id", (existingTarget as DailyPlanRow).id);

    if (updateError) {
      throw updateError;
    }

    const { error: deleteError } = await supabase
      .from("daily_plans")
      .delete()
      .eq("id", row.id);

    if (deleteError) {
      throw deleteError;
    }
  } else {
    const { error: moveError } = await supabase
      .from("daily_plans")
      .update({ plan_date: correctedDate })
      .eq("id", row.id);

    if (moveError) {
      throw moveError;
    }
  }

  return {
    repaired: true,
    correctedDate,
  };
}

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
    .select("id, plan_date, one_thing, one_thing_done, top_three, status, created_at")
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

  return toPlanState(row, planDate);
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
