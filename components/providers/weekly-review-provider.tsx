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
  createEmptyWeeklySummary,
  normalizeWeeklyReviewState,
  readLocalWeeklyReviewState,
  writeLocalWeeklyReviewState,
  type WeeklyReviewState,
  type WeeklyReviewSummary,
} from "@/lib/weekly-review";
import {
  type OnboardingPersistenceSource,
  type OnboardingSyncStatus,
} from "@/lib/onboarding";

type ApiPayload = {
  state: WeeklyReviewState | null;
  summary: WeeklyReviewSummary;
  source: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  message?: string;
};

type WeeklyReviewContextValue = {
  review: WeeklyReviewState | null;
  summary: WeeklyReviewSummary;
  hasLoaded: boolean;
  syncStatus: OnboardingSyncStatus;
  syncSource: OnboardingPersistenceSource;
  remoteEnabled: boolean;
  syncMessage: string;
  submitReview: (review: WeeklyReviewState) => Promise<void>;
};

const WeeklyReviewContext = createContext<WeeklyReviewContextValue | null>(null);

async function requestWeeklyReview(
  method: "GET" | "POST",
  weekStart: string,
  referenceDate: string,
  body?: Record<string, unknown>,
) {
  const query = new URLSearchParams({ weekStart, date: referenceDate }).toString();
  const response = await fetch(`/api/weekly-review?${query}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Weekly review request failed.");
  }

  return (await response.json()) as ApiPayload;
}

export function WeeklyReviewProvider({ children }: PropsWithChildren) {
  const { onboarding } = useOnboardingProfile();
  const { today, weekStart } = useCurrentDate();
  const [review, setReview] = useState<WeeklyReviewState | null>(null);
  const [summary, setSummary] = useState<WeeklyReviewSummary>(
    createEmptyWeeklySummary(weekStart),
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<OnboardingSyncStatus>("booting");
  const [syncSource, setSyncSource] = useState<OnboardingPersistenceSource>("none");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading weekly review...");

  useEffect(() => {
    let active = true;
    const localReview = readLocalWeeklyReviewState(weekStart);

    if (localReview) {
      setReview(localReview);
      setSyncStatus("saved-local");
      setSyncSource("local");
      setSyncMessage("Loaded from this device. Remote sync is checking now.");
    } else {
      setSyncStatus("ready");
      setSyncMessage("Review the week before you let it blur into the next one.");
    }

    setHasLoaded(true);

    async function loadRemote() {
      try {
        const payload = await requestWeeklyReview("GET", weekStart, today);

        if (!active) {
          return;
        }

        setSummary(payload.summary);
        setRemoteEnabled(payload.remoteEnabled);

        if (payload.state) {
          const normalized = normalizeWeeklyReviewState(payload.state, weekStart);
          writeLocalWeeklyReviewState(normalized);
          setReview(normalized);
          setSyncSource(payload.source);
          setSyncStatus(
            payload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            payload.source === "supabase"
              ? "Weekly review loaded from Supabase."
              : "Weekly review loaded from this device.",
          );
          return;
        }

        if (payload.remoteEnabled && localReview) {
          const syncPayload = await requestWeeklyReview("POST", weekStart, today, {
            review: localReview,
            profile: {
              name: onboarding.name,
              tone: onboarding.tone,
            },
            referenceDate: today,
          });

          if (!active) {
            return;
          }

          setSummary(syncPayload.summary);
          setRemoteEnabled(syncPayload.remoteEnabled);
          setSyncSource(syncPayload.source);
          setSyncStatus(
            syncPayload.source === "supabase" ? "saved-remote" : "saved-local",
          );
          setSyncMessage(
            syncPayload.source === "supabase"
              ? "Local weekly review synced to Supabase."
              : "Weekly review is available on this device.",
          );
          return;
        }

        setSyncSource(payload.source);
        setSyncStatus(payload.remoteEnabled ? "ready" : "saved-local");
        setSyncMessage(
          payload.remoteEnabled
            ? "Supabase is connected. The weekly review will persist there."
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
            : "Remote sync failed. Local persistence will take over when you save the weekly review.",
        );
      }
    }

    void loadRemote();

    return () => {
      active = false;
    };
  }, [onboarding.name, onboarding.tone, today, weekStart]);

  async function submitReview(nextReview: WeeklyReviewState) {
    const normalized = normalizeWeeklyReviewState(nextReview, weekStart);
    setReview(normalized);
    writeLocalWeeklyReviewState(normalized);
    setSyncSource("local");
    setSyncStatus("saving");
    setSyncMessage(
      remoteEnabled
        ? "Saving the weekly review and syncing to Supabase..."
        : "Saving the weekly review on this device...",
    );

    try {
      const payload = await requestWeeklyReview("POST", weekStart, today, {
        review: normalized,
        profile: {
          name: onboarding.name,
          tone: onboarding.tone,
        },
        referenceDate: today,
      });

      setSummary(payload.summary);
      setRemoteEnabled(payload.remoteEnabled);
      setSyncSource(payload.source);
      setSyncStatus(
        payload.source === "supabase" ? "saved-remote" : "saved-local",
      );
      setSyncMessage(
        payload.source === "supabase"
          ? "Weekly review saved to Supabase."
          : payload.message ?? "Weekly review saved on this device.",
      );
    } catch {
      setSyncSource("local");
      setSyncStatus("error");
      setSyncMessage(
        "Remote save failed. The weekly review is still saved on this device.",
      );
    }
  }

  return (
    <WeeklyReviewContext.Provider
      value={{
        review,
        summary,
        hasLoaded,
        syncStatus,
        syncSource,
        remoteEnabled,
        syncMessage,
        submitReview,
      }}
    >
      {children}
    </WeeklyReviewContext.Provider>
  );
}

export function useWeeklyReview() {
  const context = useContext(WeeklyReviewContext);

  if (!context) {
    throw new Error("useWeeklyReview must be used inside WeeklyReviewProvider.");
  }

  return context;
}
