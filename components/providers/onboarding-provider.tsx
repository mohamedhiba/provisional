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

import {
  defaultOnboardingState,
  normalizeOnboardingState,
  readLocalOnboardingState,
  writeLocalOnboardingState,
  type OnboardingPersistenceSource,
  type OnboardingState,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: OnboardingState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type OnboardingContextValue = {
  onboarding: OnboardingState;
  setOnboarding: Dispatch<SetStateAction<OnboardingState>>;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

async function requestProfile(method: "GET" | "POST", state?: OnboardingState) {
  const response = await fetch("/api/profile", {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(state) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Profile request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [onboarding, setOnboarding] = useState<OnboardingState>(defaultOnboardingState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState(
    "Loading your operating system...",
  );
  const lastSavedSnapshotRef = useRef("");

  useEffect(() => {
    let active = true;
    const localState = readLocalOnboardingState();

    if (localState) {
      setOnboarding(localState);
      lastSavedSnapshotRef.current = JSON.stringify(localState);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      lastSavedSnapshotRef.current = JSON.stringify(defaultOnboardingState);
      setSyncStatus("ready");
      setSyncMessage("Start defining your operating system.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestProfile("GET");

        if (!active) {
          return;
        }

        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state) {
          const normalized = normalizeOnboardingState(payload.state);
          writeLocalOnboardingState(normalized);
          lastSavedSnapshotRef.current = JSON.stringify(normalized);
          setOnboarding(normalized);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Loaded from Supabase."
              : "Loaded from this device.",
          );
          return;
        }

        if (payload.remoteEnabled && localState) {
          const syncPayload = await requestProfile("POST", localState);

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
              ? "Local setup synced to Supabase."
              : "Local setup is available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled || !localState ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. Your first save will persist there."
            : localState
              ? "Supabase is not configured yet. Local persistence is active."
              : "Supabase is not configured yet. Local persistence will start on your first edit.",
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
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const snapshot = JSON.stringify(onboarding);

    writeLocalOnboardingState(onboarding);

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving to this device and syncing to Supabase..."
        : "Saving on this device...",
    );

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload = await requestProfile("POST", onboarding);

        lastSavedSnapshotRef.current = snapshot;
        setRemoteEnabled(payload.remoteEnabled);
        setSyncSource(payload.source);
        setSyncStatus(
          payload.source === "supabase" ? "saved-remote" : "saved-local",
        );
        setSyncMessage(
          payload.source === "supabase"
            ? "Saved to Supabase."
            : payload.message ?? "Saved on this device.",
        );
      } catch {
        setSyncSource("local");
        setSyncStatus("error");
        setSyncMessage(
          "Remote save failed. Your data is still saved on this device.",
        );
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasLoaded, onboarding, remoteEnabled]);

  return (
    <OnboardingContext.Provider
      value={{
        onboarding,
        setOnboarding,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingProfile() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboardingProfile must be used inside OnboardingProvider.");
  }

  return context;
}
