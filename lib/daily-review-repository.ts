import "server-only";

import {
  normalizeDailyReviewState,
  type DailyReviewState,
} from "@/lib/daily-review";
import type { OnboardingPersistenceSource } from "@/lib/onboarding";
import {
  createOrUpdateProfileFromSeed,
  findProfileByIdentity,
  type PersistenceIdentity,
} from "@/lib/profile-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ReviewRow = {
  review_date: string;
  finished_text: string | null;
  avoided_text: string | null;
  why_avoided_text: string | null;
  wasted_time_text: string | null;
  tomorrow_first_move: string | null;
  self_rating: number | null;
};

export async function loadPersistedDailyReview(
  identity: PersistenceIdentity,
  reviewDate: string,
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return null;
  }

  const { data, error } = await supabase
    .from("daily_reviews")
    .select(
      "review_date, finished_text, avoided_text, why_avoided_text, wasted_time_text, tomorrow_first_move, self_rating",
    )
    .eq("profile_id", profile.id)
    .eq("review_date", reviewDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as ReviewRow;

  return normalizeDailyReviewState(
    {
      reviewDate: row.review_date,
      finishedText: row.finished_text ?? "",
      avoidedText: row.avoided_text ?? "",
      whyAvoidedText: row.why_avoided_text ?? "",
      wastedTimeText: row.wasted_time_text ?? "",
      tomorrowFirstMove: row.tomorrow_first_move ?? "",
      selfRating: row.self_rating ?? 3,
    },
    reviewDate,
  );
}

export async function savePersistedDailyReview(
  identity: PersistenceIdentity,
  review: DailyReviewState,
  profileSeed?: {
    name?: string;
    tone?: "Honest" | "Strict" | "Supportive";
  },
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();
  const normalized = normalizeDailyReviewState(review, review.reviewDate);
  const profileId = await createOrUpdateProfileFromSeed(identity, profileSeed);

  const { error } = await supabase.from("daily_reviews").upsert(
    {
      profile_id: profileId,
      review_date: normalized.reviewDate,
      finished_text: normalized.finishedText,
      avoided_text: normalized.avoidedText,
      why_avoided_text: normalized.whyAvoidedText,
      wasted_time_text: normalized.wastedTimeText,
      tomorrow_first_move: normalized.tomorrowFirstMove,
      self_rating: normalized.selfRating,
    },
    {
      onConflict: "profile_id,review_date",
    },
  );

  if (error) {
    throw error;
  }

  return "supabase";
}
