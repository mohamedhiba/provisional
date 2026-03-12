import type { DailyPlanState } from "@/lib/daily-plan";
import { computeFocusSessionMetrics, type FocusSession } from "@/lib/focus-session";

export function computeDailyScore({
  dailyPlan,
  sessions,
  reviewCompleted,
}: {
  dailyPlan: DailyPlanState;
  sessions: FocusSession[];
  reviewCompleted: boolean;
}) {
  let score = 0;

  if (dailyPlan.oneThingDone) {
    score += 30;
  } else if (dailyPlan.oneThing.trim()) {
    score -= 10;
  }

  score += dailyPlan.topThree.reduce(
    (sum, item) => sum + (item.done && item.title.trim() ? 15 : 0),
    0,
  );

  if (sessions.length > 0) {
    score += 10;
  } else {
    score -= 10;
  }

  const sessionMetrics = computeFocusSessionMetrics(sessions);

  if (sessionMetrics.deepMinutes >= 90) {
    score += 5;
  }

  if (reviewCompleted) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function getDailyScoreLabel(score: number) {
  if (score >= 90) {
    return "Elite";
  }

  if (score >= 75) {
    return "Strong";
  }

  if (score >= 60) {
    return "Acceptable";
  }

  if (score >= 40) {
    return "Weak";
  }

  return "Drift";
}

export function getDailyJudgmentLine({
  score,
  oneThingDone,
  hasSessions,
  reviewCompleted,
}: {
  score: number;
  oneThingDone: boolean;
  hasSessions: boolean;
  reviewCompleted: boolean;
}) {
  if (!reviewCompleted) {
    return "The day is still open. It does not count until you close it honestly.";
  }

  if (score >= 90) {
    return "You backed the day with real evidence and finished strong.";
  }

  if (!oneThingDone) {
    return "The top priority stayed open. That matters more than minor wins.";
  }

  if (!hasSessions) {
    return "Intent was present, but the day lacks logged evidence of focused work.";
  }

  if (score >= 60) {
    return "The day moved forward, but there is still drift to cut out.";
  }

  return "The day slipped. Use the review to stop the pattern from repeating.";
}
