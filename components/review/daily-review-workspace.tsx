"use client";

import { useEffect, useState } from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { Button } from "@/components/ui/button";
import { InfoCallout } from "@/components/ui/info-callout";
import { formatPlanDate } from "@/lib/daily-plan";
import {
  clearLocalDailyReviewDraft,
  createEmptyDailyReview,
  isDailyReviewEmpty,
  normalizeDailyReviewState,
  readLocalDailyReviewDraft,
  validateDailyReview,
  writeLocalDailyReviewDraft,
  type DailyReviewState,
} from "@/lib/daily-review";
import {
  computeDailyScore,
  getDailyJudgmentLine,
  getDailyScoreLabel,
} from "@/lib/daily-score";

const textAreaClassName =
  "min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

const reviewFields = [
  {
    key: "finishedText",
    label: "What did you finish?",
    placeholder: "What concrete work was actually completed today?",
  },
  {
    key: "avoidedText",
    label: "What did you avoid?",
    placeholder: "What meaningful task stayed open or got dodged?",
  },
  {
    key: "whyAvoidedText",
    label: "Why did you avoid it?",
    placeholder: "Name the real reason: confusion, friction, fear, tiredness, distraction, overplanning...",
  },
  {
    key: "wastedTimeText",
    label: "What wasted your time?",
    placeholder: "Scrolling, admin work, context switching, fake productivity, poor sleep spillover...",
  },
  {
    key: "tomorrowFirstMove",
    label: "Tomorrow's first move",
    placeholder: "What is the first hard move tomorrow morning before the day gets noisy?",
  },
] satisfies Array<{
  key: keyof Pick<
    DailyReviewState,
    | "finishedText"
    | "avoidedText"
    | "whyAvoidedText"
    | "wastedTimeText"
    | "tomorrowFirstMove"
  >;
  label: string;
  placeholder: string;
}>;

export function DailyReviewWorkspace() {
  const { today } = useCurrentDate();
  const { dailyPlan } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review, hasLoaded, syncMessage, submitReview } = useDailyReview();
  const [form, setForm] = useState<DailyReviewState>(createEmptyDailyReview(today));
  const [formError, setFormError] = useState("");
  const [hasHydratedForm, setHasHydratedForm] = useState(false);

  useEffect(() => {
    if (review) {
      setForm(review);
      setHasHydratedForm(true);
      return;
    }

    const draft = readLocalDailyReviewDraft(today);
    setForm(draft ?? createEmptyDailyReview(today));
    setHasHydratedForm(true);
  }, [review, today]);

  useEffect(() => {
    if (!hasHydratedForm) {
      return;
    }

    const normalizedForm = normalizeDailyReviewState(form, today);
    const normalizedReview = review
      ? normalizeDailyReviewState(review, today)
      : null;

    if (normalizedReview && JSON.stringify(normalizedReview) === JSON.stringify(normalizedForm)) {
      clearLocalDailyReviewDraft(today);
      return;
    }

    if (isDailyReviewEmpty(normalizedForm)) {
      clearLocalDailyReviewDraft(today);
      return;
    }

    writeLocalDailyReviewDraft(normalizedForm);
  }, [form, hasHydratedForm, review, today]);

  const draftScore = computeDailyScore({
    dailyPlan,
    sessions,
    reviewCompleted: Boolean(review),
  });
  const scoreLabel = getDailyScoreLabel(draftScore);
  const judgmentLine = getDailyJudgmentLine({
    score: draftScore,
    oneThingDone: dailyPlan.oneThingDone,
    hasSessions: sessions.length > 0,
    reviewCompleted: Boolean(review),
  });

  function setField<K extends keyof DailyReviewState>(key: K, value: DailyReviewState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateDailyReview(form);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    await submitReview(form);
    clearLocalDailyReviewDraft(form.reviewDate);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      {!review && !dailyPlan.oneThing.trim() && sessions.length === 0 ? (
        <InfoCallout
          eyebrow="Review guide"
          title="Night reviews should be short, honest, and slightly uncomfortable."
          body="Write what actually happened, not what should have happened. If the day was vague or thin, say that plainly, then decide the first concrete move for tomorrow."
        />
      ) : null}

      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Daily review
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
              Face the truth before the day ends.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              A day is not complete because it passed. It is complete when you record what
              happened, what you avoided, and what must happen first tomorrow.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/75">
              Active day
            </p>
            <p className="mt-2 text-xl font-semibold text-stone-50">{formatPlanDate(today)}</p>
            <p className="mt-2 text-sm text-stone-300">
              {review ? `Final score ${draftScore} • ${scoreLabel}` : `Draft score ${draftScore} • ${scoreLabel}`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "One thing",
              value: dailyPlan.oneThingDone ? "Done" : "Open",
              detail: dailyPlan.oneThing.trim() || "No top priority chosen yet.",
            },
            {
              label: "Focus blocks",
              value: `${sessions.length}`,
              detail:
                sessions.length > 0
                  ? `${sessions.length} saved block${sessions.length === 1 ? "" : "s"} today`
                  : "No work evidence logged yet.",
            },
            {
              label: "Review status",
              value: review ? "Closed" : "Open",
              detail: judgmentLine,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                {item.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-400">{item.detail}</p>
            </div>
          ))}
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
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
              Self-rating
            </label>
            <select
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40"
              value={`${form.selfRating}`}
              onChange={(event) => setField("selfRating", Number(event.target.value))}
            >
              {["1", "2", "3", "4", "5"].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}/5
                </option>
              ))}
            </select>
          </div>

          {formError ? (
            <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
              {formError}
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-stone-500">
              {hasLoaded ? syncMessage : "Loading nightly review..."}
            </p>
            <Button size="lg" type="submit">
              {review ? "Update review" : "Submit review"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
