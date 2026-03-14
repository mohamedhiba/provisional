"use client";

import {
  CircleCheckBig,
  CircleOff,
  CopyPlus,
  Footprints,
  Headphones,
  MoonStar,
  PencilLine,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { Button } from "@/components/ui/button";
import {
  buildFocusSessionFromLoop,
  computeFocusSessionMetrics,
  createActiveFocusLoop,
  defaultActivationChecklist,
  defaultFocusLoopPlanDraft,
  focusLoopPresets,
  formatMinutes,
  formatTimer,
  getElapsedSeconds,
  getTimedPhaseTargetSeconds,
  validateFocusLoopPlanDraft,
  type ActiveFocusLoop,
  type ActivationChecklist,
  type FocusLoopPhase,
  type FocusSession,
  type FocusSessionStatus,
  type WorkDepth,
} from "@/lib/focus-session";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40";

const textAreaClassName =
  "min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

type BlockDraft = {
  taskTitle: string;
  pillar: string;
  plannedMinutes: string;
  workDepth: WorkDepth;
};

type SessionDraft = {
  taskTitle: string;
  pillar: string;
  plannedMinutes: string;
  actualMinutes: string;
  workDepth: WorkDepth;
  qualityRating: number;
  closureNotes: string;
};

const checklistItems: Array<{
  key: keyof ActivationChecklist;
  label: string;
}> = [
  { key: "phoneAway", label: "Phone away" },
  { key: "blockersOn", label: "Blockers on" },
  { key: "environmentReady", label: "Environment set" },
  { key: "triggerArmed", label: "Cue used" },
];

const phaseOrder: FocusLoopPhase[] = [
  "preload",
  "activation",
  "focus",
  "recovery",
];

function getPillars(values: string[]) {
  return values.length > 0 ? values : ["Work", "Study", "Health", "Personal"];
}

function getDefaultDraft(pillars: string[]) {
  const preset = focusLoopPresets[2] ?? focusLoopPresets[1] ?? focusLoopPresets[0];

  return {
    ...defaultFocusLoopPlanDraft,
    pillar: pillars[0] ?? "",
    plannedMinutes: String(preset?.plannedMinutes ?? 90),
    preloadMinutes: String(preset?.preloadMinutes ?? 10),
    recoveryMinutes: String(preset?.recoveryMinutes ?? 10),
    activationLabel: preset?.activationLabel ?? defaultFocusLoopPlanDraft.activationLabel,
    environmentLabel:
      preset?.environmentLabel ?? defaultFocusLoopPlanDraft.environmentLabel,
    recoveryLabel: preset?.recoveryLabel ?? defaultFocusLoopPlanDraft.recoveryLabel,
  };
}

function getNextBlockDraft(loop: ActiveFocusLoop | null): BlockDraft {
  return {
    taskTitle: loop?.blocksCompleted ? loop.taskTitle : "",
    pillar: loop?.pillar ?? "",
    plannedMinutes: String(loop?.plannedMinutes ?? 75),
    workDepth: loop?.workDepth ?? "deep",
  };
}

function getSessionDraft(session: FocusSession): SessionDraft {
  return {
    taskTitle: session.taskTitle,
    pillar: session.pillar,
    plannedMinutes: String(session.plannedMinutes),
    actualMinutes: String(session.actualMinutes),
    workDepth: session.workDepth,
    qualityRating: session.qualityRating,
    closureNotes: session.closureNotes,
  };
}

function formatCompactDate(planDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${planDate}T12:00:00`));
}

function getPhaseTitle(loop: ActiveFocusLoop) {
  if (loop.phase === "preload") {
    return "Preload once";
  }

  if (loop.phase === "activation") {
    return loop.blocksCompleted > 0 ? "Window warm" : "Lock in";
  }

  if (loop.phase === "focus") {
    return "In block";
  }

  return "Recovery";
}

function getPhaseLine(loop: ActiveFocusLoop) {
  if (loop.phase === "preload") {
    return "Silence first. Let boredom lower the noise floor before the first block.";
  }

  if (loop.phase === "activation") {
    return loop.blocksCompleted > 0
      ? "Preload is done. Pick the next block and stay off the phone between rounds."
      : "Use one cue, lock the environment, then start the first block.";
  }

  if (loop.phase === "focus") {
    return "Keep the world narrow until the block is cleanly closed.";
  }

  return "Break without dopamine, log what happened, then either end or go again.";
}

function getPhaseCountdown(loop: ActiveFocusLoop, now: number) {
  const elapsed = getElapsedSeconds(
    loop.phase === "focus" ? loop.focusStartedAt ?? loop.phaseStartedAt : loop.phaseStartedAt,
    now,
  );
  const target = getTimedPhaseTargetSeconds(loop);

  if (loop.phase === "focus" && loop.focusMode === "open-ended") {
    return {
      elapsed,
      remaining: 0,
      target: 0,
      label: "Elapsed",
      value: formatTimer(elapsed),
    };
  }

  const remaining = Math.max(0, target - elapsed);

  return {
    elapsed,
    remaining,
    target,
    label: "Remaining",
    value: formatTimer(remaining),
  };
}

function phaseLabel(phase: FocusLoopPhase) {
  if (phase === "preload") {
    return "Preload";
  }

  if (phase === "activation") {
    return "Ready";
  }

  if (phase === "focus") {
    return "Block";
  }

  return "Break";
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-stone-400">{detail}</p> : null}
    </div>
  );
}

export function FocusSessionWorkspace() {
  const { today } = useCurrentDate();
  const { onboarding } = useOnboardingProfile();
  const { dailyPlan, setDailyPlan } = useTodayPlan();
  const {
    sessions,
    activeLoop,
    setActiveLoop,
    clearActiveLoop,
    createSession,
    deleteSession,
    hasLoaded,
    syncMessage,
  } = useFocusSessions();
  const pillars = getPillars(onboarding.pillars);
  const [planDraft, setPlanDraft] = useState(() => getDefaultDraft(pillars));
  const [nextBlockDraft, setNextBlockDraft] = useState<BlockDraft>(() =>
    getNextBlockDraft(activeLoop),
  );
  const [selectedPresetId, setSelectedPresetId] = useState(
    focusLoopPresets[2]?.id ?? focusLoopPresets[0]?.id ?? "monk-90",
  );
  const [formError, setFormError] = useState("");
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const metrics = computeFocusSessionMetrics(sessions);
  const taskSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          [dailyPlan.oneThing, ...dailyPlan.topThree.map((item) => item.title)]
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).slice(0, 4),
    [dailyPlan.oneThing, dailyPlan.topThree],
  );

  useEffect(() => {
    if (activeLoop) {
      return;
    }

    const preset = focusLoopPresets.find((item) => item.id === selectedPresetId);
    const base = getDefaultDraft(pillars);

    setPlanDraft((current) => ({
      ...base,
      taskTitle: current.taskTitle,
      pillar: current.pillar || pillars[0] || "",
      plannedMinutes: String(preset?.plannedMinutes ?? Number(base.plannedMinutes)),
      preloadMinutes: String(preset?.preloadMinutes ?? Number(base.preloadMinutes)),
      recoveryMinutes: String(preset?.recoveryMinutes ?? Number(base.recoveryMinutes)),
      activationLabel: preset?.activationLabel ?? base.activationLabel,
      environmentLabel: preset?.environmentLabel ?? base.environmentLabel,
      recoveryLabel: preset?.recoveryLabel ?? base.recoveryLabel,
    }));
  }, [activeLoop, pillars, selectedPresetId, today]);

  useEffect(() => {
    setNextBlockDraft(getNextBlockDraft(activeLoop));
  }, [activeLoop?.id, activeLoop?.blocksCompleted, activeLoop?.pillar, activeLoop?.plannedMinutes, activeLoop?.workDepth]);

  useEffect(() => {
    if (!activeLoop) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeLoop]);

  function startWindow() {
    const error = validateFocusLoopPlanDraft(planDraft);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    setActiveLoop(createActiveFocusLoop(planDraft, today));
  }

  function updateChecklist(key: keyof ActivationChecklist) {
    setActiveLoop((current) =>
      current
        ? {
            ...current,
            activationChecklist: {
              ...current.activationChecklist,
              [key]: !current.activationChecklist[key],
            },
          }
        : null,
    );
  }

  function moveToActivation(skipPreload: boolean) {
    const nowIso = new Date().toISOString();

    setActiveLoop((current) =>
      current
        ? {
            ...current,
            phase: "activation",
            phaseStartedAt: nowIso,
            hasCompletedPreload: true,
            preloadMinutes: skipPreload ? 0 : current.preloadMinutes,
          }
        : null,
    );
  }

  function startFocusFromActivation() {
    if (!activeLoop) {
      return;
    }

    if (activeLoop.blocksCompleted === 0) {
      const checkedCount = Object.values(activeLoop.activationChecklist).filter(Boolean).length;

      if (checkedCount < 3) {
        setFormError("Lock in at least three checks before the first block.");
        return;
      }
    }

    setFormError("");
    const nowIso = new Date().toISOString();

    setActiveLoop((current) =>
      current
        ? {
            ...current,
            phase: "focus",
            phaseStartedAt: nowIso,
            focusStartedAt: nowIso,
            focusEndedAt: null,
            qualityRating: null,
            sessionStatus: null,
            closureNotes: "",
            distractionCount: 0,
          }
        : null,
    );
  }

  function endCurrentBlock(status: FocusSessionStatus) {
    const nowIso = new Date().toISOString();

    setActiveLoop((current) =>
      current
        ? {
            ...current,
            phase: "recovery",
            phaseStartedAt: nowIso,
            focusEndedAt: nowIso,
            sessionStatus: status,
            qualityRating: current.qualityRating ?? (status === "completed" ? 4 : 3),
          }
        : null,
    );
  }

  async function saveBlock(endWindow: boolean) {
    if (!activeLoop) {
      return;
    }

    if (!endWindow) {
      if (!nextBlockDraft.taskTitle.trim()) {
        setFormError("Name the next block before you continue the window.");
        return;
      }

      const plannedMinutes = Number(nextBlockDraft.plannedMinutes);

      if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
        setFormError("Set a real duration for the next block.");
        return;
      }
    }

    const session = buildFocusSessionFromLoop(activeLoop, {
      qualityRating: activeLoop.qualityRating ?? 4,
      closureNotes: activeLoop.closureNotes,
      sessionStatus: activeLoop.sessionStatus ?? "completed",
    });

    await createSession(session);
    setFormError("");

    if (endWindow) {
      clearActiveLoop();
      return;
    }

    const nextLoop = createActiveFocusLoop(
      {
        ...planDraft,
        taskTitle: nextBlockDraft.taskTitle,
        pillar: nextBlockDraft.pillar.trim() || activeLoop.pillar,
        plannedMinutes: nextBlockDraft.plannedMinutes,
        workDepth: nextBlockDraft.workDepth,
        preloadMinutes: "0",
        recoveryMinutes: String(activeLoop.recoveryMinutes),
        activationLabel: activeLoop.activationLabel,
        environmentLabel: activeLoop.environmentLabel,
        recoveryLabel: activeLoop.recoveryLabel,
        focusMode: activeLoop.focusMode,
      },
      today,
    );

    setActiveLoop({
      ...nextLoop,
      phase: "activation",
      phaseStartedAt: new Date().toISOString(),
      hasCompletedPreload: true,
      preloadMinutes: 0,
      blocksCompleted: activeLoop.blocksCompleted + 1,
      activationChecklist: { ...defaultActivationChecklist, phoneAway: true, triggerArmed: true, environmentReady: true, blockersOn: true },
    });
    setNextBlockDraft({
      ...nextBlockDraft,
      taskTitle: "",
    });
  }

  function adjustDistractions(delta: number) {
    setActiveLoop((current) =>
      current
        ? {
            ...current,
            distractionCount: Math.max(0, current.distractionCount + delta),
          }
        : null,
    );
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

  function setOneThing(value: string) {
    setDailyPlan((current) => ({
      ...current,
      oneThing: value,
      oneThingDone: value.trim() ? current.oneThingDone : false,
      status: current.oneThingDone && value.trim() ? current.status : "active",
    }));
  }

  function updateOutcome(id: string, value: string) {
    setDailyPlan((current) => ({
      ...current,
      topThree: current.topThree.map((item) =>
        item.id === id
          ? {
              ...item,
              title: value,
              done: value.trim() ? item.done : false,
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

  function loadTaskIntoWindow(taskTitle: string) {
    if (!taskTitle.trim()) {
      return;
    }

    if (activeLoop) {
      setNextBlockDraft((current) => ({
        ...current,
        taskTitle,
      }));
      return;
    }

    setPlanDraft((current) => ({
      ...current,
      taskTitle,
    }));
  }

  function startEditingSession(session: FocusSession) {
    setEditSessionId(session.id);
    setSessionDraft(getSessionDraft(session));
    setSessionError("");
  }

  async function saveSessionEdits(session: FocusSession) {
    if (!sessionDraft) {
      return;
    }

    if (!sessionDraft.taskTitle.trim()) {
      setSessionError("Give the block a task title.");
      return;
    }

    const plannedMinutes = Number(sessionDraft.plannedMinutes);
    const actualMinutes = Number(sessionDraft.actualMinutes);

    if (!Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
      setSessionError("Planned minutes must be greater than zero.");
      return;
    }

    if (!Number.isFinite(actualMinutes) || actualMinutes < 0) {
      setSessionError("Actual minutes must be zero or more.");
      return;
    }

    setSessionError("");
    await createSession({
      ...session,
      taskTitle: sessionDraft.taskTitle,
      pillar: sessionDraft.pillar.trim() || pillars[0] || session.pillar,
      plannedMinutes,
      actualMinutes,
      workDepth: sessionDraft.workDepth,
      qualityRating: sessionDraft.qualityRating,
      closureNotes: sessionDraft.closureNotes,
    });
    setEditSessionId(null);
    setSessionDraft(null);
  }

  const countdown = activeLoop ? getPhaseCountdown(activeLoop, now) : null;
  const activePhaseIndex = activeLoop ? phaseOrder.indexOf(activeLoop.phase) : -1;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <section className="space-y-6">
        <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="min-w-0">
              <p className="surface-kicker">Focus window</p>
              <h1 className="mt-5 text-4xl text-stone-50 sm:text-[3.2rem]">
                {activeLoop ? "Protect the window." : "Open one clean window."}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-400">
                {activeLoop
                  ? "Preload once. Then work, break, and work again without reopening the whole ritual."
                  : "One preload at the start, then repeated work and phone-free breaks until you end the window."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <CompactMetric
                label="Today"
                value={formatCompactDate(today)}
              />
              <CompactMetric
                label="Blocks"
                value={`${sessions.length}`}
                detail="Saved today"
              />
              <CompactMetric
                label="Deep"
                value={formatMinutes(metrics.deepMinutes)}
                detail={hasLoaded ? syncMessage : "Loading..."}
              />
            </div>
          </div>
        </div>

        {!activeLoop ? (
          <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {focusLoopPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    selectedPresetId === preset.id
                      ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                      : "border-white/10 bg-white/[0.03] text-stone-300 hover:bg-white/[0.05]",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
              <div className="space-y-5">
                {taskSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Pull from today
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {taskSuggestions.map((task) => (
                        <button
                          key={task}
                          type="button"
                          onClick={() =>
                            setPlanDraft((current) => ({
                              ...current,
                              taskTitle: task,
                            }))
                          }
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-stone-300 transition hover:bg-white/[0.05] hover:text-stone-100"
                        >
                          {task}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    First block
                  </label>
                  <textarea
                    className={textAreaClassName}
                    value={planDraft.taskTitle}
                    onChange={(event) =>
                      setPlanDraft((current) => ({
                        ...current,
                        taskTitle: event.target.value,
                      }))
                    }
                    placeholder="What block is this window protecting?"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Pillar
                    </label>
                    <select
                      className={inputClassName}
                      value={planDraft.pillar}
                      onChange={(event) =>
                        setPlanDraft((current) => ({
                          ...current,
                          pillar: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {pillars.map((pillar) => (
                        <option key={pillar} value={pillar}>
                          {pillar}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Focus
                    </label>
                    <input
                      className={inputClassName}
                      value={planDraft.plannedMinutes}
                      onChange={(event) =>
                        setPlanDraft((current) => ({
                          ...current,
                          plannedMinutes: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Preload
                    </label>
                    <input
                      className={inputClassName}
                      value={planDraft.preloadMinutes}
                      onChange={(event) =>
                        setPlanDraft((current) => ({
                          ...current,
                          preloadMinutes: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Break
                    </label>
                    <input
                      className={inputClassName}
                      value={planDraft.recoveryMinutes}
                      onChange={(event) =>
                        setPlanDraft((current) => ({
                          ...current,
                          recoveryMinutes: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  {(["deep", "shallow"] as const).map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() =>
                        setPlanDraft((current) => ({
                          ...current,
                          workDepth: depth,
                        }))
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition",
                        planDraft.workDepth === depth
                          ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                          : "border-white/10 bg-white/[0.03] text-stone-300",
                      )}
                    >
                      {depth === "deep" ? "Deep work" : "Shallow work"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Activation cue
                  </label>
                  <input
                    className={inputClassName}
                    value={planDraft.activationLabel}
                    onChange={(event) =>
                      setPlanDraft((current) => ({
                        ...current,
                        activationLabel: event.target.value,
                      }))
                    }
                    placeholder="Tea, gum, playlist, posture"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Environment
                  </label>
                  <input
                    className={inputClassName}
                    value={planDraft.environmentLabel}
                    onChange={(event) =>
                      setPlanDraft((current) => ({
                        ...current,
                        environmentLabel: event.target.value,
                      }))
                    }
                    placeholder="One tab, dark room, blockers on"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Break rule
                  </label>
                  <input
                    className={inputClassName}
                    value={planDraft.recoveryLabel}
                    onChange={(event) =>
                      setPlanDraft((current) => ({
                        ...current,
                        recoveryLabel: event.target.value,
                      }))
                    }
                    placeholder="Walk, breathe, stretch"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        1
                      </p>
                      <p className="mt-2 text-sm text-stone-100">Preload once</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">Silence first.</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        2
                      </p>
                      <p className="mt-2 text-sm text-stone-100">Block + break</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">One task at a time.</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        3
                      </p>
                      <p className="mt-2 text-sm text-stone-100">Repeat until end</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">No phone between rounds.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {formError ? (
              <div className="mt-5 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-stone-500">
                Start the window once, then stay off the phone until you end it.
              </p>
              <Button size="lg" onClick={startWindow}>
                Start window
              </Button>
            </div>
          </div>
        ) : (
          <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {phaseOrder.map((phase, index) => (
                <div
                  key={phase}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.22em]",
                    index < activePhaseIndex
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                      : index === activePhaseIndex
                        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-stone-500",
                  )}
                >
                  {phaseLabel(phase)}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        Active window
                      </p>
                      <h2 className="mt-3 text-3xl text-stone-50">
                        {activeLoop.taskTitle}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-stone-400">
                        {getPhaseLine(activeLoop)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          activeLoop.pillar,
                          activeLoop.workDepth === "deep" ? "Deep work" : "Shallow work",
                          activeLoop.focusMode === "timed"
                            ? `${activeLoop.plannedMinutes}m target`
                            : "Open-ended",
                          activeLoop.blocksCompleted > 0
                            ? `${activeLoop.blocksCompleted} block${activeLoop.blocksCompleted === 1 ? "" : "s"} done`
                            : "First block",
                        ].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                      <CompactMetric
                        label={countdown?.label ?? "Timer"}
                        value={countdown?.value ?? "--:--"}
                        detail={activeLoop.phase === "focus" ? "Current block" : getPhaseTitle(activeLoop)}
                      />
                      <CompactMetric
                        label="Drift"
                        value={`${activeLoop.distractionCount}`}
                        detail="Interruptions"
                      />
                      <CompactMetric
                        label="Break"
                        value={formatMinutes(activeLoop.recoveryMinutes)}
                        detail="Phone-free reset"
                      />
                    </div>
                  </div>
                </div>

                {activeLoop.phase === "preload" ? (
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <p className="text-sm leading-7 text-stone-300">
                      Sit in silence. No phone, no browsing, no reward spike.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button size="lg" onClick={() => moveToActivation(false)}>
                        Begin lock-in
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => moveToActivation(true)}
                      >
                        Skip preload
                      </Button>
                      <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                        End window
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeLoop.phase === "activation" ? (
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    {activeLoop.blocksCompleted === 0 ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {checklistItems.map((item) => {
                            const checked = activeLoop.activationChecklist[item.key];

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => updateChecklist(item.key)}
                                className={cn(
                                  "flex items-center justify-between rounded-[1.35rem] border px-4 py-4 text-left transition",
                                  checked
                                    ? "border-emerald-300/20 bg-emerald-300/10 text-stone-50"
                                    : "border-white/8 bg-white/[0.03] text-stone-300",
                                )}
                              >
                                <span className="text-sm font-medium">{item.label}</span>
                                {checked ? (
                                  <CircleCheckBig className="h-4 w-4 text-emerald-200" />
                                ) : (
                                  <CircleOff className="h-4 w-4 text-stone-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Button size="lg" onClick={startFocusFromActivation}>
                            Start first block
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            End window
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-[1fr_140px_140px]">
                          <input
                            className={inputClassName}
                            value={nextBlockDraft.taskTitle}
                            onChange={(event) =>
                              setNextBlockDraft((current) => ({
                                ...current,
                                taskTitle: event.target.value,
                              }))
                            }
                            placeholder="Next block target"
                          />
                          <input
                            className={inputClassName}
                            value={nextBlockDraft.plannedMinutes}
                            onChange={(event) =>
                              setNextBlockDraft((current) => ({
                                ...current,
                                plannedMinutes: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                            placeholder="Minutes"
                          />
                          <select
                            className={inputClassName}
                            value={nextBlockDraft.pillar}
                            onChange={(event) =>
                              setNextBlockDraft((current) => ({
                                ...current,
                                pillar: event.target.value,
                              }))
                            }
                          >
                            {pillars.map((pillar) => (
                              <option key={pillar} value={pillar}>
                                {pillar}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {(["deep", "shallow"] as const).map((depth) => (
                            <button
                              key={depth}
                              type="button"
                              onClick={() =>
                                setNextBlockDraft((current) => ({
                                  ...current,
                                  workDepth: depth,
                                }))
                              }
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm transition",
                                nextBlockDraft.workDepth === depth
                                  ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                  : "border-white/10 bg-white/[0.03] text-stone-300",
                              )}
                            >
                              {depth === "deep" ? "Deep" : "Shallow"}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setNextBlockDraft((current) => ({
                                ...current,
                                taskTitle: activeLoop.taskTitle,
                              }))
                            }
                            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-stone-300 transition hover:bg-white/[0.05]"
                          >
                            Reuse target
                          </button>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Button size="lg" onClick={startFocusFromActivation}>
                            Start next block
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            End window
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {activeLoop.phase === "focus" ? (
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => adjustDistractions(1)}
                        className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
                      >
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                          <Zap className="h-4 w-4 text-amber-200" />
                          Log distraction
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-400">
                          Count the interruption instead of hiding it.
                        </p>
                      </button>
                      <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                          <Shield className="h-4 w-4 text-amber-200" />
                          Protocol
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-400">
                          {activeLoop.environmentLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button size="lg" onClick={() => endCurrentBlock("completed")}>
                        End block
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => endCurrentBlock("ended-early")}
                      >
                        End early
                      </Button>
                      <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                        End window
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeLoop.phase === "recovery" ? (
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                          Quality
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() =>
                                setActiveLoop((current) =>
                                  current ? { ...current, qualityRating: rating } : null,
                                )
                              }
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm transition",
                                (activeLoop.qualityRating ?? 4) === rating
                                  ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                  : "border-white/10 bg-white/[0.03] text-stone-300",
                              )}
                            >
                              {rating}/5
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                          Next block
                        </p>
                        <input
                          className={inputClassName}
                          value={nextBlockDraft.taskTitle}
                          onChange={(event) =>
                            setNextBlockDraft((current) => ({
                              ...current,
                              taskTitle: event.target.value,
                            }))
                          }
                          placeholder="Optional next block target"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px_120px]">
                      <textarea
                        className={textAreaClassName}
                        value={activeLoop.closureNotes}
                        onChange={(event) =>
                          setActiveLoop((current) =>
                            current
                              ? { ...current, closureNotes: event.target.value }
                              : null,
                          )
                        }
                        placeholder="One honest line."
                      />
                      <input
                        className={inputClassName}
                        value={nextBlockDraft.plannedMinutes}
                        onChange={(event) =>
                          setNextBlockDraft((current) => ({
                            ...current,
                            plannedMinutes: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                        placeholder="Min"
                      />
                      <select
                        className={inputClassName}
                        value={nextBlockDraft.pillar}
                        onChange={(event) =>
                          setNextBlockDraft((current) => ({
                            ...current,
                            pillar: event.target.value,
                          }))
                        }
                      >
                        {pillars.map((pillar) => (
                          <option key={pillar} value={pillar}>
                            {pillar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button size="lg" onClick={() => void saveBlock(false)}>
                        Save + next block
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => void saveBlock(true)}
                      >
                        Save + end window
                      </Button>
                      <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                        Discard
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Window state
                  </p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                        <MoonStar className="h-4 w-4 text-amber-200" />
                        Preload
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-400">
                        {activeLoop.hasCompletedPreload
                          ? "Done for this window"
                          : `${activeLoop.preloadMinutes}m before the first block`}
                      </p>
                    </div>
                    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                        <Headphones className="h-4 w-4 text-amber-200" />
                        Cue + environment
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-400">
                        {activeLoop.activationLabel}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-stone-500">
                        {activeLoop.environmentLabel}
                      </p>
                    </div>
                    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                        <Footprints className="h-4 w-4 text-amber-200" />
                        Break rule
                      </p>
                      <p className="mt-2 text-sm leading-6 text-stone-400">
                        {activeLoop.recoveryLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Today
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                Your window should pull from today&apos;s real priorities, not a separate plan.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Sync
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {hasLoaded ? syncMessage : "Loading focus window..."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CompactMetric
              label="Completed"
              value={`${metrics.completedLoops}`}
              detail="Blocks closed cleanly"
            />
            <CompactMetric
              label="Quality"
              value={`${metrics.averageQuality}/5`}
              detail="Average"
            />
          </div>
        </div>

        <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Saved blocks
              </p>
              <h3 className="mt-2 text-3xl text-stone-50">History you can actually edit.</h3>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Today
              </p>
              <p className="mt-2 text-xl font-semibold text-stone-50">{sessions.length}</p>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-stone-400">
              Finish one block and it will show up here with edit, reuse, and delete controls.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-stone-100">
                        {session.taskTitle}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-stone-400">
                        {session.pillar} • {session.workDepth === "deep" ? "Deep" : "Shallow"} • {formatMinutes(session.actualMinutes)} • Q {session.qualityRating}/5
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => loadTaskIntoWindow(session.taskTitle)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                      >
                        <CopyPlus className="h-4 w-4" />
                        Reuse
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editSessionId === session.id
                            ? (setEditSessionId(null), setSessionDraft(null), setSessionError(""))
                            : startEditingSession(session)
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                      >
                        <PencilLine className="h-4 w-4" />
                        {editSessionId === session.id ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSession(session.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {editSessionId === session.id && sessionDraft ? (
                    <div className="mt-4 space-y-4 rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Task
                          </label>
                          <input
                            className={inputClassName}
                            value={sessionDraft.taskTitle}
                            onChange={(event) =>
                              setSessionDraft((current) =>
                                current
                                  ? { ...current, taskTitle: event.target.value }
                                  : current,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Pillar
                          </label>
                          <select
                            className={inputClassName}
                            value={sessionDraft.pillar}
                            onChange={(event) =>
                              setSessionDraft((current) =>
                                current ? { ...current, pillar: event.target.value } : current,
                              )
                            }
                          >
                            {pillars.map((pillar) => (
                              <option key={pillar} value={pillar}>
                                {pillar}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Depth
                          </label>
                          <div className="flex gap-2">
                            {(["deep", "shallow"] as const).map((depth) => (
                              <button
                                key={depth}
                                type="button"
                                onClick={() =>
                                  setSessionDraft((current) =>
                                    current ? { ...current, workDepth: depth } : current,
                                  )
                                }
                                className={cn(
                                  "rounded-full border px-4 py-2 text-sm transition",
                                  sessionDraft.workDepth === depth
                                    ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                    : "border-white/10 bg-white/[0.03] text-stone-300",
                                )}
                              >
                                {depth === "deep" ? "Deep" : "Shallow"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Planned
                          </label>
                          <input
                            className={inputClassName}
                            value={sessionDraft.plannedMinutes}
                            onChange={(event) =>
                              setSessionDraft((current) =>
                                current
                                  ? { ...current, plannedMinutes: event.target.value }
                                  : current,
                              )
                            }
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Actual
                          </label>
                          <input
                            className={inputClassName}
                            value={sessionDraft.actualMinutes}
                            onChange={(event) =>
                              setSessionDraft((current) =>
                                current
                                  ? { ...current, actualMinutes: event.target.value }
                                  : current,
                              )
                            }
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Notes
                          </label>
                          <textarea
                            className={textAreaClassName}
                            value={sessionDraft.closureNotes}
                            onChange={(event) =>
                              setSessionDraft((current) =>
                                current
                                  ? { ...current, closureNotes: event.target.value }
                                  : current,
                              )
                            }
                            placeholder="What actually happened?"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Quality
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() =>
                                  setSessionDraft((current) =>
                                    current ? { ...current, qualityRating: rating } : current,
                                  )
                                }
                                className={cn(
                                  "rounded-full border px-3 py-2 text-sm transition",
                                  sessionDraft.qualityRating === rating
                                    ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                    : "border-white/10 bg-white/[0.03] text-stone-300",
                                )}
                              >
                                {rating}/5
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {sessionError ? (
                        <div className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
                          {sessionError}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <Button size="lg" onClick={() => void saveSessionEdits(session)}>
                          Save changes
                        </Button>
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={() => {
                            setEditSessionId(null);
                            setSessionDraft(null);
                            setSessionError("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Today&apos;s tasks
              </p>
              <h3 className="mt-2 text-3xl text-stone-50">Edit the source, not a copy.</h3>
            </div>
            <p className="text-sm leading-6 text-stone-400">These feed the focus window.</p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={toggleOneThing}
                  className={cn(
                    "mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border transition",
                    dailyPlan.oneThingDone
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                      : "border-white/10 bg-black/20 text-transparent",
                  )}
                >
                  •
                </button>
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    One thing
                  </p>
                  <input
                    className={inputClassName}
                    value={dailyPlan.oneThing}
                    onChange={(event) => setOneThing(event.target.value)}
                    placeholder="The task that makes the day count."
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadTaskIntoWindow(dailyPlan.oneThing)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                >
                  <CopyPlus className="h-4 w-4" />
                  Use in window
                </button>
                <button
                  type="button"
                  onClick={() => setOneThing("")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            {dailyPlan.topThree.map((item, index) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleOutcome(item.id)}
                    className={cn(
                      "mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border transition",
                      item.done
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 bg-black/20 text-transparent",
                    )}
                  >
                    •
                  </button>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Outcome {index + 1}
                    </p>
                    <input
                      className={inputClassName}
                      value={item.title}
                      onChange={(event) => updateOutcome(item.id, event.target.value)}
                      placeholder="Define a concrete outcome."
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadTaskIntoWindow(item.title)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                  >
                    <CopyPlus className="h-4 w-4" />
                    Use in window
                  </button>
                  <button
                    type="button"
                    onClick={() => clearOutcome(item.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
