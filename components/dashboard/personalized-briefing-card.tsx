"use client";

import { RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAnalytics } from "@/components/providers/analytics-provider";
import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import { buttonStyles } from "@/components/ui/button";
import {
  getBriefingWindow,
  hashBriefingSignature,
  type PersonalizedBriefing,
} from "@/lib/briefing";
import { computeMonthlyMissionProgress } from "@/lib/monthly-mission";

const briefingStorageKeyPrefix = "proof-briefing-cache";

type ApiPayload = {
  briefing: PersonalizedBriefing;
};

function readCachedBriefing(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as PersonalizedBriefing;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function writeCachedBriefing(storageKey: string, briefing: PersonalizedBriefing) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(briefing));
}

export function PersonalizedBriefingCard() {
  const { onboarding, hasLoaded: onboardingLoaded } = useOnboardingProfile();
  const { dailyPlan, hasLoaded: todayLoaded } = useTodayPlan();
  const { sessions, hasLoaded: sessionsLoaded } = useFocusSessions();
  const { review, hasLoaded: reviewLoaded } = useDailyReview();
  const { summary, hasLoaded: weeklyLoaded } = useWeeklyReview();
  const { mission, hasLoaded: missionLoaded } = useMonthlyMission();
  const { snapshot, hasLoaded: analyticsLoaded } = useAnalytics();
  const [windowInfo, setWindowInfo] = useState(() => getBriefingWindow(new Date()));
  const [briefing, setBriefing] = useState<PersonalizedBriefing | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const missionProgress = computeMonthlyMissionProgress(mission);
  const allLoaded =
    onboardingLoaded &&
    todayLoaded &&
    sessionsLoaded &&
    reviewLoaded &&
    weeklyLoaded &&
    missionLoaded &&
    analyticsLoaded;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWindowInfo(getBriefingWindow(new Date()));
    }, 1000 * 60 * 5);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const storageKey = useMemo(() => {
    const signature = hashBriefingSignature(
      JSON.stringify({
        moment: windowInfo.id,
        oneThing: dailyPlan.oneThing,
        oneThingDone: dailyPlan.oneThingDone,
        completedOutcomes: dailyPlan.topThree.filter((item) => item.done).length,
        sessions: sessions.length,
        deepMinutesToday:
          snapshot.activityGrid.find((day) => day.date === windowInfo.date)?.deepMinutes ?? 0,
        reviewDate: review?.reviewDate ?? "",
        weekScore: summary.totalScore,
        winningDays: summary.winningDays,
        monthTheme: mission?.focusTheme ?? "",
        monthProgress: missionProgress.progressPercent,
        streak: snapshot.currentStreak,
        tone: onboarding.tone,
      }),
    );

    return `${briefingStorageKeyPrefix}:${windowInfo.cacheBucket}:${signature}`;
  }, [
    dailyPlan.oneThing,
    dailyPlan.oneThingDone,
    dailyPlan.topThree,
    mission?.focusTheme,
    missionProgress.progressPercent,
    onboarding.tone,
    review?.reviewDate,
    sessions.length,
    snapshot.activityGrid,
    snapshot.currentStreak,
    summary.totalScore,
    summary.winningDays,
    windowInfo.cacheBucket,
    windowInfo.date,
    windowInfo.id,
  ]);

  useEffect(() => {
    if (!allLoaded) {
      return;
    }

    let active = true;

    const cached = refreshNonce === 0 ? readCachedBriefing(storageKey) : null;

    if (cached) {
      setBriefing(cached);
      setStatus("ready");
      return;
    }

    async function loadBriefing() {
      setStatus("loading");

      try {
        const params = new URLSearchParams({
          moment: windowInfo.id,
          date: windowInfo.date,
          weekStart: windowInfo.weekStart,
          monthStart: windowInfo.monthStart,
        });
        const response = await fetch(`/api/briefing?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Briefing request failed.");
        }

        const payload = (await response.json()) as ApiPayload;

        if (!active) {
          return;
        }

        setBriefing(payload.briefing);
        writeCachedBriefing(storageKey, payload.briefing);
        setStatus("ready");
        setRefreshNonce(0);
      } catch {
        if (!active) {
          return;
        }

        setStatus("error");
        setRefreshNonce(0);
      }
    }

    void loadBriefing();

    return () => {
      active = false;
    };
  }, [
    allLoaded,
    refreshNonce,
    storageKey,
    windowInfo.date,
    windowInfo.id,
    windowInfo.monthStart,
    windowInfo.weekStart,
  ]);

  return (
    <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-white/8 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-100/80">
              Personalized briefing
            </p>
            <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-300">
              {windowInfo.label}
            </span>
            {briefing ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-400">
                {briefing.source === "gemini" ? "Gemini" : "Rule-based"}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-3xl tracking-tight text-stone-50">
            {briefing?.title ?? "Reading the day, week, and month..."}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
            {briefing?.summary ??
              "Proof is assembling a briefing from your current plan, yesterday’s truth, weekly evidence, and monthly mission."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(storageKey);
            }
            setRefreshNonce((current) => current + 1);
          }}
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
          Refresh brief
        </button>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.6rem] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(215,168,91,0.14),rgba(255,255,255,0.03))] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/20 bg-black/20 text-amber-100">
              <Target className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-100/80">
                What to do now
              </p>
              <p className="mt-1 text-lg font-semibold text-stone-50">
                {briefing?.focus ?? "Choosing the next honest move..."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/8 bg-black/20 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-stone-200">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Tactical steps
              </p>
              <p className="mt-1 text-sm text-stone-400">
                Different windows get different pressure.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {(briefing?.actions ?? [
              "Finish loading the current evidence.",
              "Pull the strongest current pattern into view.",
            ]).map((action, index) => (
              <div
                key={`${action}-${index}`}
                className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-200">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-500">
        <span>
          Built from today&apos;s plan, yesterday&apos;s closeout, weekly evidence, and monthly progress.
        </span>
        {status === "loading" ? <span>Refreshing the brief...</span> : null}
        {status === "error" ? <span>Briefing refresh failed. The last stable version will stay visible.</span> : null}
      </div>
    </section>
  );
}
