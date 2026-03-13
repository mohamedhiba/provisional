"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import {
  clearLocalDailyPlanState,
  createEmptyDailyPlan,
  normalizeDailyPlanState,
  readLocalDailyPlanState,
  writeLocalDailyPlanState,
  type DailyPlanState,
} from "@/lib/daily-plan";
import {
  type OnboardingPersistenceSource,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: DailyPlanState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type TodayPlanContextValue = {
  dailyPlan: DailyPlanState;
  setDailyPlan: Dispatch<SetStateAction<DailyPlanState>>;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
};

const TodayPlanContext = createContext<TodayPlanContextValue | null>(null);

async function requestDailyPlan(
  method: "GET" | "POST",
  planDate: string,
  timeZone: string,
  body?: Record<string, unknown>,
) {
  const query = new URLSearchParams({
    date: planDate,
    timeZone,
  }).toString();
  const response = await fetch(`/api/daily-plan?${query}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Daily plan request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function TodayPlanProvider({ children }: PropsWithChildren) {
  const { today: planDate, timeZone } = useCurrentDate();
  const [dailyPlan, setDailyPlan] = useState<DailyPlanState>(
    createEmptyDailyPlan(planDate),
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading today's plan...");
  const lastSavedSnapshotRef = useRef("");

  useEffect(() => {
    let active = true;
    const localState = readLocalDailyPlanState(planDate);

    if (localState) {
      setDailyPlan(localState);
      lastSavedSnapshotRef.current = JSON.stringify(localState);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      const emptyPlan = createEmptyDailyPlan(planDate);
      setDailyPlan(emptyPlan);
      lastSavedSnapshotRef.current = JSON.stringify(emptyPlan);
      setSyncStatus("ready");
      setSyncMessage("Set the one thing before the day starts drifting.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestDailyPlan("GET", planDate, timeZone);

        if (!active) {
          return;
        }

        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state) {
          const normalized = normalizeDailyPlanState(payload.state, planDate);
          writeLocalDailyPlanState(normalized);
          lastSavedSnapshotRef.current = JSON.stringify(normalized);
          setDailyPlan(normalized);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Today is loaded from Supabase."
              : "Today is loaded from this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");

        if (payload.message?.startsWith("Recovered")) {
          const emptyPlan = createEmptyDailyPlan(planDate);
          clearLocalDailyPlanState(planDate);
          writeLocalDailyPlanState(emptyPlan);
          lastSavedSnapshotRef.current = JSON.stringify(emptyPlan);
          setDailyPlan(emptyPlan);
          setSyncMessage(payload.message);
          return;
        }

        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. Today's first save will persist there."
            : "Supabase is not configured yet. Local persistence is active.",
        );
      } catch {
        if (!active) {
          return;
        }

        setRemoteEnabled(false);
        setSyncSource(localState ? "local" : "none");
        setSyncStatus(localState ? "saved-local" : "error");
        setSyncMessage(
          localState
            ? "Using local persistence because remote sync is unavailable."
            : "Remote sync failed. Local persistence will take over once you type.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [planDate, timeZone]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const snapshot = JSON.stringify(dailyPlan);
    writeLocalDailyPlanState(dailyPlan);

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving today's plan and syncing to Supabase..."
        : "Saving today's plan on this device...",
    );

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload = await requestDailyPlan(
          "POST",
          dailyPlan.planDate,
          timeZone,
          {
            plan: dailyPlan,
          },
        );

        lastSavedSnapshotRef.current = snapshot;
        setRemoteEnabled(payload.remoteEnabled);
        setSyncSource(payload.source);
        setSyncStatus(
          payload.source === "supabase" ? "saved-remote" : "saved-local",
        );
        setSyncMessage(
          payload.source === "supabase"
            ? "Today's plan is saved to Supabase."
            : payload.message ?? "Today's plan is saved on this device.",
        );
      } catch {
        setSyncSource("local");
        setSyncStatus("error");
        setSyncMessage(
          "Remote save failed. Today's plan is still saved on this device.",
        );
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dailyPlan, hasLoaded, remoteEnabled, timeZone]);

  return (
    <TodayPlanContext.Provider
      value={{
        dailyPlan,
        setDailyPlan,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
      }}
    >
      {children}
    </TodayPlanContext.Provider>
  );
}

export function useTodayPlan() {
  const context = useContext(TodayPlanContext);

  if (!context) {
    throw new Error("useTodayPlan must be used inside TodayPlanProvider.");
  }

  return context;
}
