import { getTodayIsoDate } from "@/lib/daily-plan";
import {
  normalizeWeekStartPreference,
  type WeekStartPreference,
} from "@/lib/onboarding";

export type WeeklyReviewState = {
  weekStart: string;
  movedForwardText: string;
  wastedEffortText: string;
  improveText: string;
  eliminateText: string;
  nextWeekFocus: string;
};

export type WeeklyReviewPatterns = {
  improveText: string;
  eliminateText: string;
};

export type WeeklyReviewDaySummary = {
  date: string;
  label: string;
  score: number;
  scoreLabel: string;
  topTaskDone: boolean;
  deepMinutes: number;
  reviewCompleted: boolean;
  status: "winning" | "solid" | "drift" | "open";
};

export type WeeklyReviewSummary = {
  weekStart: string;
  weekEnd: string;
  daysElapsed: number;
  winningDays: number;
  driftDays: number;
  totalScore: number;
  averageScore: number;
  deepWorkHours: number;
  sessionCount: number;
  topTaskCompletionRate: number;
  reviewCompletionRate: number;
  missedTopTasks: number;
  mostActivePillar: string;
  repeatedExcuse: string;
  mainLie: string;
  currentStreak: number;
  dailyBreakdown: WeeklyReviewDaySummary[];
};

export const weeklyReviewStorageKeyPrefix = "proof-weekly-review";
export const weeklyReviewDraftStorageKeyPrefix = "proof-weekly-review-draft";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekStartDayIndex(weekStartsOn: WeekStartPreference = "monday") {
  const normalized = normalizeWeekStartPreference(weekStartsOn);
  const indexByWeekStart: Record<WeekStartPreference, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  return indexByWeekStart[normalized];
}

export function getCurrentWeekStart(
  referenceDate = getTodayIsoDate(),
  weekStartsOn: WeekStartPreference = "monday",
) {
  const date = new Date(`${referenceDate}T12:00:00`);
  const day = date.getDay();
  const weekStartDayIndex = getWeekStartDayIndex(weekStartsOn);
  const diff = (day - weekStartDayIndex + 7) % 7;
  date.setDate(date.getDate() - diff);

  return toIsoDate(date);
}

export function getWeekEnd(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + 6);
  return toIsoDate(date);
}

export function getWeekDates(weekStart: string, weekEnd = getWeekEnd(weekStart)) {
  const dates: string[] = [];
  const cursor = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);

  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function formatWeeklyRange(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${getWeekEnd(weekStart)}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function createEmptyWeeklyReview(
  weekStart = getCurrentWeekStart(),
): WeeklyReviewState {
  return {
    weekStart,
    movedForwardText: "",
    wastedEffortText: "",
    improveText: "",
    eliminateText: "",
    nextWeekFocus: "",
  };
}

export function normalizeWeeklyReviewState(
  value: Partial<WeeklyReviewState> | null | undefined,
  weekStart = getCurrentWeekStart(),
): WeeklyReviewState {
  const safe = value ?? {};

  return {
    weekStart: safe.weekStart ?? weekStart,
    movedForwardText: safe.movedForwardText ?? "",
    wastedEffortText: safe.wastedEffortText ?? "",
    improveText: safe.improveText ?? "",
    eliminateText: safe.eliminateText ?? "",
    nextWeekFocus: safe.nextWeekFocus ?? "",
  };
}

export function createEmptyWeeklySummary(
  weekStart = getCurrentWeekStart(),
): WeeklyReviewSummary {
  return {
    weekStart,
    weekEnd: getWeekEnd(weekStart),
    daysElapsed: 0,
    winningDays: 0,
    driftDays: 0,
    totalScore: 0,
    averageScore: 0,
    deepWorkHours: 0,
    sessionCount: 0,
    topTaskCompletionRate: 0,
    reviewCompletionRate: 0,
    missedTopTasks: 0,
    mostActivePillar: "No pillar evidence yet.",
    repeatedExcuse: "No excuse pattern recorded yet.",
    mainLie: "No weekly pattern detected yet.",
    currentStreak: 0,
    dailyBreakdown: [],
  };
}

export function formatWeekdayLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

export function getWeeklyReviewStorageKey(weekStart: string) {
  return `${weeklyReviewStorageKeyPrefix}:${weekStart}`;
}

export function getWeeklyReviewDraftStorageKey(weekStart: string) {
  return `${weeklyReviewDraftStorageKeyPrefix}:${weekStart}`;
}

export function readLocalWeeklyReviewState(weekStart: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getWeeklyReviewStorageKey(weekStart));

  if (!saved) {
    return null;
  }

  try {
    return normalizeWeeklyReviewState(
      JSON.parse(saved) as Partial<WeeklyReviewState>,
      weekStart,
    );
  } catch {
    window.localStorage.removeItem(getWeeklyReviewStorageKey(weekStart));
    return null;
  }
}

export function readLocalWeeklyReviewDraft(weekStart: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getWeeklyReviewDraftStorageKey(weekStart));

  if (!saved) {
    return null;
  }

  try {
    return normalizeWeeklyReviewState(
      JSON.parse(saved) as Partial<WeeklyReviewState>,
      weekStart,
    );
  } catch {
    window.localStorage.removeItem(getWeeklyReviewDraftStorageKey(weekStart));
    return null;
  }
}

export function writeLocalWeeklyReviewState(state: WeeklyReviewState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getWeeklyReviewStorageKey(state.weekStart),
    JSON.stringify(state),
  );
}

export function writeLocalWeeklyReviewDraft(state: WeeklyReviewState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getWeeklyReviewDraftStorageKey(state.weekStart),
    JSON.stringify(state),
  );
}

export function clearLocalWeeklyReviewDraft(weekStart: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getWeeklyReviewDraftStorageKey(weekStart));
}

export function isWeeklyReviewEmpty(state: WeeklyReviewState) {
  return !(
    state.movedForwardText.trim() ||
    state.wastedEffortText.trim() ||
    state.improveText.trim() ||
    state.eliminateText.trim() ||
    state.nextWeekFocus.trim()
  );
}

export function validateWeeklyReview(state: WeeklyReviewState) {
  const requiredFields = [
    state.movedForwardText,
    state.wastedEffortText,
    state.improveText,
    state.eliminateText,
    state.nextWeekFocus,
  ];

  if (requiredFields.some((value) => !value.trim())) {
    return "Fill every reflection field so the next week starts with a standard, not a vague hope.";
  }

  return "";
}

export function serializeWeeklyPatterns(patterns: WeeklyReviewPatterns) {
  return JSON.stringify(patterns);
}

export function parseWeeklyPatterns(value: string | null | undefined): WeeklyReviewPatterns {
  if (!value) {
    return {
      improveText: "",
      eliminateText: "",
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<WeeklyReviewPatterns>;
    return {
      improveText: parsed.improveText ?? "",
      eliminateText: parsed.eliminateText ?? "",
    };
  } catch {
    return {
      improveText: value,
      eliminateText: "",
    };
  }
}
