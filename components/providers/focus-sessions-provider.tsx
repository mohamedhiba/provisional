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
  clearLocalFocusSessions,
  normalizeFocusSession,
  normalizeFocusSessions,
  readLocalFocusSessions,
  writeLocalFocusSessions,
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
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
  createSession: (session: FocusSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
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
    headers:
      method === "POST" ? { "Content-Type": "application/json" } : undefined,
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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading focus sessions...");

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
      setSyncMessage("Log the first real work block of the day.");
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
              ? "Sessions loaded from Supabase."
              : "Sessions loaded from this device.",
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
              ? "Local sessions synced to Supabase."
              : "Local sessions are available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. The next logged session will persist there."
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
            : "Remote sync failed. Local persistence will take over when you log a session.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [onboarding.name, onboarding.tone, sessionDate, timeZone]);

  async function createSession(session: FocusSession) {
    const normalized = normalizeFocusSession(session, sessionDate);
    const nextSessions = normalizeFocusSessions([normalized, ...sessions], sessionDate);
    setSessions(nextSessions);
    writeLocalFocusSessions(sessionDate, nextSessions);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving session and syncing to Supabase..."
        : "Saving session on this device...",
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
          ? "Session saved to Supabase."
          : payload.message ?? "Session saved on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote save failed. The session is still saved on this device.",
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
        ? "Removing session and syncing to Supabase..."
        : "Removing session on this device...",
    );

    if (!remoteEnabled) {
      setSyncStatus("saved-local");
      setSyncMessage("Session removed from this device.");
      return;
    }

    try {
      const payload = await requestFocusSessions("DELETE", sessionDate, timeZone, undefined, id);
      setRemoteEnabled(payload.remoteEnabled);
      setSyncSource(payload.source);
      setSyncStatus(
        payload.source === "supabase" ? "saved-remote" : "saved-local",
      );
      setSyncMessage(
        payload.source === "supabase"
          ? "Session removed from Supabase."
          : payload.message ?? "Session removed on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote delete failed. The session is still removed locally.",
      );
    }
  }

  return (
    <FocusSessionsContext.Provider
      value={{
        sessions,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
        createSession,
        deleteSession,
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
