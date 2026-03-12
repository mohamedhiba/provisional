export type WeeklyTarget = {
  id: string;
  pillar: string;
  label: string;
  targetNumber: string;
  targetUnit: string;
};

export type AccountabilityTone = "Honest" | "Strict" | "Supportive";

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
  pillars: string[];
  weeklyTargets: WeeklyTarget[];
  nonNegotiables: string;
  defaultFirstMove: string;
  tone: AccountabilityTone;
};

export const onboardingStorageKey = "proof-onboarding-v1";
export const onboardingDeviceCookieKey = "proof-device-id";

export const pillarOptions = [
  "Academics",
  "Career",
  "Health",
  "Discipline",
  "Build",
  "Finances",
];

export const accountabilityTones: AccountabilityTone[] = [
  "Honest",
  "Strict",
  "Supportive",
];

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
  pillars: ["Academics", "Career", "Health"],
  weeklyTargets: [
    {
      id: "target-career",
      pillar: "Career",
      label: "Applications sent",
      targetNumber: "10",
      targetUnit: "per week",
    },
    {
      id: "target-academics",
      pillar: "Academics",
      label: "Study blocks",
      targetNumber: "12",
      targetUnit: "per week",
    },
    {
      id: "target-health",
      pillar: "Health",
      label: "Workouts",
      targetNumber: "4",
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
