export type WorkDepth = "deep" | "shallow";

export type FocusSession = {
  id: string;
  sessionDate: string;
  taskTitle: string;
  pillar: string;
  plannedMinutes: number;
  actualMinutes: number;
  qualityRating: number;
  workDepth: WorkDepth;
  createdAt: string;
};

export type FocusSessionDraft = {
  taskTitle: string;
  pillar: string;
  plannedMinutes: string;
  actualMinutes: string;
  qualityRating: string;
  workDepth: WorkDepth;
};

export const focusSessionsStorageKeyPrefix = "proof-focus-sessions";

export const defaultFocusSessionDraft: FocusSessionDraft = {
  taskTitle: "",
  pillar: "",
  plannedMinutes: "90",
  actualMinutes: "90",
  qualityRating: "4",
  workDepth: "deep",
};

export function createFocusSession(input: {
  sessionDate: string;
  taskTitle: string;
  pillar: string;
  plannedMinutes: number;
  actualMinutes: number;
  qualityRating: number;
  workDepth: WorkDepth;
  createdAt?: string;
  id?: string;
}): FocusSession {
  return {
    id: input.id ?? globalThis.crypto?.randomUUID?.() ?? `session-${Math.random().toString(36).slice(2, 10)}`,
    sessionDate: input.sessionDate,
    taskTitle: input.taskTitle.trim(),
    pillar: input.pillar.trim(),
    plannedMinutes: input.plannedMinutes,
    actualMinutes: input.actualMinutes,
    qualityRating: input.qualityRating,
    workDepth: input.workDepth,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function normalizeFocusSession(
  value: Partial<FocusSession>,
  sessionDate: string,
): FocusSession {
  const plannedMinutes = Number(value.plannedMinutes ?? 0);
  const actualMinutes = Number(value.actualMinutes ?? plannedMinutes);
  const qualityRating = Number(value.qualityRating ?? 4);
  const workDepth = value.workDepth === "shallow" ? "shallow" : "deep";

  return createFocusSession({
    id: value.id,
    sessionDate: value.sessionDate ?? sessionDate,
    taskTitle: value.taskTitle ?? "",
    pillar: value.pillar ?? "",
    plannedMinutes: Number.isFinite(plannedMinutes) ? plannedMinutes : 0,
    actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : 0,
    qualityRating: Math.min(5, Math.max(1, Number.isFinite(qualityRating) ? qualityRating : 4)),
    workDepth,
    createdAt: value.createdAt,
  });
}

export function normalizeFocusSessions(
  value: Array<Partial<FocusSession>> | null | undefined,
  sessionDate: string,
) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((item) => normalizeFocusSession(item, sessionDate))
    .filter((item) => item.taskTitle.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getFocusSessionsStorageKey(sessionDate: string) {
  return `${focusSessionsStorageKeyPrefix}:${sessionDate}`;
}

export function readLocalFocusSessions(sessionDate: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(getFocusSessionsStorageKey(sessionDate));

  if (!saved) {
    return [];
  }

  try {
    return normalizeFocusSessions(
      JSON.parse(saved) as Array<Partial<FocusSession>>,
      sessionDate,
    );
  } catch {
    window.localStorage.removeItem(getFocusSessionsStorageKey(sessionDate));
    return [];
  }
}

export function writeLocalFocusSessions(
  sessionDate: string,
  sessions: FocusSession[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getFocusSessionsStorageKey(sessionDate),
    JSON.stringify(sessions),
  );
}

export function clearLocalFocusSessions(sessionDate: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getFocusSessionsStorageKey(sessionDate));
}

export function parseFocusSessionDraft(
  draft: FocusSessionDraft,
  sessionDate: string,
) {
  const plannedMinutes = Number(draft.plannedMinutes);
  const actualMinutes = Number(draft.actualMinutes || draft.plannedMinutes);
  const qualityRating = Number(draft.qualityRating);

  return createFocusSession({
    sessionDate,
    taskTitle: draft.taskTitle,
    pillar: draft.pillar,
    plannedMinutes: Number.isFinite(plannedMinutes) ? plannedMinutes : 0,
    actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : 0,
    qualityRating: Number.isFinite(qualityRating) ? qualityRating : 4,
    workDepth: draft.workDepth,
  });
}

export function validateFocusSessionDraft(draft: FocusSessionDraft) {
  if (!draft.taskTitle.trim()) {
    return "Give the session a concrete task.";
  }

  if (!draft.pillar.trim()) {
    return "Choose the pillar this session belongs to.";
  }

  const plannedMinutes = Number(draft.plannedMinutes);
  const actualMinutes = Number(draft.actualMinutes);
  const qualityRating = Number(draft.qualityRating);

  if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
    return "Planned duration must be a positive number of minutes.";
  }

  if (!Number.isFinite(actualMinutes) || actualMinutes <= 0) {
    return "Actual duration must be a positive number of minutes.";
  }

  if (!Number.isFinite(qualityRating) || qualityRating < 1 || qualityRating > 5) {
    return "Quality rating must be between 1 and 5.";
  }

  return "";
}

export function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

export function computeFocusSessionMetrics(sessions: FocusSession[]) {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.actualMinutes, 0);
  const deepMinutes = sessions
    .filter((session) => session.workDepth === "deep")
    .reduce((sum, session) => sum + session.actualMinutes, 0);
  const averageQuality =
    sessions.length > 0
      ? (
          sessions.reduce((sum, session) => sum + session.qualityRating, 0) /
          sessions.length
        ).toFixed(1)
      : "0.0";

  return {
    totalSessions: sessions.length,
    totalMinutes,
    deepMinutes,
    averageQuality,
  };
}
