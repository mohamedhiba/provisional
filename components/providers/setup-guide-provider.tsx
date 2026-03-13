"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { type MonthlyMissionState } from "@/lib/monthly-mission";

type SetupGuideStepId = "mission" | "today" | "sessions" | "review";
type SetupGuideStepState = "complete" | "current" | "upcoming";

export type SetupGuideStep = {
  id: SetupGuideStepId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  actionLabel: string;
  state: SetupGuideStepState;
};

type SetupGuideContextValue = {
  hasLoaded: boolean;
  isVisible: boolean;
  isComplete: boolean;
  completedCount: number;
  totalSteps: number;
  currentStep: SetupGuideStep | null;
  steps: SetupGuideStep[];
  hideGuide: () => void;
  showGuide: () => void;
};

const STORAGE_KEY = "proof.setup-guide.hidden";

const SetupGuideContext = createContext<SetupGuideContextValue | null>(null);

const baseSteps = [
  {
    id: "mission",
    label: "Set the month",
    shortLabel: "Month",
    description:
      "Define one focus theme and a few measurable targets so the system knows what this month is really about.",
    href: "/mission",
    actionLabel: "Open Mission",
  },
  {
    id: "today",
    label: "Choose the one thing",
    shortLabel: "Today",
    description:
      "Pick the highest-leverage task for today so the day stops negotiating with easier work.",
    href: "/today",
    actionLabel: "Open Today",
  },
  {
    id: "sessions",
    label: "Log one focus block",
    shortLabel: "Focus",
    description:
      "Capture one real work block as evidence. Honest session data matters more than perfect planning.",
    href: "/sessions",
    actionLabel: "Open Sessions",
  },
  {
    id: "review",
    label: "Close the day",
    shortLabel: "Review",
    description:
      "Finish with a nightly review so the day gets judged by truth instead of fading into memory.",
    href: "/review/daily",
    actionLabel: "Open Daily Review",
  },
] satisfies Array<Omit<SetupGuideStep, "state">>;

function hasMissionSignal(mission: MonthlyMissionState | null) {
  if (!mission) {
    return false;
  }

  if (
    mission.focusTheme.trim() ||
    mission.primaryMission.trim() ||
    mission.currentWeekFocus.trim() ||
    mission.whyThisMatters.trim() ||
    mission.mustProtect.trim() ||
    mission.mustIgnore.trim()
  ) {
    return true;
  }

  return mission.targets.some((target) =>
    [
      target.label.trim(),
      target.currentNumber.trim(),
      target.targetNumber.trim(),
      target.unit.trim(),
    ].some(Boolean),
  );
}

export function SetupGuideProvider({ children }: PropsWithChildren) {
  const { mission } = useMonthlyMission();
  const { dailyPlan } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review } = useDailyReview();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const completionMap = useMemo(
    () => ({
      mission: hasMissionSignal(mission),
      today: Boolean(dailyPlan.oneThing.trim()),
      sessions: sessions.length > 0,
      review: Boolean(review),
    }),
    [dailyPlan.oneThing, mission, review, sessions.length],
  );

  const firstIncompleteId =
    baseSteps.find((step) => !completionMap[step.id])?.id ?? null;

  const steps = useMemo(
    () =>
      baseSteps.map((step) => {
        let state: SetupGuideStepState = "upcoming";

        if (completionMap[step.id]) {
          state = "complete";
        } else if (step.id === firstIncompleteId) {
          state = "current";
        }

        return {
          ...step,
          state,
        };
      }),
    [completionMap, firstIncompleteId],
  );

  const completedCount = steps.filter((step) => step.state === "complete").length;
  const currentStep = steps.find((step) => step.state === "current") ?? null;
  const isComplete = completedCount === steps.length;

  useEffect(() => {
    try {
      const hidden = window.localStorage.getItem(STORAGE_KEY) === "true";
      setIsVisible(!hidden);
    } catch {
      setIsVisible(true);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    setIsVisible(false);

    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore local storage failures and keep the guide hidden in memory.
    }
  }, [isComplete]);

  function hideGuide() {
    setIsVisible(false);

    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore persistence failures for the UI hint.
    }
  }

  function showGuide() {
    setIsVisible(true);

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore persistence failures for the UI hint.
    }
  }

  return (
    <SetupGuideContext.Provider
      value={{
        hasLoaded,
        isVisible,
        isComplete,
        completedCount,
        totalSteps: steps.length,
        currentStep,
        steps,
        hideGuide,
        showGuide,
      }}
    >
      {children}
    </SetupGuideContext.Provider>
  );
}

export function useSetupGuide() {
  const context = useContext(SetupGuideContext);

  if (!context) {
    throw new Error("useSetupGuide must be used inside SetupGuideProvider.");
  }

  return context;
}
