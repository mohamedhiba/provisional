"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import {
  createEmptyAnalyticsSnapshot,
  type AnalyticsSnapshot,
} from "@/lib/analytics";

type AnalyticsContextValue = {
  snapshot: AnalyticsSnapshot;
  hasLoaded: boolean;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

async function requestAnalytics() {
  const response = await fetch("/api/analytics", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Analytics request failed.");
  }

  return (await response.json()) as {
    snapshot: AnalyticsSnapshot;
    remoteEnabled: boolean;
  };
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const { dailyPlan } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review } = useDailyReview();
  const { summary } = useWeeklyReview();
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(
    createEmptyAnalyticsSnapshot(),
  );
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSnapshot() {
      try {
        const payload = await requestAnalytics();

        if (!active) {
          return;
        }

        setSnapshot(payload.snapshot);
      } catch {
        if (!active) {
          return;
        }

        setSnapshot(createEmptyAnalyticsSnapshot());
      } finally {
        if (active) {
          setHasLoaded(true);
        }
      }
    }

    void loadSnapshot();

    return () => {
      active = false;
    };
  }, [
    dailyPlan.oneThingDone,
    dailyPlan.topThree.filter((item) => item.done).length,
    sessions.length,
    sessions[0]?.createdAt,
    review?.reviewDate,
    summary.reviewCompletionRate,
    summary.totalScore,
    summary.winningDays,
  ]);

  return (
    <AnalyticsContext.Provider value={{ snapshot, hasLoaded }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error("useAnalytics must be used inside AnalyticsProvider.");
  }

  return context;
}
