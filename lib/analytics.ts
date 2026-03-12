import { getTodayIsoDate } from "@/lib/daily-plan";
import { formatWeeklyRange, getCurrentWeekStart } from "@/lib/weekly-review";

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
  };
}

