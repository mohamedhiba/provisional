export type DailyOutcome = {
  id: string;
  title: string;
  done: boolean;
};

export type DailyPlanState = {
  planDate: string;
  oneThing: string;
  oneThingDone: boolean;
  topThree: DailyOutcome[];
  status: "active" | "completed";
};

export const dailyPlanStorageKeyPrefix = "proof-daily-plan";

export function createOutcome(title = ""): DailyOutcome {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `outcome-${Math.random().toString(36).slice(2, 10)}`,
    title,
    done: false,
  };
}

export function getIsoDateForLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayIsoDate() {
  return getIsoDateForLocalDate(new Date());
}

export function getMillisecondsUntilNextLocalMidnight(reference = new Date()) {
  const nextMidnight = new Date(reference);
  nextMidnight.setHours(24, 0, 0, 250);

  return Math.max(250, nextMidnight.getTime() - reference.getTime());
}

export function createEmptyDailyPlan(planDate = getTodayIsoDate()): DailyPlanState {
  return {
    planDate,
    oneThing: "",
    oneThingDone: false,
    topThree: [createOutcome(), createOutcome(), createOutcome()],
    status: "active",
  };
}

export function normalizeDailyPlanState(
  value: Partial<DailyPlanState> | null | undefined,
  planDate = getTodayIsoDate(),
): DailyPlanState {
  const safe = value ?? {};
  const topThree =
    Array.isArray(safe.topThree) && safe.topThree.length > 0
      ? safe.topThree.slice(0, 3).map((item, index) => ({
          id: item.id || `outcome-restored-${index}`,
          title: item.title ?? "",
          done: Boolean(item.done),
        }))
      : createEmptyDailyPlan(planDate).topThree;

  while (topThree.length < 3) {
    topThree.push(createOutcome());
  }

  const oneThingDone = Boolean(safe.oneThingDone) && Boolean(safe.oneThing?.trim());
  const topThreeDone = topThree.filter((item) => item.done && item.title.trim()).length;

  return {
    planDate: safe.planDate ?? planDate,
    oneThing: safe.oneThing ?? "",
    oneThingDone,
    topThree,
    status:
      safe.status === "completed" || (oneThingDone && topThreeDone === 3)
        ? "completed"
        : "active",
  };
}

export function getDailyPlanStorageKey(planDate: string) {
  return `${dailyPlanStorageKeyPrefix}:${planDate}`;
}

export function readLocalDailyPlanState(planDate: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getDailyPlanStorageKey(planDate));

  if (!saved) {
    return null;
  }

  try {
    return normalizeDailyPlanState(
      JSON.parse(saved) as Partial<DailyPlanState>,
      planDate,
    );
  } catch {
    window.localStorage.removeItem(getDailyPlanStorageKey(planDate));
    return null;
  }
}

export function writeLocalDailyPlanState(state: DailyPlanState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getDailyPlanStorageKey(state.planDate),
    JSON.stringify(state),
  );
}

export function computeDailyPlanScore(plan: DailyPlanState) {
  const positiveScore =
    (plan.oneThingDone ? 30 : 0) +
    plan.topThree.reduce(
      (sum, item) => sum + (item.done && item.title.trim() ? 15 : 0),
      0,
    );

  return Math.min(100, Math.round((positiveScore / 75) * 100));
}

export function getDailyPlanLabel(score: number) {
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

export function getCompletedPriorityCount(plan: DailyPlanState) {
  return (
    Number(plan.oneThingDone) +
    plan.topThree.filter((item) => item.done && item.title.trim()).length
  );
}

export function getAntiDriftMessage(plan: DailyPlanState) {
  if (!plan.oneThing.trim()) {
    return "You have not chosen the highest-leverage task yet. Decide before busy work decides for you.";
  }

  if (!plan.oneThingDone && getCompletedPriorityCount(plan) > 0) {
    return "You are completing activity around the edges while the highest-value task stays open.";
  }

  if (plan.oneThingDone && getCompletedPriorityCount(plan) < 3) {
    return "The main task is done. Finish the remaining outcomes before the day drifts.";
  }

  return "The plan is aligned. Protect the standard and keep execution honest.";
}

export function formatPlanDate(planDate: string) {
  const date = new Date(`${planDate}T12:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
