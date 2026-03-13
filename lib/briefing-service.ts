import "server-only";

import { loadAnalyticsSnapshot } from "@/lib/analytics-repository";
import {
  getBriefingPromptDirective,
  shiftIsoDate,
  shiftMonthStart,
  type BriefingMomentId,
  type BriefingWindow,
  type PersonalizedBriefing,
} from "@/lib/briefing";
import { env } from "@/lib/env";
import { computeMonthlyMissionProgress } from "@/lib/monthly-mission";
import { loadPersistedMonthlyMission } from "@/lib/monthly-mission-repository";
import { loadPersistedDailyPlan } from "@/lib/daily-plan-repository";
import { loadPersistedDailyReview } from "@/lib/daily-review-repository";
import {
  loadPersistedOnboardingState,
  type PersistenceIdentity,
} from "@/lib/profile-repository";
import { loadPersistedWeeklyReviewSnapshot } from "@/lib/weekly-review-repository";

type BriefingContext = {
  name: string;
  tone: string;
  mission: string;
  longTermGoal: string;
  pillars: string[];
  momentId: BriefingMomentId;
  momentLabel: string;
  today: {
    oneThing: string;
    oneThingDone: boolean;
    score: number;
    deepMinutes: number;
    sessionCount: number;
  };
  yesterday: {
    score: number;
    reviewCompleted: boolean;
    topTaskDone: boolean;
    avoidedText: string;
    wastedTimeText: string;
    tomorrowFirstMove: string;
  };
  week: {
    winningDays: number;
    driftDays: number;
    topTaskCompletionRate: number;
    deepWorkHours: number;
    reviewCompletionRate: number;
    currentStreak: number;
    nextWeekFocus: string;
    previousDeepWorkHours: number;
  };
  month: {
    focusTheme: string;
    primaryMission: string;
    progressPercent: number;
    completedTargets: number;
    activeTargets: number;
    currentWeekFocus: string;
    previousMonthAverageScore: number;
    currentMonthAverageScore: number;
    daysRemaining: number;
  };
  alerts: string[];
};

function clampActions(actions: string[]) {
  return actions
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildFallbackBriefing(context: BriefingContext, cacheKey: string): PersonalizedBriefing {
  const actions: string[] = [];
  const todayFocus =
    context.today.oneThing.trim() || context.month.currentWeekFocus.trim() || "Define the next serious move.";

  if (!context.today.oneThing.trim()) {
    actions.push("Set the one thing now before easier work starts impersonating progress.");
  } else if (!context.today.oneThingDone && context.today.deepMinutes === 0) {
    actions.push(`Start one protected deep block on: ${context.today.oneThing}.`);
  } else if (!context.today.oneThingDone) {
    actions.push(`Finish the one thing before expanding into lower-value work: ${context.today.oneThing}.`);
  } else {
    actions.push("Protect the next high-value block so the day keeps producing evidence.");
  }

  if (context.week.topTaskCompletionRate < 50) {
    actions.push("Reduce the plan back to the hardest outcome and stop rewarding side quests.");
  } else if (context.week.reviewCompletionRate < 60) {
    actions.push("Close the day honestly tonight so the week stops slipping through open loops.");
  } else {
    actions.push("Keep the standard tight and make the next logged session count as proof.");
  }

  if (context.month.daysRemaining <= 5 || context.month.progressPercent < 45) {
    actions.push("Cut anything not tied to the monthly mission and protect one measurable win before the window closes.");
  } else {
    actions.push("Use the month target board to convert momentum into a visible checkpoint.");
  }

  const momentCopy: Record<BriefingMomentId, { title: string; summary: string; focus: string }> = {
    "day-start": {
      title: "Start with the real priority",
      summary: `Yesterday scored ${context.yesterday.score}. This morning should make drift harder before the day starts getting noisy.`,
      focus: `What matters first: ${todayFocus}`,
    },
    "midday-reset": {
      title: "Reset before the afternoon slips",
      summary: `Today is at ${context.today.score} with ${context.today.deepMinutes} deep minutes logged. Activity is only useful if it serves the one thing.`,
      focus: `Immediate correction: ${todayFocus}`,
    },
    "week-start": {
      title: "Open the week on purpose",
      summary: `Last week finished with ${context.week.previousDeepWorkHours.toFixed(1)} deep-work hours. This week needs a visible first move, not another soft start.`,
      focus: `Week bridge: ${context.month.currentWeekFocus.trim() || todayFocus}`,
    },
    "midweek-correction": {
      title: "Midweek is where drift shows",
      summary: `The week is at ${context.week.winningDays} winning days with ${context.week.driftDays} drift days. Correct the pattern now while there is still time to salvage momentum.`,
      focus: `What to protect next: ${todayFocus}`,
    },
    "month-start": {
      title: "Make the month concrete early",
      summary: `The month theme is ${context.month.focusTheme || "not defined clearly enough yet"}. Early days decide whether the month becomes a campaign or another wish list.`,
      focus: `Monthly front line: ${context.month.primaryMission || todayFocus}`,
    },
    "midmonth-checkpoint": {
      title: "Halfway means no hiding",
      summary: `Month progress is ${context.month.progressPercent}% across ${context.month.completedTargets}/${context.month.activeTargets} active targets. Midmonth is where story and scoreboard have to agree.`,
      focus: `Critical checkpoint: ${context.month.primaryMission || todayFocus}`,
    },
    "month-end-push": {
      title: "Close the month deliberately",
      summary: `${context.month.daysRemaining} day${context.month.daysRemaining === 1 ? "" : "s"} remain and month progress is ${context.month.progressPercent}%. Finish what still changes the scoreboard and stop pretending there is more runway than there is.`,
      focus: `Closeout target: ${context.month.primaryMission || todayFocus}`,
    },
  };

  const selected = momentCopy[context.momentId];

  return {
    momentId: context.momentId,
    momentLabel: context.momentLabel,
    title: selected.title,
    summary: selected.summary,
    focus: selected.focus,
    actions: clampActions(actions),
    generatedAt: new Date().toISOString(),
    source: "fallback",
    cacheKey,
  };
}

function normalizeGeneratedBrief(
  input: Partial<Pick<PersonalizedBriefing, "title" | "summary" | "focus" | "actions">>,
  context: BriefingContext,
  cacheKey: string,
): PersonalizedBriefing {
  const fallback = buildFallbackBriefing(context, cacheKey);
  const actions = clampActions(Array.isArray(input.actions) ? input.actions : []);

  return {
    ...fallback,
    title: input.title?.trim() || fallback.title,
    summary: input.summary?.trim() || fallback.summary,
    focus: input.focus?.trim() || fallback.focus,
    actions: actions.length >= 2 ? actions : fallback.actions,
    generatedAt: new Date().toISOString(),
    source: "gemini",
    cacheKey,
  };
}

async function generateWithGemini(
  context: BriefingContext,
  cacheKey: string,
): Promise<PersonalizedBriefing> {
  const prompt = [
    "You write short execution briefings for a serious accountability app called Proof.",
    "The tone must be personal, sharp, honest, motivating, and slightly uncomfortable without being cruel.",
    "Avoid cliches, hype, therapy language, emojis, and generic advice.",
    "Mention at least one concrete metric from the context.",
    "Keep the summary tight. Make the focus line actionable. Return 2 or 3 actions only.",
    getBriefingPromptDirective(context.momentId),
    "Return valid JSON with exactly these keys: title, summary, focus, actions.",
    "Context:",
    JSON.stringify(context, null, 2),
  ].join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.googleAiModel}:generateContent?key=${env.googleAiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(rawText) as Partial<{
    title: string;
    summary: string;
    focus: string;
    actions: string[];
  }>;

  return normalizeGeneratedBrief(parsed, context, cacheKey);
}

async function buildBriefingContext(
  identity: PersistenceIdentity,
  window: BriefingWindow,
): Promise<BriefingContext> {
  const yesterday = shiftIsoDate(window.date, -1);
  const previousWeekStart = shiftIsoDate(window.weekStart, -7);
  const previousMonthStart = shiftMonthStart(window.monthStart, -1);

  const [
    onboarding,
    todayPlan,
    yesterdayReview,
    currentWeek,
    previousWeek,
    currentMission,
    analyticsSnapshot,
  ] = await Promise.all([
    loadPersistedOnboardingState(identity),
    loadPersistedDailyPlan(identity, window.date),
    loadPersistedDailyReview(identity, yesterday),
    loadPersistedWeeklyReviewSnapshot(identity, window.weekStart),
    loadPersistedWeeklyReviewSnapshot(identity, previousWeekStart),
    loadPersistedMonthlyMission(identity, window.monthStart),
    loadAnalyticsSnapshot(identity),
  ]);

  const todayActivity =
    analyticsSnapshot.activityGrid.find((day) => day.date === window.date) ?? null;
  const yesterdayActivity =
    analyticsSnapshot.activityGrid.find((day) => day.date === yesterday) ?? null;
  const monthlyProgress = computeMonthlyMissionProgress(currentMission);

  const currentMonthDays = analyticsSnapshot.activityGrid.filter(
    (day) => day.date >= window.monthStart && day.date <= window.date && !day.isFuture,
  );
  const previousMonthEnd = shiftIsoDate(window.monthStart, -1);
  const previousMonthDays = analyticsSnapshot.activityGrid.filter(
    (day) =>
      day.date >= previousMonthStart &&
      day.date <= previousMonthEnd &&
      !day.isFuture,
  );

  const currentMonthAverageScore =
    currentMonthDays.length > 0
      ? Math.round(
          currentMonthDays.reduce((sum, day) => sum + day.score, 0) / currentMonthDays.length,
        )
      : 0;
  const previousMonthAverageScore =
    previousMonthDays.length > 0
      ? Math.round(
          previousMonthDays.reduce((sum, day) => sum + day.score, 0) / previousMonthDays.length,
        )
      : 0;

  const monthEnd = new Date(`${window.monthStart}T12:00:00`);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  const currentDate = new Date(`${window.date}T12:00:00`);
  const daysRemaining = Math.max(
    0,
    Math.round((monthEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    name: onboarding?.name.trim() || "Proof user",
    tone: onboarding?.tone ?? "Honest",
    mission: onboarding?.mission.trim() || "",
    longTermGoal: onboarding?.longTermGoal.trim() || "",
    pillars: onboarding?.pillars ?? [],
    momentId: window.id,
    momentLabel: window.label,
    today: {
      oneThing: todayPlan?.oneThing.trim() ?? "",
      oneThingDone: todayPlan?.oneThingDone ?? false,
      score: todayActivity?.score ?? 0,
      deepMinutes: todayActivity?.deepMinutes ?? 0,
      sessionCount: todayActivity?.sessionCount ?? 0,
    },
    yesterday: {
      score: yesterdayActivity?.score ?? 0,
      reviewCompleted: yesterdayActivity?.reviewCompleted ?? false,
      topTaskDone: yesterdayActivity?.topTaskDone ?? false,
      avoidedText: yesterdayReview?.avoidedText.trim() ?? "",
      wastedTimeText: yesterdayReview?.wastedTimeText.trim() ?? "",
      tomorrowFirstMove: yesterdayReview?.tomorrowFirstMove.trim() ?? "",
    },
    week: {
      winningDays: currentWeek.summary.winningDays,
      driftDays: currentWeek.summary.driftDays,
      topTaskCompletionRate: currentWeek.summary.topTaskCompletionRate,
      deepWorkHours: currentWeek.summary.deepWorkHours,
      reviewCompletionRate: currentWeek.summary.reviewCompletionRate,
      currentStreak: currentWeek.summary.currentStreak,
      nextWeekFocus: currentWeek.review?.nextWeekFocus.trim() ?? "",
      previousDeepWorkHours: previousWeek.summary.deepWorkHours,
    },
    month: {
      focusTheme: currentMission?.focusTheme.trim() ?? "",
      primaryMission: currentMission?.primaryMission.trim() ?? "",
      progressPercent: monthlyProgress.progressPercent,
      completedTargets: monthlyProgress.completedTargets,
      activeTargets: monthlyProgress.activeTargets,
      currentWeekFocus: currentMission?.currentWeekFocus.trim() ?? "",
      previousMonthAverageScore,
      currentMonthAverageScore,
      daysRemaining,
    },
    alerts: analyticsSnapshot.driftAlerts.map((alert) => `${alert.title} (${alert.metric})`),
  };
}

export async function createPersonalizedBriefing(
  identity: PersistenceIdentity,
  window: BriefingWindow,
): Promise<PersonalizedBriefing> {
  const cacheKey = window.cacheBucket;
  const context = await buildBriefingContext(identity, window);

  if (!env.hasGoogleAiEnv) {
    return buildFallbackBriefing(context, cacheKey);
  }

  try {
    return await generateWithGemini(context, cacheKey);
  } catch {
    return buildFallbackBriefing(context, cacheKey);
  }
}
