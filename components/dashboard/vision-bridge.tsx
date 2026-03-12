"use client";

import Link from "next/link";

import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import { computeMonthlyMissionProgress } from "@/lib/monthly-mission";

export function VisionBridge() {
  const { onboarding } = useOnboardingProfile();
  const { mission } = useMonthlyMission();
  const { review } = useWeeklyReview();
  const { dailyPlan } = useTodayPlan();
  const progress = computeMonthlyMissionProgress(mission);
  const weekBridge = mission?.currentWeekFocus.trim() || review?.nextWeekFocus || "";
  const todayProof =
    dailyPlan.oneThing.trim() || onboarding.defaultFirstMove.trim() || "Set the one thing.";

  if (!mission || !mission.focusTheme.trim()) {
    return (
      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Vision bridge
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
              The month is still undefined.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              Daily and weekly pressure get stronger when the month has a clear theme,
              measurable targets, and a current-week bridge.
            </p>
          </div>
          <Link
            href="/mission"
            className="inline-flex h-11 items-center justify-center rounded-full bg-stone-100 px-5 text-sm font-medium text-stone-950 transition hover:bg-stone-200"
          >
            Set monthly mission
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Vision to daily bridge
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
            Keep the dream chained to today.
          </h2>
        </div>
        <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/75">
            Monthly progress
          </p>
          <p className="mt-2 text-lg font-semibold text-stone-50">
            {progress.progressPercent}% complete
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {[
          ["Vision", onboarding.longTermGoal || onboarding.mission || "Define the long game."],
          ["This month", mission.primaryMission],
          ["This week", weekBridge || "Set the week bridge in mission or weekly review."],
          ["Today", todayProof],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              {label}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-200">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-400">
        <span>{mission.focusTheme}</span>
        <span className="text-stone-600">•</span>
        <span>
          {progress.completedTargets}/{progress.activeTargets} targets complete
        </span>
        <span className="text-stone-600">•</span>
        <Link href="/mission" className="text-stone-100 underline-offset-4 hover:underline">
          Open monthly mission
        </Link>
      </div>
    </section>
  );
}

