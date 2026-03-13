import "server-only";

import { getLegacyCorrectedDate } from "@/lib/day-boundary";
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
  id: string;
  review_date: string;
  finished_text: string | null;
  avoided_text: string | null;
  why_avoided_text: string | null;
  wasted_time_text: string | null;
  tomorrow_first_move: string | null;
  self_rating: number | null;
  created_at: string;
};

function toReviewState(row: ReviewRow, fallbackDate: string) {
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
    fallbackDate,
  );
}

function getReviewRichness(review: DailyReviewState) {
  return [
    review.finishedText,
    review.avoidedText,
    review.whyAvoidedText,
    review.wastedTimeText,
    review.tomorrowFirstMove,
  ].filter((value) => value.trim()).length;
}

function mergeDailyReviews(primary: DailyReviewState, secondary: DailyReviewState, reviewDate: string) {
  const winner = getReviewRichness(primary) >= getReviewRichness(secondary) ? primary : secondary;
  const loser = winner === primary ? secondary : primary;

  return normalizeDailyReviewState(
    {
      reviewDate,
      finishedText: winner.finishedText.trim() || loser.finishedText,
      avoidedText: winner.avoidedText.trim() || loser.avoidedText,
      whyAvoidedText: winner.whyAvoidedText.trim() || loser.whyAvoidedText,
      wastedTimeText: winner.wastedTimeText.trim() || loser.wastedTimeText,
      tomorrowFirstMove: winner.tomorrowFirstMove.trim() || loser.tomorrowFirstMove,
      selfRating: winner.selfRating || loser.selfRating,
    },
    reviewDate,
  );
}

export async function repairLegacyDailyReviewDate(
  identity: PersistenceIdentity,
  requestedDate: string,
  timeZone?: string | null,
) {
  if (!timeZone) {
    return { repaired: false };
  }

  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return { repaired: false };
  }

  const { data, error } = await supabase
    .from("daily_reviews")
    .select(
      "id, review_date, finished_text, avoided_text, why_avoided_text, wasted_time_text, tomorrow_first_move, self_rating, created_at",
    )
    .eq("profile_id", profile.id)
    .eq("review_date", requestedDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { repaired: false };
  }

  const row = data as ReviewRow;
  const correctedDate = getLegacyCorrectedDate(row.review_date, row.created_at, timeZone);

  if (!correctedDate) {
    return { repaired: false };
  }

  const currentState = toReviewState(row, correctedDate);
  const { data: existingTarget, error: targetError } = await supabase
    .from("daily_reviews")
    .select(
      "id, review_date, finished_text, avoided_text, why_avoided_text, wasted_time_text, tomorrow_first_move, self_rating, created_at",
    )
    .eq("profile_id", profile.id)
    .eq("review_date", correctedDate)
    .maybeSingle();

  if (targetError) {
    throw targetError;
  }

  if (existingTarget) {
    const merged = mergeDailyReviews(
      toReviewState(existingTarget as ReviewRow, correctedDate),
      currentState,
      correctedDate,
    );

    const { error: updateError } = await supabase
      .from("daily_reviews")
      .update({
        finished_text: merged.finishedText,
        avoided_text: merged.avoidedText,
        why_avoided_text: merged.whyAvoidedText,
        wasted_time_text: merged.wastedTimeText,
        tomorrow_first_move: merged.tomorrowFirstMove,
        self_rating: merged.selfRating,
      })
      .eq("id", (existingTarget as ReviewRow).id);

    if (updateError) {
      throw updateError;
    }

    const { error: deleteError } = await supabase
      .from("daily_reviews")
      .delete()
      .eq("id", row.id);

    if (deleteError) {
      throw deleteError;
    }
  } else {
    const { error: moveError } = await supabase
      .from("daily_reviews")
      .update({ review_date: correctedDate })
      .eq("id", row.id);

    if (moveError) {
      throw moveError;
    }
  }

  return {
    repaired: true,
    correctedDate,
  };
}

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
      "id, review_date, finished_text, avoided_text, why_avoided_text, wasted_time_text, tomorrow_first_move, self_rating, created_at",
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

  return toReviewState(row, reviewDate);
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
