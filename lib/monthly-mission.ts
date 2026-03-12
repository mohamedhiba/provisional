import { getTodayIsoDate } from "@/lib/daily-plan";

export type MonthlyMissionTarget = {
  id: string;
  label: string;
  currentNumber: string;
  targetNumber: string;
  unit: string;
};

export type MonthlyMissionState = {
  monthStart: string;
  focusTheme: string;
  primaryMission: string;
  whyThisMatters: string;
  mustProtect: string;
  mustIgnore: string;
  currentWeekFocus: string;
  targets: MonthlyMissionTarget[];
};

export const monthlyMissionStorageKeyPrefix = "proof-monthly-mission";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCurrentMonthStart(referenceDate = getTodayIsoDate()) {
  const date = new Date(`${referenceDate}T12:00:00`);
  date.setDate(1);
  return toIsoDate(date);
}

export function getMonthEnd(monthStart: string) {
  const date = new Date(`${monthStart}T12:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toIsoDate(date);
}

export function formatMonthLabel(monthStart: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T12:00:00`));
}

export function createMonthlyMissionTarget(
  value: Partial<MonthlyMissionTarget> = {},
): MonthlyMissionTarget {
  return {
    id:
      value.id ??
      globalThis.crypto?.randomUUID?.() ??
      `monthly-target-${Math.random().toString(36).slice(2, 10)}`,
    label: value.label ?? "",
    currentNumber: value.currentNumber ?? "0",
    targetNumber: value.targetNumber ?? "",
    unit: value.unit ?? "",
  };
}

export function createEmptyMonthlyMission(
  monthStart = getCurrentMonthStart(),
): MonthlyMissionState {
  return {
    monthStart,
    focusTheme: "",
    primaryMission: "",
    whyThisMatters: "",
    mustProtect: "",
    mustIgnore: "",
    currentWeekFocus: "",
    targets: [
      createMonthlyMissionTarget(),
      createMonthlyMissionTarget(),
      createMonthlyMissionTarget(),
    ],
  };
}

export function normalizeMonthlyMissionState(
  value: Partial<MonthlyMissionState> | null | undefined,
  monthStart = getCurrentMonthStart(),
): MonthlyMissionState {
  const safe = value ?? {};
  const targets =
    Array.isArray(safe.targets) && safe.targets.length > 0
      ? safe.targets.map((target) => createMonthlyMissionTarget(target))
      : [createMonthlyMissionTarget()];

  return {
    monthStart: safe.monthStart ?? monthStart,
    focusTheme: safe.focusTheme ?? "",
    primaryMission: safe.primaryMission ?? "",
    whyThisMatters: safe.whyThisMatters ?? "",
    mustProtect: safe.mustProtect ?? "",
    mustIgnore: safe.mustIgnore ?? "",
    currentWeekFocus: safe.currentWeekFocus ?? "",
    targets,
  };
}

export function getMonthlyMissionStorageKey(monthStart: string) {
  return `${monthlyMissionStorageKeyPrefix}:${monthStart}`;
}

export function readLocalMonthlyMissionState(monthStart: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getMonthlyMissionStorageKey(monthStart));

  if (!saved) {
    return null;
  }

  try {
    return normalizeMonthlyMissionState(
      JSON.parse(saved) as Partial<MonthlyMissionState>,
      monthStart,
    );
  } catch {
    window.localStorage.removeItem(getMonthlyMissionStorageKey(monthStart));
    return null;
  }
}

export function writeLocalMonthlyMissionState(state: MonthlyMissionState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getMonthlyMissionStorageKey(state.monthStart),
    JSON.stringify(state),
  );
}

export function validateMonthlyMission(state: MonthlyMissionState) {
  const hasTarget = state.targets.some(
    (target) => target.label.trim() && Number(target.targetNumber) > 0,
  );

  if (
    !state.focusTheme.trim() ||
    !state.primaryMission.trim() ||
    !state.whyThisMatters.trim() ||
    !state.mustProtect.trim() ||
    !state.mustIgnore.trim() ||
    !state.currentWeekFocus.trim()
  ) {
    return "Define the monthly theme, mission, constraints, and weekly bridge before locking the month.";
  }

  if (!hasTarget) {
    return "Add at least one measurable target for the month.";
  }

  return "";
}

export function computeMonthlyMissionProgress(state: MonthlyMissionState | null) {
  if (!state) {
    return {
      activeTargets: 0,
      completedTargets: 0,
      progressPercent: 0,
    };
  }

  const activeTargets = state.targets.filter(
    (target) => target.label.trim() && Number(target.targetNumber) > 0,
  );
  const completedTargets = activeTargets.filter((target) => {
    const current = Number(target.currentNumber || "0");
    const targetValue = Number(target.targetNumber);
    return Number.isFinite(current) && Number.isFinite(targetValue) && current >= targetValue;
  }).length;
  const progressPercent =
    activeTargets.length > 0
      ? Math.round(
          (activeTargets.reduce((sum, target) => {
            const current = Number(target.currentNumber || "0");
            const targetValue = Number(target.targetNumber || "0");

            if (!Number.isFinite(current) || !Number.isFinite(targetValue) || targetValue <= 0) {
              return sum;
            }

            return sum + Math.min(1, current / targetValue);
          }, 0) /
            activeTargets.length) *
            100,
        )
      : 0;

  return {
    activeTargets: activeTargets.length,
    completedTargets,
    progressPercent,
  };
}

