import "server-only";

import {
  createEmptyDailyPlan,
  getTodayIsoDate,
  normalizeDailyPlanState,
} from "@/lib/daily-plan";
import { normalizeFocusSession, type FocusSession } from "@/lib/focus-session";
import {
  formatWeekdayLabel,
  parseWeeklyPatterns,
  createEmptyWeeklySummary,
  getCurrentWeekStart,
  getWeekDates,
  getWeekEnd,
  normalizeWeeklyReviewState,
  serializeWeeklyPatterns,
  type WeeklyReviewState,
} from "@/lib/weekly-review";
import { computeDailyScore, getDailyScoreLabel } from "@/lib/daily-score";
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

type FocusSessionRow = {
  id: string;
  session_date: string;
  task_title: string;
  planned_minutes: number;
  actual_minutes: number | null;
  quality_rating: number | null;
  work_depth: "deep" | "shallow" | null;
  created_at: string | null;
  pillar_id: string | null;
};

type DailyReviewRow = {
  review_date: string;
  why_avoided_text: string | null;
  wasted_time_text: string | null;
};

type WeeklyReviewRow = {
  week_start: string;
  wins: string | null;
  failures: string | null;
  patterns: string | null;
  next_week_focus: string | null;
};

type PillarRow = {
  id: string;
  name: string;
};

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function findRepeatedExcuse(reviews: DailyReviewRow[]) {
  const joined = reviews
    .flatMap((review) => [review.why_avoided_text, review.wasted_time_text])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const patterns = [
    { label: "Tired", words: ["tired", "sleep", "exhausted"] },
    { label: "Phone drift", words: ["phone", "scroll", "social", "youtube", "instagram"] },
    { label: "Confusion", words: ["confused", "unclear", "didn't know", "unsure"] },
    { label: "Delay", words: ["later", "tomorrow", "after", "procrast"] },
    { label: "Overplanning", words: ["plan", "planning", "organizing", "setup"] },
  ];

  let winner = {
    label: "No excuse pattern recorded yet.",
    matches: 0,
  };

  for (const pattern of patterns) {
    const matches = pattern.words.reduce((count, word) => {
      return count + joined.split(word).length - 1;
    }, 0);

    if (matches > winner.matches) {
      winner = {
        label: pattern.label,
        matches,
      };
    }
  }

  return winner.label;
}

function deriveMainLie(input: {
  topTaskCompletionRate: number;
  deepWorkHours: number;
  reviewCompletionRate: number;
  missedTopTasks: number;
  sessionCount: number;
}) {
  if (input.missedTopTasks >= 3 && input.sessionCount > 0) {
    return "You stayed active, but too much of the work happened around the hardest priorities.";
  }

  if (input.reviewCompletionRate < 60) {
    return "The week stayed blurry because too many days ended without honest closure.";
  }

  if (input.deepWorkHours < 5) {
    return "The standards were set, but the week did not contain enough deep work to prove them.";
  }

  if (input.topTaskCompletionRate < 50) {
    return "The top task kept losing to lower-friction work.";
  }

  return "The system held more often than it slipped. Tighten the weak points instead of starting over.";
}

function getMostActivePillar(sessions: FocusSession[]) {
  if (sessions.length === 0) {
    return "No pillar evidence yet.";
  }

  const minutesByPillar = sessions.reduce((map, session) => {
    const pillar = session.pillar.trim() || "Unassigned";
    map.set(pillar, (map.get(pillar) ?? 0) + session.actualMinutes);
    return map;
  }, new Map<string, number>());

  let winner = "No pillar evidence yet.";
  let highestMinutes = 0;

  for (const [pillar, minutes] of minutesByPillar.entries()) {
    if (minutes > highestMinutes) {
      winner = pillar;
      highestMinutes = minutes;
    }
  }

  return winner;
}

function computeCurrentStreak(input: {
  dates: string[];
  reviewDateSet: Set<string>;
  scoreByDate: Map<string, number>;
  progressEnd: string;
}) {
  let streak = 0;
  let skippedOpenToday = false;

  for (const date of [...input.dates].reverse()) {
    const reviewCompleted = input.reviewDateSet.has(date);
    const score = input.scoreByDate.get(date) ?? 0;

    if (!reviewCompleted && date === input.progressEnd && !skippedOpenToday) {
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

export async function loadPersistedWeeklyReviewSnapshot(
  identity: PersistenceIdentity,
  weekStart = getCurrentWeekStart(),
  referenceDate = getTodayIsoDate(),
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return {
      review: null,
      summary: createEmptyWeeklySummary(weekStart),
    };
  }

  const progressEnd =
    referenceDate < getWeekEnd(weekStart) ? referenceDate : getWeekEnd(weekStart);
  const weekDates = getWeekDates(weekStart, progressEnd);

  const [
    { data: dailyPlans, error: dailyPlansError },
    { data: focusSessions, error: focusSessionsError },
    { data: dailyReviews, error: dailyReviewsError },
    { data: weeklyReview, error: weeklyReviewError },
    { data: pillars, error: pillarsError },
  ] = await Promise.all([
    supabase
      .from("daily_plans")
      .select("plan_date, one_thing, one_thing_done, top_three, status")
      .eq("profile_id", profile.id)
      .gte("plan_date", weekStart)
      .lte("plan_date", progressEnd)
      .order("plan_date", { ascending: true }),
    supabase
      .from("focus_sessions")
      .select(
        "id, session_date, task_title, planned_minutes, actual_minutes, quality_rating, work_depth, created_at, pillar_id",
      )
      .eq("profile_id", profile.id)
      .gte("session_date", weekStart)
      .lte("session_date", progressEnd)
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_reviews")
      .select("review_date, why_avoided_text, wasted_time_text")
      .eq("profile_id", profile.id)
      .gte("review_date", weekStart)
      .lte("review_date", progressEnd)
      .order("review_date", { ascending: true }),
    supabase
      .from("weekly_reviews")
      .select("week_start, wins, failures, patterns, next_week_focus")
      .eq("profile_id", profile.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("pillars")
      .select("id, name")
      .eq("profile_id", profile.id),
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

  if (weeklyReviewError) {
    throw weeklyReviewError;
  }

  if (pillarsError) {
    throw pillarsError;
  }

  const pillarMap = new Map(
    ((pillars ?? []) as PillarRow[]).map((pillar) => [pillar.id, pillar.name]),
  );

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
        pillar: session.pillar_id ? (pillarMap.get(session.pillar_id) ?? "") : "",
        plannedMinutes: session.planned_minutes,
        actualMinutes: session.actual_minutes ?? session.planned_minutes,
        qualityRating: session.quality_rating ?? 4,
        workDepth: session.work_depth ?? "deep",
        createdAt: session.created_at ?? new Date().toISOString(),
      },
      session.session_date,
    ),
  );

  const reviews = (dailyReviews ?? []) as DailyReviewRow[];
  const reviewDateSet = new Set(reviews.map((review) => review.review_date));
  const plansByDate = new Map(normalizedPlans.map((plan) => [plan.planDate, plan]));
  const sessionsByDate = normalizedSessions.reduce((map, session) => {
    const existing = map.get(session.sessionDate) ?? [];
    map.set(session.sessionDate, [...existing, session]);
    return map;
  }, new Map<string, FocusSession[]>());

  const dailyScores = weekDates.map((date) =>
    computeDailyScore({
      dailyPlan: plansByDate.get(date) ?? createEmptyDailyPlan(date),
      sessions: sessionsByDate.get(date) ?? [],
      reviewCompleted: reviewDateSet.has(date),
    }),
  );
  const scoreByDate = new Map(weekDates.map((date, index) => [date, dailyScores[index] ?? 0]));
  const dailyBreakdown = weekDates.map((date) => {
    const score = scoreByDate.get(date) ?? 0;
    const reviewCompleted = reviewDateSet.has(date);
    const deepMinutes = (sessionsByDate.get(date) ?? [])
      .filter((session) => session.workDepth === "deep")
      .reduce((sum, session) => sum + session.actualMinutes, 0);
    const plan = plansByDate.get(date) ?? createEmptyDailyPlan(date);
    const status =
      !reviewCompleted && date === progressEnd
        ? "open"
        : score >= 75
          ? "winning"
          : score >= 60
            ? "solid"
            : score < 40
              ? "drift"
              : "open";

    return {
      date,
      label: formatWeekdayLabel(date),
      score,
      scoreLabel: getDailyScoreLabel(score),
      topTaskDone: plan.oneThingDone,
      deepMinutes,
      reviewCompleted,
      status,
    } satisfies import("@/lib/weekly-review").WeeklyReviewDaySummary;
  });

  const totalScore = dailyScores.reduce((sum, score) => sum + score, 0);
  const winningDays = dailyScores.filter((score) => score >= 75).length;
  const driftDays = dailyScores.filter((score) => score < 40).length;
  const deepMinutes = normalizedSessions
    .filter((session) => session.workDepth === "deep")
    .reduce((sum, session) => sum + session.actualMinutes, 0);
  const plansWithTopTask = normalizedPlans.filter((plan) => plan.oneThing.trim());
  const completedTopTasks = plansWithTopTask.filter((plan) => plan.oneThingDone).length;
  const missedTopTasks = plansWithTopTask.filter((plan) => !plan.oneThingDone).length;
  const topTaskCompletionRate =
    plansWithTopTask.length > 0
      ? Math.round((completedTopTasks / plansWithTopTask.length) * 100)
      : 0;
  const reviewCompletionRate =
    weekDates.length > 0 ? Math.round((reviewDateSet.size / weekDates.length) * 100) : 0;

  const summary = {
    weekStart,
    weekEnd: getWeekEnd(weekStart),
    daysElapsed: weekDates.length,
    winningDays,
    driftDays,
    totalScore,
    averageScore: weekDates.length > 0 ? Math.round(totalScore / weekDates.length) : 0,
    deepWorkHours: roundToSingleDecimal(deepMinutes / 60),
    sessionCount: normalizedSessions.length,
    topTaskCompletionRate,
    reviewCompletionRate,
    missedTopTasks,
    mostActivePillar: getMostActivePillar(normalizedSessions),
    repeatedExcuse: findRepeatedExcuse(reviews),
    mainLie: deriveMainLie({
      topTaskCompletionRate,
      deepWorkHours: deepMinutes / 60,
      reviewCompletionRate,
      missedTopTasks,
      sessionCount: normalizedSessions.length,
    }),
    currentStreak: computeCurrentStreak({
      dates: weekDates,
      reviewDateSet,
      scoreByDate,
      progressEnd,
    }),
    dailyBreakdown,
  };

  const reviewRow = (weeklyReview as WeeklyReviewRow | null) ?? null;

  if (!reviewRow) {
    return {
      review: null,
      summary,
    };
  }

  const patterns = parseWeeklyPatterns(reviewRow.patterns);

  return {
    review: normalizeWeeklyReviewState(
      {
        weekStart: reviewRow.week_start,
        movedForwardText: reviewRow.wins ?? "",
        wastedEffortText: reviewRow.failures ?? "",
        improveText: patterns.improveText,
        eliminateText: patterns.eliminateText,
        nextWeekFocus: reviewRow.next_week_focus ?? "",
      },
      weekStart,
    ),
    summary,
  };
}

export async function savePersistedWeeklyReview(
  identity: PersistenceIdentity,
  review: WeeklyReviewState,
  profileSeed?: {
    name?: string;
    tone?: "Honest" | "Strict" | "Supportive";
  },
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();
  const normalized = normalizeWeeklyReviewState(review, review.weekStart);
  const profileId = await createOrUpdateProfileFromSeed(identity, profileSeed);

  const { error } = await supabase.from("weekly_reviews").upsert(
    {
      profile_id: profileId,
      week_start: normalized.weekStart,
      wins: normalized.movedForwardText,
      failures: normalized.wastedEffortText,
      patterns: serializeWeeklyPatterns({
        improveText: normalized.improveText,
        eliminateText: normalized.eliminateText,
      }),
      next_week_focus: normalized.nextWeekFocus,
    },
    {
      onConflict: "profile_id,week_start",
    },
  );

  if (error) {
    throw error;
  }

  return "supabase";
}
