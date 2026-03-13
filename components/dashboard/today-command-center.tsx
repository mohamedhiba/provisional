"use client";

import { CircleAlert, Clock3, Trash2 } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PersonalizedPillars } from "@/components/dashboard/personalized-pillars";
import { PersonalizedBriefingCard } from "@/components/dashboard/personalized-briefing-card";
import { StartHerePanel } from "@/components/dashboard/start-here-panel";
import { VisionBridge } from "@/components/dashboard/vision-bridge";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  formatPlanDate,
  getAntiDriftMessage,
  getCompletedPriorityCount,
} from "@/lib/daily-plan";
import {
  computeDailyScore,
  getDailyJudgmentLine,
  getDailyScoreLabel,
} from "@/lib/daily-score";
import { computeFocusSessionMetrics, formatMinutes } from "@/lib/focus-session";

const inputClassName =
  "w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

export function TodayCommandCenter() {
  const { onboarding } = useOnboardingProfile();
  const { timeZone, isDeviceTimeZone } = useCurrentDate();
  const { dailyPlan, setDailyPlan, hasLoaded, syncMessage } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review } = useDailyReview();
  const { snapshot } = useAnalytics();
  const score = computeDailyScore({
    dailyPlan,
    sessions,
    reviewCompleted: Boolean(review),
  });
  const scoreLabel = getDailyScoreLabel(score);
  const completedCount = getCompletedPriorityCount(dailyPlan);
  const antiDriftMessage = getAntiDriftMessage(dailyPlan);
  const sessionMetrics = computeFocusSessionMetrics(sessions);
  const judgmentLine = getDailyJudgmentLine({
    score,
    oneThingDone: dailyPlan.oneThingDone,
    hasSessions: sessions.length > 0,
    reviewCompleted: Boolean(review),
  });
  const topDriftAlert = snapshot.driftAlerts[0] ?? null;

  function setOneThing(value: string) {
    setDailyPlan((current) => ({
      ...current,
      oneThing: value,
      oneThingDone: value.trim() ? current.oneThingDone : false,
      status: current.oneThingDone && value.trim() ? current.status : "active",
    }));
  }

  function toggleOneThing() {
    setDailyPlan((current) => ({
      ...current,
      oneThingDone: current.oneThing.trim() ? !current.oneThingDone : false,
      status:
        !current.oneThingDone &&
        current.topThree.every((item) => item.done && item.title.trim())
          ? "completed"
          : "active",
    }));
  }

  function updateOutcome(id: string, title: string) {
    setDailyPlan((current) => ({
      ...current,
      topThree: current.topThree.map((item) =>
        item.id === id
          ? {
              ...item,
              title,
              done: title.trim() ? item.done : false,
            }
          : item,
      ),
    }));
  }

  function toggleOutcome(id: string) {
    setDailyPlan((current) => {
      const nextTopThree = current.topThree.map((item) =>
        item.id === id && item.title.trim()
          ? {
              ...item,
              done: !item.done,
            }
          : item,
      );
      const isCompleted =
        current.oneThingDone &&
        nextTopThree.every((item) => item.done && item.title.trim());

      return {
        ...current,
        topThree: nextTopThree,
        status: isCompleted ? "completed" : "active",
      };
    });
  }

  function clearOutcome(id: string) {
    setDailyPlan((current) => ({
      ...current,
      topThree: current.topThree.map((item) =>
        item.id === id
          ? {
              ...item,
              title: "",
              done: false,
            }
          : item,
      ),
      status: "active",
    }));
  }

  return (
    <div className="space-y-6">
      <StartHerePanel />
      <PersonalizedBriefingCard />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 border-b border-white/8 pb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    The one thing
                  </p>
                  <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-stone-50">
                    Make the hard priority impossible to hide from.
                  </h2>
                </div>
                <div className="flex gap-3">
                  <Button onClick={toggleOneThing}>
                    {dailyPlan.oneThingDone ? "Re-open task" : "Mark done"}
                  </Button>
                </div>
              </div>
              <textarea
                className={inputClassName}
                value={dailyPlan.oneThing}
                onChange={(event) => setOneThing(event.target.value)}
                placeholder={
                  onboarding.defaultFirstMove.trim()
                    ? onboarding.defaultFirstMove
                    : "If nothing else gets done today, this must happen."
                }
              />
              <p className="text-sm leading-6 text-stone-500">
                {hasLoaded ? syncMessage : "Loading today's plan..."}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                  Top three outcomes
                </p>
                <p className="text-sm text-stone-400">
                  {completedCount} of 4 priorities complete
                </p>
              </div>
              <div className="grid gap-3">
                {dailyPlan.topThree.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                  >
                    <button
                      type="button"
                      onClick={() => toggleOutcome(item.id)}
                      className={`mt-2 flex h-6 w-6 items-center justify-center rounded-full border transition ${
                        item.done
                          ? "border-emerald-400/60 bg-emerald-300/15 text-emerald-200"
                          : "border-white/15 bg-transparent text-transparent"
                      }`}
                    >
                      •
                    </button>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                        Outcome {index + 1}
                      </p>
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-stone-200 outline-none transition focus:border-amber-300/40"
                        value={item.title}
                        onChange={(event) => updateOutcome(item.id, event.target.value)}
                        placeholder="Define a concrete outcome, not a vague intention."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => clearOutcome(item.id)}
                      className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-stone-400 transition hover:bg-white/[0.06] hover:text-stone-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MetricCard
            label="Day score"
            value={`${score}`}
            detail={`${scoreLabel} day so far. Top priorities drive the score, not activity theater.`}
          />
          <MetricCard
            label="Night review"
            value={review ? "Closed" : "Open"}
            detail={
              review
                ? "The day has been judged and tomorrow's first move is set."
                : "Close the day in the nightly review to make the score count."
            }
          />
          <MetricCard
            label="Date"
            value={formatPlanDate(dailyPlan.planDate)}
            detail={
              isDeviceTimeZone
                ? `The day becomes real only when it is defined. Reset follows this device: ${timeZone}.`
                : `The day becomes real only when it is defined. Reset follows your account timezone: ${timeZone}.`
            }
          />
        </div>
      </div>

      <VisionBridge />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Pillar progress
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-50">
                Touch what matters, not just what is easy.
              </h3>
            </div>
          </div>
          <PersonalizedPillars />
        </section>

        <section className="grid gap-6">
          <div className="rounded-[2rem] border border-amber-300/15 bg-amber-300/8 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <CircleAlert className="mt-1 h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">
                    Anti-drift warning
                  </p>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-stone-100">
                    {antiDriftMessage}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-amber-100/80">
                    {judgmentLine}
                  </p>
                  {topDriftAlert ? (
                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/75">
                        Pattern signal
                      </p>
                      <p className="mt-2 text-sm font-medium text-stone-100">
                        {topDriftAlert.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-300">
                        {topDriftAlert.metric}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              <Link
                href={topDriftAlert?.href ?? "/review/daily"}
                className={buttonStyles({ variant: "warning", size: "md" })}
              >
                {topDriftAlert ? "Resolve signal" : review ? "Open review" : "Close the day"}
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                  Focus sessions
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-50">
                  Evidence of real work
                </h3>
              </div>
              <Link
                href="/sessions"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Open logger
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Sessions"
                value={`${sessionMetrics.totalSessions}`}
                detail="Logged today"
              />
              <MetricCard
                label="Deep work"
                value={formatMinutes(sessionMetrics.deepMinutes)}
                detail="High-focus minutes"
              />
              <MetricCard
                label="Quality"
                value={`${sessionMetrics.averageQuality}/5`}
                detail="Average session rating"
              />
            </div>
            {sessions.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-5">
                <p className="text-sm font-medium text-stone-100">
                  No work sessions logged yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Use the logger when you finish a real block of work so the day is
                  judged by evidence, not intent.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {sessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-100">
                        {session.taskTitle}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">
                        Planned {formatMinutes(session.plannedMinutes)} • Actual{" "}
                        {formatMinutes(session.actualMinutes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-300">
                      <Clock3 className="h-4 w-4 text-stone-500" />
                      <span>
                        {session.workDepth === "deep" ? "Deep" : "Shallow"}
                      </span>
                      <span>Quality {session.qualityRating}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
