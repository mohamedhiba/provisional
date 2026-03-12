import { getTodayIsoDate } from "@/lib/daily-plan";
import {
  formatWeeklyRange,
  getCurrentWeekStart,
  getWeekDates,
  getWeekEnd,
} from "@/lib/weekly-review";

export type AnalyticsDriftAlert = {
  id: string;
  level: "high" | "medium" | "low";
  title: string;
  body: string;
  metric: string;
  href: string;
};

export type AnalyticsActivityDay = {
  date: string;
  score: number;
  deepMinutes: number;
  topTaskDone: boolean;
  oneThingSet: boolean;
  reviewCompleted: boolean;
  sessionCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
};

export type AnalyticsWeekRow = {
  weekStart: string;
  label: string;
  topTaskCompletionRate: number;
  deepWorkHours: number;
  driftDays: number;
  reviewCompletionRate: number;
  winningDays: number;
  isCurrentWeek: boolean;
};

export type AnalyticsSnapshot = {
  currentStreak: number;
  weeklyHistory: AnalyticsWeekRow[];
  activityGrid: AnalyticsActivityDay[];
  driftAlerts: AnalyticsDriftAlert[];
};

function shiftIsoDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getAnalyticsRangeStart(referenceDate = getTodayIsoDate(), days = 84) {
  return shiftIsoDate(referenceDate, -(days - 1));
}

export function getActivityGridStart(referenceDate = getTodayIsoDate(), weeks = 12) {
  const currentWeekStart = getCurrentWeekStart(referenceDate);
  return shiftIsoDate(currentWeekStart, -7 * (weeks - 1));
}

export function getActivityGridEnd(referenceDate = getTodayIsoDate()) {
  return getWeekEnd(getCurrentWeekStart(referenceDate));
}

export function getHistoryWeekStarts(
  count = 4,
  currentWeekStart = getCurrentWeekStart(),
) {
  return Array.from({ length: count }, (_, index) =>
    shiftIsoDate(currentWeekStart, -7 * (count - index - 1)),
  );
}

export function createEmptyAnalyticsSnapshot(): AnalyticsSnapshot {
  const weekStarts = getHistoryWeekStarts();
  const currentWeekStart = getCurrentWeekStart();
  const today = getTodayIsoDate();
  const activityGrid = getWeekDates(getActivityGridStart(today), getActivityGridEnd(today));

  return {
    currentStreak: 0,
    weeklyHistory: weekStarts.map((weekStart) => ({
      weekStart,
      label: formatWeeklyRange(weekStart),
      topTaskCompletionRate: 0,
      deepWorkHours: 0,
      driftDays: 0,
      reviewCompletionRate: 0,
      winningDays: 0,
      isCurrentWeek: weekStart === currentWeekStart,
    })),
    activityGrid: activityGrid.map((date) => ({
      date,
      score: 0,
      deepMinutes: 0,
      topTaskDone: false,
      oneThingSet: false,
      reviewCompleted: false,
      sessionCount: 0,
      intensity: 0,
      isFuture: date > today,
    })),
    driftAlerts: [],
  };
}

export function formatActivityDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}
