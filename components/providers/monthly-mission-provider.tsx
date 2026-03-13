"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import {
  normalizeMonthlyMissionState,
  readLocalMonthlyMissionState,
  writeLocalMonthlyMissionState,
  type MonthlyMissionState,
} from "@/lib/monthly-mission";
import {
  type OnboardingPersistenceSource,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: MonthlyMissionState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type MonthlyMissionContextValue = {
  mission: MonthlyMissionState | null;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
  saveMission: (mission: MonthlyMissionState) => Promise<void>;
};

const MonthlyMissionContext = createContext<MonthlyMissionContextValue | null>(null);

async function requestMonthlyMission(
  method: "GET" | "POST",
  monthStart: string,
  body?: Record<string, unknown>,
) {
  const query = new URLSearchParams({ monthStart }).toString();
  const response = await fetch(`/api/monthly-mission?${query}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Monthly mission request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function MonthlyMissionProvider({ children }: PropsWithChildren) {
  const { onboarding } = useOnboardingProfile();
  const { monthStart } = useCurrentDate();
  const [mission, setMission] = useState<MonthlyMissionState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading monthly mission...");

  useEffect(() => {
    let active = true;
    const localMission = readLocalMonthlyMissionState(monthStart);

    if (localMission) {
      setMission(localMission);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      setSyncStatus("ready");
      setSyncMessage("Define the month before the week starts improvising.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestMonthlyMission("GET", monthStart);

        if (!active) {
          return;
        }

        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state) {
          const normalized = normalizeMonthlyMissionState(payload.state, monthStart);
          writeLocalMonthlyMissionState(normalized);
          setMission(normalized);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Monthly mission loaded from Supabase."
              : "Monthly mission loaded from this device.",
          );
          return;
        }

        if (payload.remoteEnabled && localMission) {
          const syncPayload = await requestMonthlyMission("POST", monthStart, {
            mission: localMission,
            profile: {
              name: onboarding.name,
              tone: onboarding.tone,
            },
          });

          if (!active) {
            return;
          }

          setRemoteEnabled(syncPayload.remoteEnabled);
          setSyncSource(syncPayload.source);
          setSyncStatus(
            syncPayload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            syncPayload.source === "supabase"
              ? "Local monthly mission synced to Supabase."
              : "Monthly mission is available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. The monthly mission will persist there."
            : "Supabase is not configured yet. Local persistence is active.",
        );
      } catch {
        if (!active) {
          return;
        }

        setRemoteEnabled(false);
        setSyncSource(localMission ? "local" : "none");
        setSyncStatus(localMission ? "saved-local" : "error");
        setSyncMessage(
          localMission
            ? "Using local persistence because remote sync is unavailable."
            : "Remote sync failed. Local persistence will take over when you save the month.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [monthStart, onboarding.name, onboarding.tone]);

  async function saveMission(nextMission: MonthlyMissionState) {
    const normalized = normalizeMonthlyMissionState(nextMission, monthStart);
    setMission(normalized);
    writeLocalMonthlyMissionState(normalized);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving the month and syncing to Supabase..."
        : "Saving the month on this device...",
    );

    try {
      const payload = await requestMonthlyMission("POST", monthStart, {
        mission: normalized,
        profile: {
          name: onboarding.name,
          tone: onboarding.tone,
        },
      });

      setRemoteEnabled(payload.remoteEnabled);
      setSyncSource(payload.source);
      setSyncStatus(
        payload.source === "supabase" ? "saved-remote" : "saved-local",
      );
      setSyncMessage(
        payload.source === "supabase"
          ? "Monthly mission saved to Supabase."
          : payload.message ?? "Monthly mission saved on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote save failed. The monthly mission is still saved on this device.",
      );
    }
  }

  return (
    <MonthlyMissionContext.Provider
      value={{
        mission,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
        saveMission,
      }}
    >
      {children}
    </MonthlyMissionContext.Provider>
  );
}

export function useMonthlyMission() {
  const context = useContext(MonthlyMissionContext);

  if (!context) {
    throw new Error("useMonthlyMission must be used inside MonthlyMissionProvider.");
  }

  return context;
}
