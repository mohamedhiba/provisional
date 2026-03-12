import "server-only";

import {
  normalizeFocusSessions,
  type FocusSession,
} from "@/lib/focus-session";
import type { OnboardingPersistenceSource } from "@/lib/onboarding";
import {
  createOrUpdateProfileFromSeed,
  findProfileByIdentity,
  type PersistenceIdentity,
} from "@/lib/profile-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  session_date: string;
  task_title: string;
  planned_minutes: number;
  actual_minutes: number | null;
  quality_rating: number | null;
  work_depth: string | null;
  created_at: string;
  pillar_id: string | null;
};

type PillarRow = {
  id: string;
  name: string;
};

async function getPillarMap(profileId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pillars")
    .select("id, name")
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }

  return new Map((data as PillarRow[] | null ?? []).map((pillar) => [pillar.id, pillar.name]));
}

async function ensurePillars(profileId: string, names: string[]) {
  const supabase = createSupabaseAdminClient();
  const existingPillarMap = await getPillarMap(profileId);
  const existingNames = new Set(existingPillarMap.values());
  const missingNames = names
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => !existingNames.has(name));

  if (missingNames.length === 0) {
    return existingPillarMap;
  }

  const { data: currentPillars } = await supabase
    .from("pillars")
    .select("position")
    .eq("profile_id", profileId)
    .order("position", { ascending: false })
    .limit(1);

  const startPosition = Number(currentPillars?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("pillars").insert(
    missingNames.map((name, index) => ({
      profile_id: profileId,
      name,
      position: startPosition + index,
      is_active: true,
    })),
  );

  if (error) {
    throw error;
  }

  return getPillarMap(profileId);
}

export async function loadPersistedFocusSessions(
  identity: PersistenceIdentity,
  sessionDate: string,
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return [];
  }

  const [{ data: sessions, error: sessionsError }, pillarMap] = await Promise.all([
    supabase
      .from("focus_sessions")
      .select(
        "id, session_date, task_title, planned_minutes, actual_minutes, quality_rating, work_depth, created_at, pillar_id",
      )
      .eq("profile_id", profile.id)
      .eq("session_date", sessionDate)
      .order("created_at", { ascending: false }),
    getPillarMap(profile.id),
  ]);

  if (sessionsError) {
    throw sessionsError;
  }

  return normalizeFocusSessions(
    (sessions as SessionRow[] | null ?? []).map((session) => ({
      id: session.id,
      sessionDate: session.session_date,
      taskTitle: session.task_title,
      plannedMinutes: session.planned_minutes,
      actualMinutes: session.actual_minutes ?? session.planned_minutes,
      qualityRating: session.quality_rating ?? 4,
      workDepth: session.work_depth === "shallow" ? "shallow" : "deep",
      createdAt: session.created_at,
      pillar: session.pillar_id ? (pillarMap.get(session.pillar_id) ?? "") : "",
    })),
    sessionDate,
  );
}

export async function upsertPersistedFocusSessions(
  identity: PersistenceIdentity,
  sessions: FocusSession[],
  profileSeed?: {
    name?: string;
    tone?: "Honest" | "Strict" | "Supportive";
  },
): Promise<OnboardingPersistenceSource> {
  const supabase = createSupabaseAdminClient();

  if (sessions.length === 0) {
    return "supabase";
  }

  const sessionDate = sessions[0]?.sessionDate;
  const normalized = normalizeFocusSessions(sessions, sessionDate);
  const profileId = await createOrUpdateProfileFromSeed(identity, profileSeed);
  const pillarMap = await ensurePillars(
    profileId,
    normalized.map((session) => session.pillar),
  );
  const pillarIdByName = new Map(
    Array.from(pillarMap.entries()).map(([id, name]) => [name, id]),
  );

  const { error } = await supabase.from("focus_sessions").upsert(
    normalized.map((session) => ({
      id: session.id,
      profile_id: profileId,
      pillar_id: pillarIdByName.get(session.pillar) ?? null,
      session_date: session.sessionDate,
      task_title: session.taskTitle,
      planned_minutes: session.plannedMinutes,
      actual_minutes: session.actualMinutes,
      quality_rating: session.qualityRating,
      work_depth: session.workDepth,
      created_at: session.createdAt,
    })),
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }

  return "supabase";
}

export async function deletePersistedFocusSession(
  identity: PersistenceIdentity,
  id: string,
) {
  const supabase = createSupabaseAdminClient();
  const profile = await findProfileByIdentity(identity);

  if (!profile) {
    return;
  }

  const { error } = await supabase
    .from("focus_sessions")
    .delete()
    .eq("profile_id", profile.id)
    .eq("id", id);

  if (error) {
    throw error;
  }
}
