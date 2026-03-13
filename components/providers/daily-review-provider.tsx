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
  clearLocalDailyReviewState,
  createEmptyDailyReview,
  normalizeDailyReviewState,
  readLocalDailyReviewState,
  writeLocalDailyReviewState,
  type DailyReviewState,
} from "@/lib/daily-review";
import {
  type OnboardingPersistenceSource,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: DailyReviewState | null;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type DailyReviewContextValue = {
  review: DailyReviewState | null;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
  submitReview: (review: DailyReviewState) => Promise<void>;
};

const DailyReviewContext = createContext<DailyReviewContextValue | null>(null);

async function requestDailyReview(
  method: "GET" | "POST",
  reviewDate: string,
  timeZone: string,
  body?: Record<string, unknown>,
) {
  const query = new URLSearchParams({
    date: reviewDate,
    timeZone,
  }).toString();
  const response = await fetch(`/api/daily-review?${query}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Daily review request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function DailyReviewProvider({ children }: PropsWithChildren) {
  const { onboarding } = useOnboardingProfile();
  const { today: reviewDate, timeZone } = useCurrentDate();
  const [review, setReview] = useState<DailyReviewState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] =
    useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading nightly review...");

  useEffect(() => {
    let active = true;
    const localReview = readLocalDailyReviewState(reviewDate);

    if (localReview) {
      setReview(localReview);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      setSyncStatus("ready");
      setSyncMessage("The day is still open until you complete the nightly review.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestDailyReview("GET", reviewDate, timeZone);

        if (!active) {
          return;
        }

        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state) {
          const normalized = normalizeDailyReviewState(payload.state, reviewDate);
          writeLocalDailyReviewState(normalized);
          setReview(normalized);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Night review loaded from Supabase."
              : "Night review loaded from this device.",
          );
          return;
        }

        if (payload.message?.startsWith("Recovered")) {
          clearLocalDailyReviewState(reviewDate);
          setReview(null);
          setSyncSource("supabase");
          setSyncStatus("ready");
          setSyncMessage(payload.message);
          return;
        }

        if (payload.remoteEnabled && localReview) {
          const syncPayload = await requestDailyReview("POST", reviewDate, timeZone, {
            review: localReview,
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
              ? "Local nightly review synced to Supabase."
              : "Night review is available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. The nightly review will persist there."
            : "Supabase is not configured yet. Local persistence is active.",
        );
      } catch {
        if (!active) {
          return;
        }

        setRemoteEnabled(false);
        setSyncSource(localReview ? "local" : "none");
        setSyncStatus(localReview ? "saved-local" : "error");
        setSyncMessage(
          localReview
            ? "Using local persistence because remote sync is unavailable."
            : "Remote sync failed. Local persistence will take over when you submit the review.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [onboarding.name, onboarding.tone, reviewDate, timeZone]);

  async function submitReview(nextReview: DailyReviewState) {
    const normalized = normalizeDailyReviewState(nextReview, reviewDate);
    setReview(normalized);
    writeLocalDailyReviewState(normalized);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Closing the day and syncing to Supabase..."
        : "Closing the day on this device...",
    );

    try {
      const payload = await requestDailyReview("POST", reviewDate, timeZone, {
        review: normalized,
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
          ? "Night review saved to Supabase."
          : payload.message ?? "Night review saved on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote save failed. The night review is still saved on this device.",
      );
    }
  }

  return (
    <DailyReviewContext.Provider
      value={{
        review,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
        submitReview,
      }}
    >
      {children}
    </DailyReviewContext.Provider>
  );
}

export function useDailyReview() {
  const context = useContext(DailyReviewContext);

  if (!context) {
    throw new Error("useDailyReview must be used inside DailyReviewProvider.");
  }

  return context;
}
