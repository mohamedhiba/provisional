"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { computeMonthlyMissionProgress } from "@/lib/monthly-mission";
import {
  clearLocalWeeklyReviewDraft,
  createEmptyWeeklyReview,
  formatWeeklyRange,
  isWeeklyReviewEmpty,
  normalizeWeeklyReviewState,
  readLocalWeeklyReviewDraft,
  validateWeeklyReview,
  writeLocalWeeklyReviewDraft,
  type WeeklyReviewState,
} from "@/lib/weekly-review";

const textAreaClassName =
  "min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

const reviewFields = [
  {
    key: "movedForwardText",
    label: "What actually moved life forward this week?",
    placeholder: "Which actions created real movement instead of just activity?",
  },
  {
    key: "wastedEffortText",
    label: "What did you spend time on that did not matter?",
    placeholder: "Where did time go without moving the month, career, study, or health forward?",
  },
  {
    key: "improveText",
    label: "What is the one thing to improve next week?",
    placeholder: "What single system change would make next week cleaner and harder to drift through?",
  },
  {
    key: "eliminateText",
    label: "What should you eliminate next week?",
    placeholder: "Which behavior, excuse, task type, or commitment gets cut next week?",
  },
] satisfies Array<{
  key: keyof Pick<
    WeeklyReviewState,
    "movedForwardText" | "wastedEffortText" | "improveText" | "eliminateText"
  >;
  label: string;
  placeholder: string;
}>;

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

export function WeeklyReviewWorkspace() {
  const { weekStart } = useCurrentDate();
  const { review, summary, hasLoaded, syncMessage, submitReview } = useWeeklyReview();
  const { mission } = useMonthlyMission();
  const [form, setForm] = useState<WeeklyReviewState>(
    createEmptyWeeklyReview(weekStart),
  );
  const [formError, setFormError] = useState("");
  const [hasHydratedForm, setHasHydratedForm] = useState(false);
  const missionProgress = computeMonthlyMissionProgress(mission);

  useEffect(() => {
    if (review) {
      setForm(review);
      setHasHydratedForm(true);
      return;
    }

    const draft = readLocalWeeklyReviewDraft(weekStart);
    setForm(draft ?? createEmptyWeeklyReview(weekStart));
    setHasHydratedForm(true);
  }, [review, weekStart]);

  useEffect(() => {
    if (!hasHydratedForm) {
      return;
    }

    const normalizedForm = normalizeWeeklyReviewState(form, weekStart);
    const normalizedReview = review
      ? normalizeWeeklyReviewState(review, weekStart)
      : null;

    if (normalizedReview && JSON.stringify(normalizedReview) === JSON.stringify(normalizedForm)) {
      clearLocalWeeklyReviewDraft(weekStart);
      return;
    }

    if (isWeeklyReviewEmpty(normalizedForm)) {
      clearLocalWeeklyReviewDraft(weekStart);
      return;
    }

    writeLocalWeeklyReviewDraft(normalizedForm);
  }, [form, hasHydratedForm, review, weekStart]);

  function setField<K extends keyof WeeklyReviewState>(
    key: K,
    value: WeeklyReviewState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateWeeklyReview(form);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    await submitReview(form);
    clearLocalWeeklyReviewDraft(form.weekStart);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Weekly review
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
              Adjust the system, not just the mood.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              Review the real evidence from the week, cut the lies quickly, and lock
              in the next standard before Monday starts negotiating with you.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Week range
            </p>
            <p className="mt-2 text-xl font-semibold text-stone-50">
              {formatWeeklyRange(summary.weekStart)}
            </p>
            <p className="mt-2 text-sm text-stone-400">
              {review ? "Review closed" : "Review still open"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Weekly score"
            value={`${summary.totalScore}`}
            detail={`Average ${summary.averageScore}/day across ${summary.daysElapsed} tracked day${summary.daysElapsed === 1 ? "" : "s"}.`}
          />
          <MetricCard
            label="Winning days"
            value={`${summary.winningDays}`}
            detail={`${summary.driftDays} drift day${summary.driftDays === 1 ? "" : "s"} this week.`}
          />
          <MetricCard
            label="Deep work"
            value={formatHours(summary.deepWorkHours)}
            detail={`${summary.sessionCount} logged session${summary.sessionCount === 1 ? "" : "s"}.`}
          />
          <MetricCard
            label="Top-task hit rate"
            value={`${summary.topTaskCompletionRate}%`}
            detail={`${summary.reviewCompletionRate}% nightly review completion.`}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Monthly alignment
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
              Keep the week loyal to the month.
            </h3>
          </div>
          <Link
            href="/mission"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Open mission
          </Link>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Month theme
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-200">
              {mission?.focusTheme || "Set the month theme in the mission layer."}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Monthly mission
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-200">
              {mission?.primaryMission || "Define the mission so the week knows what it serves."}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Mission progress
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-200">
              {missionProgress.completedTargets}/{missionProgress.activeTargets} targets complete
              • {missionProgress.progressPercent}% progress
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Pattern summary
          </p>
          <div className="mt-6 space-y-4">
            {[
              ["Missed top tasks", `${summary.missedTopTasks}`],
              ["Most active pillar", summary.mostActivePillar],
              ["Repeated excuse", summary.repeatedExcuse],
              ["Main lie", summary.mainLie],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  {label}
                </p>
                <p className="mt-2 text-base leading-7 text-stone-100">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Reflection
          </p>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {reviewFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  {field.label}
                </label>
                <textarea
                  className={textAreaClassName}
                  value={form[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                What is next week&apos;s focus?
              </label>
              <textarea
                className={textAreaClassName}
                value={form.nextWeekFocus}
                onChange={(event) => setField("nextWeekFocus", event.target.value)}
                placeholder="What is the one weekly focus that should make next week feel more aligned than this one?"
              />
            </div>

            {formError ? (
              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
                {formError}
              </div>
            ) : null}

            <div className="mt-2 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-stone-500">
                {hasLoaded ? syncMessage : "Loading weekly review..."}
              </p>
              <Button size="lg" type="submit">
                {review ? "Update weekly review" : "Lock next-week focus"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
