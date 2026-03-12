import { getTodayIsoDate } from "@/lib/daily-plan";

export type DailyReviewState = {
  reviewDate: string;
  finishedText: string;
  avoidedText: string;
  whyAvoidedText: string;
  wastedTimeText: string;
  tomorrowFirstMove: string;
  selfRating: number;
};

export const dailyReviewStorageKeyPrefix = "proof-daily-review";

export function createEmptyDailyReview(reviewDate = getTodayIsoDate()): DailyReviewState {
  return {
    reviewDate,
    finishedText: "",
    avoidedText: "",
    whyAvoidedText: "",
    wastedTimeText: "",
    tomorrowFirstMove: "",
    selfRating: 3,
  };
}

export function normalizeDailyReviewState(
  value: Partial<DailyReviewState> | null | undefined,
  reviewDate = getTodayIsoDate(),
): DailyReviewState {
  const safe = value ?? {};
  const selfRating = Number(safe.selfRating ?? 3);

  return {
    reviewDate: safe.reviewDate ?? reviewDate,
    finishedText: safe.finishedText ?? "",
    avoidedText: safe.avoidedText ?? "",
    whyAvoidedText: safe.whyAvoidedText ?? "",
    wastedTimeText: safe.wastedTimeText ?? "",
    tomorrowFirstMove: safe.tomorrowFirstMove ?? "",
    selfRating: Number.isFinite(selfRating)
      ? Math.min(5, Math.max(1, selfRating))
      : 3,
  };
}

export function getDailyReviewStorageKey(reviewDate: string) {
  return `${dailyReviewStorageKeyPrefix}:${reviewDate}`;
}

export function readLocalDailyReviewState(reviewDate: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getDailyReviewStorageKey(reviewDate));

  if (!saved) {
    return null;
  }

  try {
    return normalizeDailyReviewState(
      JSON.parse(saved) as Partial<DailyReviewState>,
      reviewDate,
    );
  } catch {
    window.localStorage.removeItem(getDailyReviewStorageKey(reviewDate));
    return null;
  }
}

export function writeLocalDailyReviewState(state: DailyReviewState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getDailyReviewStorageKey(state.reviewDate),
    JSON.stringify(state),
  );
}

export function validateDailyReview(state: DailyReviewState) {
  const requiredFields = [
    state.finishedText,
    state.avoidedText,
    state.whyAvoidedText,
    state.wastedTimeText,
    state.tomorrowFirstMove,
  ];

  if (requiredFields.some((value) => !value.trim())) {
    return "Finish every review field so the day closes with clarity instead of vagueness.";
  }

  return "";
}
