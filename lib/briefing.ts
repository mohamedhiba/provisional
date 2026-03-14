import { getCurrentMonthStart, getMonthEnd } from "@/lib/monthly-mission";
import { getCurrentWeekStart } from "@/lib/weekly-review";

export type BriefingMomentId =
  | "day-start"
  | "midday-reset"
  | "week-start"
  | "midweek-correction"
  | "month-start"
  | "midmonth-checkpoint"
  | "month-end-push";

export type BriefingWindow = {
  id: BriefingMomentId;
  label: string;
  date: string;
  weekStart: string;
  monthStart: string;
  cacheBucket: string;
};

export type PersonalizedBriefing = {
  momentId: BriefingMomentId;
  momentLabel: string;
  title: string;
  summary: string;
  coachMessage: string;
  accountability: string;
  focus: string;
  actions: string[];
  evidence: Array<{
    label: string;
    value: string;
  }>;
  diagnostic?: {
    provider: "gemini" | "groq";
    model: string;
    code?: number;
    status?: string;
    reason: string;
    retryable: boolean;
  };
  generatedAt: string;
  source: "gemini" | "groq" | "fallback";
  cacheKey: string;
};

export function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function shiftIsoDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

export function shiftMonthStart(monthStart: string, months: number) {
  const date = new Date(`${monthStart}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(1);
  return toLocalIsoDate(date);
}

export function getMonthDayContext(monthStart: string, currentDate: string) {
  const current = new Date(`${currentDate}T12:00:00`);
  const dayOfMonth = current.getDate();
  const monthEnd = getMonthEnd(monthStart);
  const monthEndDate = new Date(`${monthEnd}T12:00:00`);
  const daysRemaining = monthEndDate.getDate() - dayOfMonth;

  return {
    dayOfMonth,
    daysRemaining,
    monthEnd,
  };
}

export function getBriefingWindow(
  date = new Date(),
  overrides?: Partial<Pick<BriefingWindow, "date" | "weekStart" | "monthStart">>,
): BriefingWindow {
  const currentDate = overrides?.date ?? toLocalIsoDate(date);
  const weekStart = overrides?.weekStart ?? getCurrentWeekStart(currentDate);
  const monthStart = overrides?.monthStart ?? getCurrentMonthStart(currentDate);
  const weekday = date.getDay();
  const hour = date.getHours();
  const { dayOfMonth, daysRemaining } = getMonthDayContext(monthStart, currentDate);

  let id: BriefingMomentId = "midday-reset";
  let label = "Midday reset";

  if (daysRemaining <= 3) {
    id = "month-end-push";
    label = "Month-end push";
  } else if (dayOfMonth >= 14 && dayOfMonth <= 18) {
    id = "midmonth-checkpoint";
    label = "Midmonth checkpoint";
  } else if (dayOfMonth <= 3 && hour < 15) {
    id = "month-start";
    label = "Month opening";
  } else if (weekday === 1 && hour < 13) {
    id = "week-start";
    label = "Week opening";
  } else if ((weekday === 3 || weekday === 4) && hour < 16) {
    id = "midweek-correction";
    label = "Midweek correction";
  } else if (hour < 11) {
    id = "day-start";
    label = "Morning brief";
  }

  const cacheAnchor =
    id === "day-start" || id === "midday-reset"
      ? currentDate
      : id === "week-start" || id === "midweek-correction"
        ? weekStart
        : monthStart;

  return {
    id,
    label,
    date: currentDate,
    weekStart,
    monthStart,
    cacheBucket: `${id}:${cacheAnchor}`,
  };
}

export function isBriefingMomentId(value: string | null | undefined): value is BriefingMomentId {
  return (
    value === "day-start" ||
    value === "midday-reset" ||
    value === "week-start" ||
    value === "midweek-correction" ||
    value === "month-start" ||
    value === "midmonth-checkpoint" ||
    value === "month-end-push"
  );
}

export function getBriefingPromptDirective(momentId: BriefingMomentId) {
  switch (momentId) {
    case "day-start":
      return "Write a morning opening brief. Prioritize clarity, commitment, and the first serious move.";
    case "midday-reset":
      return "Write a midday reset. Assume the day is already unfolding and correct avoidance quickly.";
    case "week-start":
      return "Write an early-week mission brief. Connect the week to the month and force a concrete opening move.";
    case "midweek-correction":
      return "Write a midweek correction. Diagnose the pattern honestly and tell the user how to salvage the week.";
    case "month-start":
      return "Write a month-opening brief. Make the month feel like a campaign with clear standards.";
    case "midmonth-checkpoint":
      return "Write a midmonth checkpoint. Compare actual progress to the declared mission and sharpen the correction.";
    case "month-end-push":
      return "Write a closeout brief for the end of the month. Treat the remaining days like a deadline window.";
  }
}

export function getBriefingMomentLabel(momentId: BriefingMomentId) {
  switch (momentId) {
    case "day-start":
      return "Morning brief";
    case "midday-reset":
      return "Midday reset";
    case "week-start":
      return "Week opening";
    case "midweek-correction":
      return "Midweek correction";
    case "month-start":
      return "Month opening";
    case "midmonth-checkpoint":
      return "Midmonth checkpoint";
    case "month-end-push":
      return "Month-end push";
  }
}

export function hashBriefingSignature(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
