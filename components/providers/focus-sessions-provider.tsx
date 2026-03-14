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
  clearLocalActiveFocusLoop,
  clearLocalFocusSessions,
  normalizeActiveFocusLoop,
  normalizeFocusSession,
  normalizeFocusSessions,
  readLocalActiveFocusLoop,
  readLocalFocusSessions,
  writeLocalActiveFocusLoop,
  writeLocalFocusSessions,
  type ActiveFocusLoop,
  type FocusSession,
} from "@/lib/focus-session";
import {
  type OnboardingPersistenceSource,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: FocusSession[];
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type FocusSessionsContextValue = {
  sessions: FocusSession[];
  activeLoop: ActiveFocusLoop | null;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
  createSession: (session: FocusSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveLoop: (
    value:
      | ActiveFocusLoop
      | null
      | ((current: ActiveFocusLoop | null) => ActiveFocusLoop | null),
  ) => void;
  clearActiveLoop: () => void;
};

const FocusSessionsContext = createContext<FocusSessionsContextValue | null>(null);

async function requestFocusSessions(
  method: "GET" | "POST" | "DELETE",
  sessionDate: string,
  timeZone: string,
  body?: Record<string, unknown>,
  id?: string,
) {
  const query = new URLSearchParams({ date: sessionDate });
  query.set("timeZone", timeZone);

  if (id) {
    query.set("id", id);
  }

  const response = await fetch(`/api/focus-sessions?${query.toString()}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Focus sessions request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function FocusSessionsProvider({ children }: PropsWithChildren) {
  const { onboarding } = useOnboardingProfile();
  const { today: sessionDate, timeZone } = useCurrentDate();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [activeLoop, setActiveLoopState] = useState<ActiveFocusLoop | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading focus sessions...");

  useEffect(() => {
    const localLoop = readLocalActiveFocusLoop(sessionDate);
    setActiveLoopState(localLoop);
  }, [sessionDate]);

  useEffect(() => {
    let active = true;
    const localSessions = readLocalFocusSessions(sessionDate);

    if (localSessions.length > 0) {
      setSessions(localSessions);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      setSyncStatus("ready");
      setSyncMessage("Run the first focus loop when the day needs proof.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestFocusSessions("GET", sessionDate, timeZone);

        if (!active) {
          return;
        }

        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state.length > 0) {
          writeLocalFocusSessions(sessionDate, payload.state);
          setSessions(payload.state);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Focus history loaded from Supabase."
              : "Focus history loaded from this device.",
          );
          return;
        }

        if (payload.message?.startsWith("Recovered")) {
          clearLocalFocusSessions(sessionDate);
          setSessions([]);
          setSyncSource("supabase");
          setSyncStatus("ready");
          setSyncMessage(payload.message);
          return;
        }

        if (payload.remoteEnabled && localSessions.length > 0) {
          const syncPayload = await requestFocusSessions("POST", sessionDate, timeZone, {
            sessions: localSessions,
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
              ? "Local focus history synced to Supabase."
              : "Local focus history is available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. Completed focus loops will persist there."
            : "Supabase is not configured yet. Local persistence is active.",
        );
      } catch {
        if (!active) {
          return;
        }

        setRemoteEnabled(false);
        setSyncSource(localSessions.length > 0 ? "local" : "none");
        setSyncStatus(localSessions.length > 0 ? "saved-local" : "error");
        setSyncMessage(
          localSessions.length > 0
            ? "Using local persistence because remote sync is unavailable."
            : "Remote sync failed. Local persistence will take over when a loop finishes.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [onboarding.name, onboarding.tone, sessionDate, timeZone]);

  function setActiveLoop(
    value:
      | ActiveFocusLoop
      | null
      | ((current: ActiveFocusLoop | null) => ActiveFocusLoop | null),
  ) {
    setActiveLoopState((current) => {
      const resolved =
        typeof value === "function"
          ? value(current)
          : normalizeActiveFocusLoop(value, sessionDate);

      if (resolved) {
        writeLocalActiveFocusLoop(sessionDate, resolved);
      } else {
        clearLocalActiveFocusLoop(sessionDate);
      }

      return resolved;
    });
  }

  function clearActiveLoop() {
    clearLocalActiveFocusLoop(sessionDate);
    setActiveLoopState(null);
  }

  async function createSession(session: FocusSession) {
    const normalized = normalizeFocusSession(session, sessionDate);
    const nextSessions = normalizeFocusSessions([normalized, ...sessions], sessionDate);
    setSessions(nextSessions);
    writeLocalFocusSessions(sessionDate, nextSessions);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving completed focus loop and syncing to Supabase..."
        : "Saving completed focus loop on this device...",
    );

    try {
      const payload = await requestFocusSessions("POST", sessionDate, timeZone, {
        session: normalized,
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
          ? "Focus loop saved to Supabase."
          : payload.message ?? "Focus loop saved on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote save failed. The completed loop is still saved on this device.",
      );
    }
  }

  async function deleteSession(id: string) {
    const nextSessions = sessions.filter((session) => session.id !== id);
    setSessions(nextSessions);
    writeLocalFocusSessions(sessionDate, nextSessions);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Removing loop and syncing to Supabase..."
        : "Removing loop on this device...",
    );

    if (!remoteEnabled) {
      setSyncStatus("saved-local");
      setSyncMessage("Focus loop removed from this device.");
      return;
    }

    try {
      const payload = await requestFocusSessions(
        "DELETE",
        sessionDate,
        timeZone,
        undefined,
        id,
      );
      setRemoteEnabled(payload.remoteEnabled);
      setSyncSource(payload.source);
      setSyncStatus(
        payload.source === "supabase" ? "saved-remote" : "saved-local",
      );
      setSyncMessage(
        payload.source === "supabase"
          ? "Focus loop removed from Supabase."
          : payload.message ?? "Focus loop removed on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote delete failed. The focus loop is still removed locally.",
      );
    }
  }

  return (
    <FocusSessionsContext.Provider
      value={{
        sessions,
        activeLoop,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
        createSession,
        deleteSession,
        setActiveLoop,
        clearActiveLoop,
      }}
    >
      {children}
    </FocusSessionsContext.Provider>
  );
}

export function useFocusSessions() {
  const context = useContext(FocusSessionsContext);

  if (!context) {
    throw new Error("useFocusSessions must be used inside FocusSessionsProvider.");
  }

  return context;
}
