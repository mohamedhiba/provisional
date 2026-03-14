export type WorkDepth = "deep" | "shallow";
export type FocusMode = "timed" | "open-ended";
export type FocusLoopPhase = "preload" | "activation" | "focus" | "recovery";
export type FocusSessionStatus = "completed" | "ended-early";

export type ActivationChecklist = {
  phoneAway: boolean;
  blockersOn: boolean;
  environmentReady: boolean;
  triggerArmed: boolean;
};

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
  startedAt: string | null;
  endedAt: string | null;
  preloadMinutes: number;
  recoveryMinutes: number;
  focusMode: FocusMode;
  activationLabel: string;
  environmentLabel: string;
  recoveryLabel: string;
  distractionCount: number;
  sessionStatus: FocusSessionStatus;
  closureNotes: string;
};

export type FocusLoopPlanDraft = {
  taskTitle: string;
  pillar: string;
  plannedMinutes: string;
  preloadMinutes: string;
  recoveryMinutes: string;
  workDepth: WorkDepth;
  focusMode: FocusMode;
  activationLabel: string;
  environmentLabel: string;
  recoveryLabel: string;
};

export type FocusLoopPreset = {
  id: string;
  label: string;
  detail: string;
  description: string;
  plannedMinutes: number;
  preloadMinutes: number;
  recoveryMinutes: number;
  focusMode: FocusMode;
  activationLabel: string;
  environmentLabel: string;
  recoveryLabel: string;
};

export type ActiveFocusLoop = {
  id: string;
  sessionDate: string;
  taskTitle: string;
  pillar: string;
  plannedMinutes: number;
  preloadMinutes: number;
  recoveryMinutes: number;
  workDepth: WorkDepth;
  focusMode: FocusMode;
  activationLabel: string;
  environmentLabel: string;
  recoveryLabel: string;
  distractionCount: number;
  phase: FocusLoopPhase;
  phaseStartedAt: string;
  createdAt: string;
  focusStartedAt: string | null;
  focusEndedAt: string | null;
  qualityRating: number | null;
  closureNotes: string;
  sessionStatus: FocusSessionStatus | null;
  activationChecklist: ActivationChecklist;
  hasCompletedPreload: boolean;
  blocksCompleted: number;
};

export const focusSessionsStorageKeyPrefix = "proof-focus-sessions";
export const activeFocusLoopStorageKeyPrefix = "proof-active-focus-loop-v1";

export const defaultActivationChecklist: ActivationChecklist = {
  phoneAway: true,
  blockersOn: false,
  environmentReady: false,
  triggerArmed: false,
};

export const focusLoopPresets: FocusLoopPreset[] = [
  {
    id: "reset-50",
    label: "Reset 50",
    detail: "5m preload • 50m block • 10m reset",
    description:
      "Use this when drift is high and you need one clean block to re-establish control.",
    plannedMinutes: 50,
    preloadMinutes: 5,
    recoveryMinutes: 10,
    focusMode: "timed",
    activationLabel: "Cold water, headphones on",
    environmentLabel: "Clear desk and one tab",
    recoveryLabel: "Walk without the phone",
  },
  {
    id: "deep-75",
    label: "Deep 75",
    detail: "8m preload • 75m block • 12m reset",
    description:
      "The default high-output block for study, coding, writing, or hard cognitive work.",
    plannedMinutes: 75,
    preloadMinutes: 8,
    recoveryMinutes: 12,
    focusMode: "timed",
    activationLabel: "Specific drink or mint",
    environmentLabel: "Low light and full-screen work",
    recoveryLabel: "Stretch, breathe, no dopamine spike",
  },
  {
    id: "monk-90",
    label: "Monk 90",
    detail: "10m preload • 90m block • 15m reset",
    description:
      "The flagship block. Use it for the one thing that should move the day forward.",
    plannedMinutes: 90,
    preloadMinutes: 10,
    recoveryMinutes: 15,
    focusMode: "timed",
    activationLabel: "Signature cue and locked-in posture",
    environmentLabel: "Peripheral blackout and no side inputs",
    recoveryLabel: "Walk, journal one line, then return",
  },
  {
    id: "open-loop",
    label: "Open loop",
    detail: "5m preload • open-ended block • 10m reset",
    description:
      "Use this when you want the system but do not want the timer to decide the exit.",
    plannedMinutes: 90,
    preloadMinutes: 5,
    recoveryMinutes: 10,
    focusMode: "open-ended",
    activationLabel: "One sensory trigger only",
    environmentLabel: "Noise isolated and screen-only",
    recoveryLabel: "Eyes off the screen and walk",
  },
];

export const focusActivationSuggestions = [
  "Espresso or tea as the lock-in cue",
  "Mint gum and headphones on",
  "Cold water and one deep breath",
  "Specific playlist only for work",
];

export const focusEnvironmentSuggestions = [
  "Clear desk and one open task",
  "Low light with peripheral blackout",
  "Library mode with notifications dead",
  "Headphones on and browser locked down",
];

export const focusRecoverySuggestions = [
  "Walk without the phone",
  "Stretch and look away from the screen",
  "Breathing reset and water",
  "Notebook reset before the next block",
];

export const defaultFocusLoopPlanDraft: FocusLoopPlanDraft = {
  taskTitle: "",
  pillar: "",
  plannedMinutes: "75",
  preloadMinutes: "8",
  recoveryMinutes: "12",
  workDepth: "deep",
  focusMode: "timed",
  activationLabel: focusActivationSuggestions[0] ?? "",
  environmentLabel: focusEnvironmentSuggestions[0] ?? "",
  recoveryLabel: focusRecoverySuggestions[0] ?? "",
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
  startedAt?: string | null;
  endedAt?: string | null;
  preloadMinutes?: number;
  recoveryMinutes?: number;
  focusMode?: FocusMode;
  activationLabel?: string;
  environmentLabel?: string;
  recoveryLabel?: string;
  distractionCount?: number;
  sessionStatus?: FocusSessionStatus;
  closureNotes?: string;
  id?: string;
}): FocusSession {
  return {
    id:
      input.id ??
      globalThis.crypto?.randomUUID?.() ??
      `session-${Math.random().toString(36).slice(2, 10)}`,
    sessionDate: input.sessionDate,
    taskTitle: input.taskTitle.trim(),
    pillar: input.pillar.trim(),
    plannedMinutes: input.plannedMinutes,
    actualMinutes: input.actualMinutes,
    qualityRating: input.qualityRating,
    workDepth: input.workDepth,
    createdAt: input.createdAt ?? new Date().toISOString(),
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    preloadMinutes: input.preloadMinutes ?? 0,
    recoveryMinutes: input.recoveryMinutes ?? 10,
    focusMode: input.focusMode ?? "timed",
    activationLabel: input.activationLabel?.trim() ?? "",
    environmentLabel: input.environmentLabel?.trim() ?? "",
    recoveryLabel: input.recoveryLabel?.trim() ?? "",
    distractionCount: Math.max(0, input.distractionCount ?? 0),
    sessionStatus: input.sessionStatus ?? "completed",
    closureNotes: input.closureNotes?.trim() ?? "",
  };
}

export function normalizeFocusSession(
  value: Partial<FocusSession>,
  sessionDate: string,
): FocusSession {
  const plannedMinutes = Number(value.plannedMinutes ?? 0);
  const actualMinutes = Number(value.actualMinutes ?? plannedMinutes);
  const qualityRating = Number(value.qualityRating ?? 4);
  const preloadMinutes = Number(value.preloadMinutes ?? 0);
  const recoveryMinutes = Number(value.recoveryMinutes ?? 10);
  const distractionCount = Number(value.distractionCount ?? 0);
  const workDepth = value.workDepth === "shallow" ? "shallow" : "deep";
  const focusMode = value.focusMode === "open-ended" ? "open-ended" : "timed";
  const sessionStatus =
    value.sessionStatus === "ended-early" ? "ended-early" : "completed";

  return createFocusSession({
    id: value.id,
    sessionDate: value.sessionDate ?? sessionDate,
    taskTitle: value.taskTitle ?? "",
    pillar: value.pillar ?? "",
    plannedMinutes: Number.isFinite(plannedMinutes) ? plannedMinutes : 0,
    actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : 0,
    qualityRating: Math.min(
      5,
      Math.max(1, Number.isFinite(qualityRating) ? qualityRating : 4),
    ),
    workDepth,
    createdAt: value.createdAt,
    startedAt:
      typeof value.startedAt === "string" || value.startedAt === null
        ? value.startedAt
        : null,
    endedAt:
      typeof value.endedAt === "string" || value.endedAt === null
        ? value.endedAt
        : null,
    preloadMinutes: Number.isFinite(preloadMinutes) ? preloadMinutes : 0,
    recoveryMinutes: Number.isFinite(recoveryMinutes) ? recoveryMinutes : 10,
    focusMode,
    activationLabel: value.activationLabel ?? "",
    environmentLabel: value.environmentLabel ?? "",
    recoveryLabel: value.recoveryLabel ?? "",
    distractionCount: Number.isFinite(distractionCount) ? distractionCount : 0,
    sessionStatus,
    closureNotes: value.closureNotes ?? "",
  });
}

export function normalizeFocusSessions(
  value: Array<Partial<FocusSession>> | null | undefined,
  sessionDate: string,
) {
  const list = Array.isArray(value) ? value : [];
  const byId = new Map<string, FocusSession>();

  for (const item of list.map((entry) => normalizeFocusSession(entry, sessionDate))) {
    if (!item.taskTitle.trim()) {
      continue;
    }

    const existing = byId.get(item.id);

    if (!existing || existing.createdAt < item.createdAt) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export function writeLocalFocusSessions(sessionDate: string, sessions: FocusSession[]) {
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

export function applyFocusLoopPreset(
  preset: FocusLoopPreset,
  current: FocusLoopPlanDraft,
  pillar?: string,
) {
  return {
    ...current,
    pillar: current.pillar || pillar || current.pillar,
    plannedMinutes: String(preset.plannedMinutes),
    preloadMinutes: String(preset.preloadMinutes),
    recoveryMinutes: String(preset.recoveryMinutes),
    focusMode: preset.focusMode,
    activationLabel: preset.activationLabel,
    environmentLabel: preset.environmentLabel,
    recoveryLabel: preset.recoveryLabel,
  } satisfies FocusLoopPlanDraft;
}

export function validateFocusLoopPlanDraft(draft: FocusLoopPlanDraft) {
  if (!draft.taskTitle.trim()) {
    return "Choose the work block this loop is protecting.";
  }

  if (!draft.pillar.trim()) {
    return "Choose the pillar this focus window belongs to.";
  }

  const plannedMinutes = Number(draft.plannedMinutes);
  const preloadMinutes = Number(draft.preloadMinutes);
  const recoveryMinutes = Number(draft.recoveryMinutes);

  if (
    draft.focusMode === "timed" &&
    (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0)
  ) {
    return "Timed loops need a positive focus duration.";
  }

  if (!Number.isFinite(preloadMinutes) || preloadMinutes <= 0) {
    return "Preload needs at least one intentional minute.";
  }

  if (!Number.isFinite(recoveryMinutes) || recoveryMinutes <= 0) {
    return "Recovery needs at least one planned minute.";
  }

  if (!draft.activationLabel.trim()) {
    return "Choose a sensory activation cue for the loop.";
  }

  if (!draft.environmentLabel.trim()) {
    return "Set the environment you are locking into.";
  }

  if (!draft.recoveryLabel.trim()) {
    return "Choose a low-dopamine recovery move.";
  }

  return "";
}

export function createActiveFocusLoop(
  draft: FocusLoopPlanDraft,
  sessionDate: string,
  now = new Date().toISOString(),
): ActiveFocusLoop {
  const plannedMinutes = Number(draft.plannedMinutes);
  const preloadMinutes = Number(draft.preloadMinutes);
  const recoveryMinutes = Number(draft.recoveryMinutes);

  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `loop-${Math.random().toString(36).slice(2, 10)}`,
    sessionDate,
    taskTitle: draft.taskTitle.trim(),
    pillar: draft.pillar.trim(),
    plannedMinutes:
      draft.focusMode === "open-ended"
        ? Number.isFinite(plannedMinutes) && plannedMinutes > 0
          ? plannedMinutes
          : 90
        : plannedMinutes,
    preloadMinutes,
    recoveryMinutes,
    workDepth: draft.workDepth,
    focusMode: draft.focusMode,
    activationLabel: draft.activationLabel.trim(),
    environmentLabel: draft.environmentLabel.trim(),
    recoveryLabel: draft.recoveryLabel.trim(),
    distractionCount: 0,
    phase: "preload",
    phaseStartedAt: now,
    createdAt: now,
    focusStartedAt: null,
    focusEndedAt: null,
    qualityRating: null,
    closureNotes: "",
    sessionStatus: null,
    activationChecklist: { ...defaultActivationChecklist },
    hasCompletedPreload: false,
    blocksCompleted: 0,
  };
}

export function normalizeActiveFocusLoop(
  value: Partial<ActiveFocusLoop> | null | undefined,
  sessionDate: string,
) {
  if (!value) {
    return null;
  }

  const phase: FocusLoopPhase =
    value.phase === "activation" ||
    value.phase === "focus" ||
    value.phase === "recovery"
      ? value.phase
      : "preload";

  return {
    id:
      value.id ??
      globalThis.crypto?.randomUUID?.() ??
      `loop-${Math.random().toString(36).slice(2, 10)}`,
    sessionDate: value.sessionDate ?? sessionDate,
    taskTitle: String(value.taskTitle ?? "").trim(),
    pillar: String(value.pillar ?? "").trim(),
    plannedMinutes: Math.max(1, Number(value.plannedMinutes ?? 90)),
    preloadMinutes: Math.max(1, Number(value.preloadMinutes ?? 5)),
    recoveryMinutes: Math.max(1, Number(value.recoveryMinutes ?? 10)),
    workDepth: value.workDepth === "shallow" ? "shallow" : "deep",
    focusMode: value.focusMode === "open-ended" ? "open-ended" : "timed",
    activationLabel: String(value.activationLabel ?? "").trim(),
    environmentLabel: String(value.environmentLabel ?? "").trim(),
    recoveryLabel: String(value.recoveryLabel ?? "").trim(),
    distractionCount: Math.max(0, Number(value.distractionCount ?? 0)),
    phase,
    phaseStartedAt:
      typeof value.phaseStartedAt === "string"
        ? value.phaseStartedAt
        : new Date().toISOString(),
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    focusStartedAt:
      typeof value.focusStartedAt === "string" || value.focusStartedAt === null
        ? value.focusStartedAt
        : null,
    focusEndedAt:
      typeof value.focusEndedAt === "string" || value.focusEndedAt === null
        ? value.focusEndedAt
        : null,
    qualityRating:
      typeof value.qualityRating === "number" &&
      value.qualityRating >= 1 &&
      value.qualityRating <= 5
        ? value.qualityRating
        : null,
    closureNotes: String(value.closureNotes ?? ""),
    sessionStatus:
      value.sessionStatus === "ended-early" ||
      value.sessionStatus === "completed"
        ? value.sessionStatus
        : null,
    activationChecklist: {
      phoneAway: Boolean(value.activationChecklist?.phoneAway),
      blockersOn: Boolean(value.activationChecklist?.blockersOn),
      environmentReady: Boolean(value.activationChecklist?.environmentReady),
      triggerArmed: Boolean(value.activationChecklist?.triggerArmed),
    },
    hasCompletedPreload: Boolean(value.hasCompletedPreload),
    blocksCompleted: Math.max(0, Number(value.blocksCompleted ?? 0)),
  } satisfies ActiveFocusLoop;
}

export function getActiveFocusLoopStorageKey(sessionDate: string) {
  return `${activeFocusLoopStorageKeyPrefix}:${sessionDate}`;
}

export function readLocalActiveFocusLoop(sessionDate: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(getActiveFocusLoopStorageKey(sessionDate));

  if (!saved) {
    return null;
  }

  try {
    return normalizeActiveFocusLoop(
      JSON.parse(saved) as Partial<ActiveFocusLoop>,
      sessionDate,
    );
  } catch {
    window.localStorage.removeItem(getActiveFocusLoopStorageKey(sessionDate));
    return null;
  }
}

export function writeLocalActiveFocusLoop(
  sessionDate: string,
  loop: ActiveFocusLoop | null,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!loop) {
    window.localStorage.removeItem(getActiveFocusLoopStorageKey(sessionDate));
    return;
  }

  window.localStorage.setItem(
    getActiveFocusLoopStorageKey(sessionDate),
    JSON.stringify(loop),
  );
}

export function clearLocalActiveFocusLoop(sessionDate: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getActiveFocusLoopStorageKey(sessionDate));
}

export function getElapsedSeconds(startIso: string | null | undefined, now = Date.now()) {
  if (!startIso) {
    return 0;
  }

  const start = new Date(startIso).getTime();

  if (!Number.isFinite(start)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - start) / 1000));
}

export function getElapsedMinutes(startIso: string | null | undefined, endIso?: string | null) {
  if (!startIso) {
    return 0;
  }

  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(1, Math.round((end - start) / 1000 / 60));
}

export function getTimedPhaseTargetSeconds(loop: ActiveFocusLoop) {
  if (loop.phase === "preload") {
    return loop.preloadMinutes * 60;
  }

  if (loop.phase === "focus" && loop.focusMode === "timed") {
    return loop.plannedMinutes * 60;
  }

  if (loop.phase === "recovery") {
    return loop.recoveryMinutes * 60;
  }

  return 0;
}

export function buildFocusSessionFromLoop(
  loop: ActiveFocusLoop,
  options?: {
    endedAt?: string;
    qualityRating?: number;
    closureNotes?: string;
    recoveryLabel?: string;
    sessionStatus?: FocusSessionStatus;
  },
) {
  const endedAt = options?.endedAt ?? loop.focusEndedAt ?? new Date().toISOString();
  const qualityRating = options?.qualityRating ?? loop.qualityRating ?? 4;
  const actualMinutes =
    getElapsedMinutes(loop.focusStartedAt, endedAt) ||
    (loop.focusMode === "timed" ? loop.plannedMinutes : 1);

  return createFocusSession({
    id: loop.id,
    sessionDate: loop.sessionDate,
    taskTitle: loop.taskTitle,
    pillar: loop.pillar,
    plannedMinutes: loop.plannedMinutes,
    actualMinutes,
    qualityRating,
    workDepth: loop.workDepth,
    createdAt: loop.createdAt,
    startedAt: loop.focusStartedAt ?? loop.createdAt,
    endedAt,
    preloadMinutes: loop.preloadMinutes,
    recoveryMinutes: loop.recoveryMinutes,
    focusMode: loop.focusMode,
    activationLabel: loop.activationLabel,
    environmentLabel: loop.environmentLabel,
    recoveryLabel: options?.recoveryLabel ?? loop.recoveryLabel,
    distractionCount: loop.distractionCount,
    sessionStatus: options?.sessionStatus ?? loop.sessionStatus ?? "completed",
    closureNotes: options?.closureNotes ?? loop.closureNotes,
  });
}

export function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

export function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const totalDistractions = sessions.reduce(
    (sum, session) => sum + session.distractionCount,
    0,
  );
  const completedLoops = sessions.filter(
    (session) => session.sessionStatus === "completed",
  ).length;

  return {
    totalSessions: sessions.length,
    totalMinutes,
    deepMinutes,
    averageQuality,
    totalDistractions,
    completedLoops,
  };
}
