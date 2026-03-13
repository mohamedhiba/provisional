"use client";

import { CircleAlert, RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAnalytics } from "@/components/providers/analytics-provider";
import { useCurrentDate } from "@/components/providers/current-date-provider";
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

const briefingStorageKeyPrefix = "proof-coach-cache-v2";

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
  const { today, weekStart, monthStart } = useCurrentDate();
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

  useEffect(() => {
    setWindowInfo(getBriefingWindow(new Date()));
  }, [monthStart, today, weekStart]);

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
    <section className="surface-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(240,214,164,0.16),transparent_55%),radial-gradient(circle_at_top_right,rgba(75,85,179,0.16),transparent_45%)]" />

      <div className="relative flex flex-col gap-5 border-b border-white/8 pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              Proof coach
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-stone-300">
              {windowInfo.label}
            </span>
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] ${
                briefing?.source === "gemini"
                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-stone-400"
              }`}
            >
              {briefing?.source === "gemini" ? "Gemini live" : "Coach fallback"}
            </span>
          </div>

          <h2 className="mt-4 max-w-3xl text-3xl tracking-tight text-stone-50 sm:text-[2.2rem]">
            {briefing?.title ?? "Your coach is reading the scoreboard..."}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300 sm:text-[15px]">
            {briefing?.summary ??
              "Proof is reading today, yesterday, this week, and the current month so your next move is based on evidence, not mood."}
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
          Refresh coach
        </button>
      </div>

      <div className="relative mt-6 grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(215,168,91,0.18),rgba(255,255,255,0.04))] p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.26em] text-amber-100/80">
              Coach message
            </p>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-stone-50 sm:text-[1.7rem] sm:leading-[2.6rem]">
              {briefing?.coachMessage ?? "Reading your current pattern and preparing the hard truth..."}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.6rem] border border-red-300/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-200/14 bg-red-300/10 text-red-100">
                  <CircleAlert className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                    Accountability
                  </p>
                  <p className="mt-2 text-sm leading-7 text-stone-200">
                    {briefing?.accountability ??
                      "The next version will call out the strongest pattern once the latest evidence finishes loading."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(215,168,91,0.14),rgba(255,255,255,0.03))] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/20 bg-black/20 text-amber-100">
                  <Target className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-amber-100/80">
                    What to do now
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-8 text-stone-50">
                    {briefing?.focus ?? "Choosing the next honest move..."}
                  </p>
                </div>
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
                  Non-negotiable next moves
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  This is the part that should change the day.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(briefing?.actions ?? [
                "Finish loading the current evidence.",
                "Pull the strongest current pattern into view.",
                "Set the next serious move.",
              ]).map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                    Move {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-stone-200">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
            What the evidence says
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            The coach is not improvising. It is reading your last closeout, today&apos;s work, weekly execution, and monthly pressure.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {(briefing?.evidence ?? [
              { label: "Yesterday", value: "Loading yesterday's result..." },
              { label: "Today", value: "Loading today’s activity..." },
              { label: "This week", value: "Loading weekly execution..." },
              { label: "This month", value: "Loading monthly mission pressure..." },
            ]).map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-100">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
              Coach status
            </p>
            <p className="mt-2 text-sm leading-7 text-stone-300">
              {briefing?.source === "gemini"
                ? "Gemini is active and generating a personalized coach message from your current evidence."
                : "Gemini is not responding yet, so Proof is using the local coach engine to keep the pressure on."}
            </p>
          </div>
        </aside>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-500">
        <span>
          Built from today&apos;s plan, yesterday&apos;s closeout, weekly evidence, and monthly progress.
        </span>
        {status === "loading" ? <span>Refreshing the coach...</span> : null}
        {status === "error" ? <span>Coach refresh failed. The last stable version will stay visible.</span> : null}
      </div>
    </section>
  );
}
