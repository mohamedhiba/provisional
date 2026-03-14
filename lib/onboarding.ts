import { normalizeTimeZone } from "@/lib/time-zone";

export type WeeklyTarget = {
  id: string;
  pillar: string;
  label: string;
  targetNumber: string;
  targetUnit: string;
};

export type AccountabilityTone = "Honest" | "Strict" | "Supportive";
export type WeekStartPreference =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OnboardingPersistenceSource = "local" | "supabase" | "none";

export type OnboardingSyncStatus =
  | "booting"
  | "ready"
  | "saving"
  | "saved-local"
  | "saved-remote"
  | "error";

export type OnboardingState = {
  name: string;
  mission: string;
  longTermGoal: string;
  timeZone: string;
  weekStartsOn: WeekStartPreference;
  pillars: string[];
  weeklyTargets: WeeklyTarget[];
  nonNegotiables: string;
  defaultFirstMove: string;
  tone: AccountabilityTone;
};

export const onboardingStorageKey = "proof-onboarding-v1";
export const onboardingDeviceCookieKey = "proof-device-id";

export const pillarOptions = [
  "Work",
  "Personal",
  "Study",
  "Academics",
  "Career",
  "Health",
  "Relationships",
  "Discipline",
  "Build",
  "Finances",
];

export const accountabilityTones: AccountabilityTone[] = [
  "Honest",
  "Strict",
  "Supportive",
];

export const weekStartOptions: Array<{
  value: WeekStartPreference;
  label: string;
}> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export function normalizeWeekStartPreference(
  value: string | null | undefined,
): WeekStartPreference {
  const normalized = value?.trim().toLowerCase() as WeekStartPreference | undefined;

  if (weekStartOptions.some((option) => option.value === normalized)) {
    return normalized as WeekStartPreference;
  }

  return "monday";
}

export function getWeekStartLabel(value: string | null | undefined) {
  const normalized = normalizeWeekStartPreference(value);
  return weekStartOptions.find((option) => option.value === normalized)?.label ?? "Monday";
}

export function createWeeklyTarget(pillar = ""): WeeklyTarget {
  return {
    id: `target-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`,
    pillar,
    label: "",
    targetNumber: "",
    targetUnit: "per week",
  };
}

export const defaultOnboardingState: OnboardingState = {
  name: "",
  mission: "",
  longTermGoal: "",
  timeZone: "",
  weekStartsOn: "monday",
  pillars: ["Work", "Health", "Personal"],
  weeklyTargets: [
    {
      id: "target-work",
      pillar: "Work",
      label: "High-value work blocks",
      targetNumber: "10",
      targetUnit: "per week",
    },
    {
      id: "target-health",
      pillar: "Health",
      label: "Training or recovery sessions",
      targetNumber: "4",
      targetUnit: "per week",
    },
    {
      id: "target-personal",
      pillar: "Personal",
      label: "Life upkeep blocks",
      targetNumber: "3",
      targetUnit: "per week",
    },
  ],
  nonNegotiables: "",
  defaultFirstMove: "",
  tone: "Honest",
};

export function normalizeOnboardingState(
  value: Partial<OnboardingState> | null | undefined,
): OnboardingState {
  const safe = value ?? {};
  const tone = accountabilityTones.includes(
    safe.tone as AccountabilityTone,
  )
    ? (safe.tone as AccountabilityTone)
    : defaultOnboardingState.tone;
  const pillars = Array.isArray(safe.pillars) && safe.pillars.length > 0
    ? safe.pillars.filter(Boolean).slice(0, 4)
    : defaultOnboardingState.pillars;
  const weeklyTargets =
    Array.isArray(safe.weeklyTargets) && safe.weeklyTargets.length > 0
      ? safe.weeklyTargets.map((target, index) => ({
          id: target.id || `target-restored-${index}`,
          pillar: target.pillar || pillars[index] || "",
          label: target.label || "",
          targetNumber: target.targetNumber || "",
          targetUnit: target.targetUnit || "per week",
        }))
      : defaultOnboardingState.weeklyTargets;

  return {
    name: safe.name ?? defaultOnboardingState.name,
    mission: safe.mission ?? defaultOnboardingState.mission,
    longTermGoal: safe.longTermGoal ?? defaultOnboardingState.longTermGoal,
    timeZone: normalizeTimeZone(safe.timeZone),
    weekStartsOn: normalizeWeekStartPreference(safe.weekStartsOn),
    pillars,
    weeklyTargets,
    nonNegotiables:
      safe.nonNegotiables ?? defaultOnboardingState.nonNegotiables,
    defaultFirstMove:
      safe.defaultFirstMove ?? defaultOnboardingState.defaultFirstMove,
    tone,
  };
}

export function readLocalOnboardingState() {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(onboardingStorageKey);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<OnboardingState>;
    return normalizeOnboardingState(parsed);
  } catch {
    window.localStorage.removeItem(onboardingStorageKey);
    return null;
  }
}

export function writeLocalOnboardingState(value: OnboardingState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(onboardingStorageKey, JSON.stringify(value));
}
