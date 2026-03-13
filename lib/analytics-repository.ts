import "server-only";

import {
  createEmptyDailyPlan,
  getTodayIsoDate,
  normalizeDailyPlanState,
} from "@/lib/daily-plan";
import { normalizeFocusSession, type FocusSession } from "@/lib/focus-session";
import { computeDailyScore } from "@/lib/daily-score";
import {
  getActivityGridEnd,
  getActivityGridStart,
  createEmptyAnalyticsSnapshot,
  getHistoryWeekStarts,
  type AnalyticsDriftAlert,
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

function limitWeekEnd(weekStart: string, today: string) {
  const weekEnd = getWeekEnd(weekStart);

  return today < weekEnd ? today : weekEnd;
}

function computeStreak(
  dates: string[],
  scoreByDate: Map<string, number>,
  reviewDateSet: Set<string>,
  today: string,
) {
  let streak = 0;
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

function getActivityIntensity(input: {
  isFuture: boolean;
  score: number;
  oneThingSet: boolean;
  sessionCount: number;
  reviewCompleted: boolean;
}): 0 | 1 | 2 | 3 | 4 {
  if (input.isFuture) {
    return 0;
  }

  if (!input.oneThingSet && input.sessionCount === 0 && !input.reviewCompleted) {
    return 0;
  }

  if (input.score >= 75) {
    return 4;
  }

  if (input.score >= 60) {
    return 3;
  }

  if (input.score >= 40) {
    return 2;
  }

  return 1;
}

function computeMissedTopTaskStreak(activityGrid: AnalyticsSnapshot["activityGrid"]) {
  let streak = 0;
  let skippedOpenToday = false;
  const today = activityGrid.filter((day) => !day.isFuture).at(-1)?.date ?? "";

  for (const day of [...activityGrid].reverse()) {
    if (day.isFuture) {
      continue;
    }

    if (day.date === today && !day.reviewCompleted && !skippedOpenToday) {
      skippedOpenToday = true;
      continue;
    }

    if (!day.oneThingSet) {
      break;
    }

    if (!day.topTaskDone) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function computeNoDeepWorkStreak(activityGrid: AnalyticsSnapshot["activityGrid"]) {
  let streak = 0;
  let skippedOpenToday = false;
  const today = activityGrid.filter((day) => !day.isFuture).at(-1)?.date ?? "";

  for (const day of [...activityGrid].reverse()) {
    if (day.isFuture) {
      continue;
    }

    if (day.date === today && !day.reviewCompleted && !skippedOpenToday) {
      skippedOpenToday = true;
      continue;
    }

    if (!day.oneThingSet && day.sessionCount === 0 && !day.reviewCompleted) {
      break;
    }

    if (day.deepMinutes === 0) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function createDriftAlerts(input: {
  activityGrid: AnalyticsSnapshot["activityGrid"];
  weeklyHistory: AnalyticsSnapshot["weeklyHistory"];
  today: string;
}) {
  const alerts: AnalyticsDriftAlert[] = [];
  const today = input.today;
  const pastDays = input.activityGrid.filter((day) => !day.isFuture);
  const activePastDays = pastDays.filter(
    (day) =>
      day.date < today &&
      (day.oneThingSet || day.sessionCount > 0 || day.reviewCompleted),
  );
  const missedTopTaskStreak = computeMissedTopTaskStreak(input.activityGrid);
  const noDeepWorkStreak = computeNoDeepWorkStreak(input.activityGrid);
  const skippedReviews = activePastDays.slice(-7).filter((day) => !day.reviewCompleted).length;
  const currentWeek = input.weeklyHistory.find((week) => week.isCurrentWeek);
  const previousWeek = [...input.weeklyHistory]
    .reverse()
    .find((week) => !week.isCurrentWeek);

  if (missedTopTaskStreak >= 3) {
    alerts.push({
      id: "missed-top-task-streak",
      level: "high",
      title: "Top task is being avoided repeatedly.",
      body: "The highest-value task has stayed open for multiple days. That is usually drift hiding behind other activity.",
      metric: `${missedTopTaskStreak} missed top-task day${missedTopTaskStreak === 1 ? "" : "s"} in a row`,
      href: "/today",
    });
  }

  if (noDeepWorkStreak >= 3) {
    alerts.push({
      id: "deep-work-drop",
      level: "high",
      title: "Deep work has been absent for too long.",
      body: "The system is collecting less real evidence of focused work than it should. Protect a serious block before activity theater takes over.",
      metric: `${noDeepWorkStreak} day${noDeepWorkStreak === 1 ? "" : "s"} without deep work`,
      href: "/sessions",
    });
  }

  if (skippedReviews >= 2) {
    alerts.push({
      id: "skipped-reviews",
      level: "medium",
      title: "Nightly truth is slipping.",
      body: "When days are left unclosed, drift gets harder to notice and easier to repeat.",
      metric: `${skippedReviews} skipped nightly review${skippedReviews === 1 ? "" : "s"} in the last 7 active days`,
      href: "/review/daily",
    });
  }

  if (
    currentWeek &&
    previousWeek &&
    previousWeek.deepWorkHours >= 4 &&
    currentWeek.deepWorkHours <= previousWeek.deepWorkHours * 0.65
  ) {
    alerts.push({
      id: "week-over-week-drop",
      level: "medium",
      title: "Deep work is dropping week over week.",
      body: "This week is lagging behind the previous one. If nothing changes, the month will feel busy but move slower.",
      metric: `${previousWeek.deepWorkHours.toFixed(1)}h -> ${currentWeek.deepWorkHours.toFixed(1)}h`,
      href: "/analytics",
    });
  }

  if (currentWeek && currentWeek.driftDays >= 2) {
    alerts.push({
      id: "drift-days",
      level: "medium",
      title: "Too many drift days this week.",
      body: "The week has already shown multiple low-truth days. Tighten the next two days before the pattern hardens.",
      metric: `${currentWeek.driftDays} drift day${currentWeek.driftDays === 1 ? "" : "s"} this week`,
      href: "/review/weekly",
    });
  }

  if (
    currentWeek &&
    currentWeek.topTaskCompletionRate < 50 &&
    currentWeek.deepWorkHours >= 4
  ) {
    alerts.push({
      id: "avoidance-disguised-as-productivity",
      level: "low",
      title: "Activity is outpacing alignment.",
      body: "You are still working, but the hardest priority is not getting finished often enough. That is usually avoidance in respectable clothing.",
      metric: `${currentWeek.topTaskCompletionRate}% top-task completion with ${currentWeek.deepWorkHours.toFixed(1)}h of deep work`,
      href: "/today",
    });
  }

  return alerts
    .sort((left, right) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[left.level] - priority[right.level];
    })
    .slice(0, 3);
}

export async function loadAnalyticsSnapshot(
  identity: PersistenceIdentity,
  referenceDate = getTodayIsoDate(),
): Promise<AnalyticsSnapshot> {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return createEmptyAnalyticsSnapshot(referenceDate);
  }

  const currentWeekStart = getCurrentWeekStart(referenceDate);
  const weekStarts = getHistoryWeekStarts(4, currentWeekStart);
  const today = referenceDate;
  const rangeStart = getActivityGridStart(today);
  const displayEnd = getActivityGridEnd(today);
  const queryEnd = today;

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
      .lte("plan_date", queryEnd)
      .order("plan_date", { ascending: true }),
    supabase
      .from("focus_sessions")
      .select(
        "id, session_date, task_title, planned_minutes, actual_minutes, quality_rating, work_depth, created_at",
      )
      .eq("profile_id", profile.id)
      .gte("session_date", rangeStart)
      .lte("session_date", queryEnd)
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_reviews")
      .select("review_date")
      .eq("profile_id", profile.id)
      .gte("review_date", rangeStart)
      .lte("review_date", queryEnd)
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

  const analyticsDates = getWeekDates(rangeStart, displayEnd);
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
  const activityGrid = analyticsDates.map((date) => {
    const sessionsForDate = sessionsByDate.get(date) ?? [];
    const deepMinutes = sessionsForDate
      .filter((session) => session.workDepth === "deep")
      .reduce((sum, session) => sum + session.actualMinutes, 0);
    const plan = plansByDate.get(date) ?? createEmptyDailyPlan(date);
    const reviewCompleted = reviewDateSet.has(date);
    const oneThingSet = Boolean(plan.oneThing.trim());
    const score = date > today ? 0 : scoreByDate.get(date) ?? 0;
    const isFuture = date > today;

    return {
      date,
      score,
      deepMinutes,
      topTaskDone: plan.oneThingDone,
      oneThingSet,
      reviewCompleted,
      sessionCount: sessionsForDate.length,
      intensity: getActivityIntensity({
        isFuture,
        score,
        oneThingSet,
        sessionCount: sessionsForDate.length,
        reviewCompleted,
      }),
      isFuture,
    } satisfies AnalyticsSnapshot["activityGrid"][number];
  });

  const weeklyHistory = weekStarts.map((weekStart) => {
    const progressEnd = limitWeekEnd(weekStart, today);
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
  });

  return {
    currentStreak: computeStreak(
      analyticsDates.filter((date) => date <= today),
      scoreByDate,
      reviewDateSet,
      today,
    ),
    weeklyHistory,
    activityGrid,
    driftAlerts: createDriftAlerts({
      activityGrid,
      weeklyHistory,
      today,
    }),
  };
}
