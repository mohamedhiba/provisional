import "server-only";

import {
  createEmptyDailyPlan,
  getTodayIsoDate,
  normalizeDailyPlanState,
} from "@/lib/daily-plan";
import { normalizeFocusSession, type FocusSession } from "@/lib/focus-session";
import { computeDailyScore } from "@/lib/daily-score";
import {
  createEmptyAnalyticsSnapshot,
  getAnalyticsRangeStart,
  getHistoryWeekStarts,
  type AnalyticsSnapshot,
} from "@/lib/analytics";
import { formatWeeklyRange, getCurrentWeekStart, getWeekDates, getWeekEnd } from "@/lib/weekly-review";
import {
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

type FocusSessionRow = {
  id: string;
  session_date: string;
  task_title: string;
  planned_minutes: number;
  actual_minutes: number | null;
  quality_rating: number | null;
  work_depth: "deep" | "shallow" | null;
  created_at: string | null;
};

type DailyReviewRow = {
  review_date: string;
};

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function limitWeekEnd(weekStart: string) {
  const weekEnd = getWeekEnd(weekStart);
  const today = getTodayIsoDate();

  return today < weekEnd ? today : weekEnd;
}

function computeStreak(dates: string[], scoreByDate: Map<string, number>, reviewDateSet: Set<string>) {
  let streak = 0;
  const today = getTodayIsoDate();
  let skippedOpenToday = false;

  for (const date of [...dates].reverse()) {
    const reviewCompleted = reviewDateSet.has(date);
    const score = scoreByDate.get(date) ?? 0;

    if (!reviewCompleted && date === today && !skippedOpenToday) {
      skippedOpenToday = true;
      continue;
    }

    if (reviewCompleted && score >= 60) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

export async function loadAnalyticsSnapshot(identity: PersistenceIdentity): Promise<AnalyticsSnapshot> {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return createEmptyAnalyticsSnapshot();
  }

  const currentWeekStart = getCurrentWeekStart();
  const weekStarts = getHistoryWeekStarts(4, currentWeekStart);
  const rangeStart = getAnalyticsRangeStart(getTodayIsoDate(), 84);
  const rangeEnd = getTodayIsoDate();

  const [
    { data: dailyPlans, error: dailyPlansError },
    { data: focusSessions, error: focusSessionsError },
    { data: dailyReviews, error: dailyReviewsError },
  ] = await Promise.all([
    supabase
      .from("daily_plans")
      .select("plan_date, one_thing, one_thing_done, top_three, status")
      .eq("profile_id", profile.id)
      .gte("plan_date", rangeStart)
      .lte("plan_date", rangeEnd)
      .order("plan_date", { ascending: true }),
    supabase
      .from("focus_sessions")
      .select(
        "id, session_date, task_title, planned_minutes, actual_minutes, quality_rating, work_depth, created_at",
      )
      .eq("profile_id", profile.id)
      .gte("session_date", rangeStart)
      .lte("session_date", rangeEnd)
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_reviews")
      .select("review_date")
      .eq("profile_id", profile.id)
      .gte("review_date", rangeStart)
      .lte("review_date", rangeEnd)
      .order("review_date", { ascending: true }),
  ]);

  if (dailyPlansError) {
    throw dailyPlansError;
  }

  if (focusSessionsError) {
    throw focusSessionsError;
  }

  if (dailyReviewsError) {
    throw dailyReviewsError;
  }

  const normalizedPlans = ((dailyPlans ?? []) as DailyPlanRow[]).map((plan) =>
    normalizeDailyPlanState(
      {
        planDate: plan.plan_date,
        oneThing: plan.one_thing,
        oneThingDone: plan.one_thing_done ?? false,
        topThree: Array.isArray(plan.top_three)
          ? (plan.top_three as ReturnType<typeof createEmptyDailyPlan>["topThree"])
          : [],
        status: plan.status === "completed" ? "completed" : "active",
      },
      plan.plan_date,
    ),
  );

  const normalizedSessions = ((focusSessions ?? []) as FocusSessionRow[]).map((session) =>
    normalizeFocusSession(
      {
        id: session.id,
        sessionDate: session.session_date,
        taskTitle: session.task_title,
        pillar: "",
        plannedMinutes: session.planned_minutes,
        actualMinutes: session.actual_minutes ?? session.planned_minutes,
        qualityRating: session.quality_rating ?? 4,
        workDepth: session.work_depth ?? "deep",
        createdAt: session.created_at ?? new Date().toISOString(),
      },
      session.session_date,
    ),
  );

  const reviewDateSet = new Set(
    ((dailyReviews ?? []) as DailyReviewRow[]).map((review) => review.review_date),
  );
  const plansByDate = new Map(normalizedPlans.map((plan) => [plan.planDate, plan]));
  const sessionsByDate = normalizedSessions.reduce((map, session) => {
    const existing = map.get(session.sessionDate) ?? [];
    map.set(session.sessionDate, [...existing, session]);
    return map;
  }, new Map<string, FocusSession[]>());

  const analyticsDates = getWeekDates(rangeStart, rangeEnd);
  const scoreByDate = new Map(
    analyticsDates.map((date) => [
      date,
      computeDailyScore({
        dailyPlan: plansByDate.get(date) ?? createEmptyDailyPlan(date),
        sessions: sessionsByDate.get(date) ?? [],
        reviewCompleted: reviewDateSet.has(date),
      }),
    ]),
  );

  return {
    currentStreak: computeStreak(analyticsDates, scoreByDate, reviewDateSet),
    weeklyHistory: weekStarts.map((weekStart) => {
      const progressEnd = limitWeekEnd(weekStart);
      const weekDates = getWeekDates(weekStart, progressEnd);
      const plansInWeek = weekDates
        .map((date) => plansByDate.get(date))
        .filter(Boolean) as ReturnType<typeof normalizeDailyPlanState>[];
      const sessionsInWeek = weekDates.flatMap((date) => sessionsByDate.get(date) ?? []);
      const topTaskDays = plansInWeek.filter((plan) => plan.oneThing.trim());
      const completedTopTasks = topTaskDays.filter((plan) => plan.oneThingDone).length;
      const topTaskCompletionRate =
        topTaskDays.length > 0 ? Math.round((completedTopTasks / topTaskDays.length) * 100) : 0;
      const deepMinutes = sessionsInWeek
        .filter((session) => session.workDepth === "deep")
        .reduce((sum, session) => sum + session.actualMinutes, 0);
      const driftDays = weekDates.filter((date) => (scoreByDate.get(date) ?? 0) < 40).length;
      const winningDays = weekDates.filter((date) => (scoreByDate.get(date) ?? 0) >= 75).length;
      const reviewCompletionRate =
        weekDates.length > 0
          ? Math.round(
              (weekDates.filter((date) => reviewDateSet.has(date)).length / weekDates.length) *
                100,
            )
          : 0;

      return {
        weekStart,
        label: formatWeeklyRange(weekStart),
        topTaskCompletionRate,
        deepWorkHours: roundToSingleDecimal(deepMinutes / 60),
        driftDays,
        reviewCompletionRate,
        winningDays,
        isCurrentWeek: weekStart === currentWeekStart,
      };
    }),
  };
}

