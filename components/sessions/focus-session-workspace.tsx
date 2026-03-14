"use client";

import {
  Ban,
  CircleCheckBig,
  CircleOff,
  Coffee,
  Footprints,
  Headphones,
  Hourglass,
  MoonStar,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { Button } from "@/components/ui/button";
import { InfoCallout } from "@/components/ui/info-callout";
import { formatPlanDate } from "@/lib/daily-plan";
import {
  applyFocusLoopPreset,
  buildFocusSessionFromLoop,
  computeFocusSessionMetrics,
  createActiveFocusLoop,
  defaultFocusLoopPlanDraft,
  focusActivationSuggestions,
  focusEnvironmentSuggestions,
  focusLoopPresets,
  focusRecoverySuggestions,
  formatMinutes,
  formatTimer,
  getElapsedMinutes,
  getElapsedSeconds,
  getTimedPhaseTargetSeconds,
  validateFocusLoopPlanDraft,
  type ActiveFocusLoop,
  type ActivationChecklist,
  type FocusLoopPlanDraft,
  type FocusLoopPhase,
  type FocusLoopPreset,
  type FocusSessionStatus,
} from "@/lib/focus-session";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40";

const textareaClassName =
  "min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

const phaseConfig: Array<{
  id: FocusLoopPhase;
  label: string;
  shortLabel: string;
  title: string;
  body: string;
}> = [
  {
    id: "preload",
    label: "Preload",
    shortLabel: "Silence",
    title: "Lower stimulation first.",
    body: "Sit in boredom long enough that the work starts feeling easier than drift.",
  },
  {
    id: "activation",
    label: "Activation",
    shortLabel: "Lock-in",
    title: "Signal the brain that it is time.",
    body: "Arm one sensory cue and cut the surrounding noise until the task is all that remains.",
  },
  {
    id: "focus",
    label: "Deep work",
    shortLabel: "Block",
    title: "Make distraction impossible.",
    body: "Run the block with one target, one environment, and no negotiation with easier work.",
  },
  {
    id: "recovery",
    label: "Recovery",
    shortLabel: "Exit",
    title: "Protect tomorrow before it starts.",
    body: "Exit cleanly with a low-dopamine reset so the next loop is available again.",
  },
];

const checklistLabels: Array<{
  key: keyof ActivationChecklist;
  label: string;
  detail: string;
}> = [
  {
    key: "phoneAway",
    label: "Phone away",
    detail: "No reach, no glance, no safety blanket.",
  },
  {
    key: "blockersOn",
    label: "Blockers on",
    detail: "Make addictive apps impossible, not merely discouraged.",
  },
  {
    key: "environmentReady",
    label: "Environment locked",
    detail: "One tab, one task, no extra visual noise.",
  },
  {
    key: "triggerArmed",
    label: "Cue used",
    detail: "Tea, music, gum, posture, or another repeatable switch.",
  },
];

function getPhaseIndex(phase: FocusLoopPhase) {
  return phaseConfig.findIndex((item) => item.id === phase);
}

function getUniqueSuggestions(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getPhaseProgress(loop: ActiveFocusLoop | null, now: number) {
  if (!loop) {
    return {
      elapsedSeconds: 0,
      targetSeconds: 0,
      remainingSeconds: 0,
      progressPercent: 0,
    };
  }

  const elapsedSeconds = getElapsedSeconds(loop.phaseStartedAt, now);
  const targetSeconds = getTimedPhaseTargetSeconds(loop);
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progressPercent =
    targetSeconds > 0 ? Math.min(100, (elapsedSeconds / targetSeconds) * 100) : 0;

  return {
    elapsedSeconds,
    targetSeconds,
    remainingSeconds,
    progressPercent,
  };
}

function getFocusStatusLine(loop: ActiveFocusLoop, now: number) {
  if (loop.phase === "preload") {
    const progress = getPhaseProgress(loop, now);

    if (progress.remainingSeconds === 0) {
      return "The preload window is complete. Move into activation before drift finds a crack.";
    }

    return "Do nothing impressive here. Sit in silence long enough that the task starts looking attractive.";
  }

  if (loop.phase === "activation") {
    return "Use one cue, lock the room down, and only then start the block.";
  }

  if (loop.phase === "focus") {
    if (loop.focusMode === "open-ended") {
      return "Stay in the block until the work says stop, not until boredom says escape.";
    }

    const focusElapsed = getElapsedSeconds(loop.focusStartedAt, now);
    const focusTarget = loop.plannedMinutes * 60;

    if (focusElapsed >= focusTarget) {
      return "The target is met. Close the block cleanly or continue with a deliberate decision.";
    }

    return "Do not negotiate mid-block. Reduce the world to the one task on screen.";
  }

  return "Finish the reset and save what actually happened so the next loop can start cleanly.";
}

function getLoopPillars(onboardingPillars: string[]) {
  return onboardingPillars.length > 0
    ? onboardingPillars
    : ["Work", "Study", "Health", "Personal"];
}

function PhaseCard({
  item,
  state,
}: {
  item: (typeof phaseConfig)[number];
  state: "complete" | "active" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-4 transition",
        state === "active"
          ? "border-amber-300/25 bg-amber-300/10"
          : state === "complete"
            ? "border-emerald-300/25 bg-emerald-300/10"
            : "border-white/8 bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.25em]",
            state === "active"
              ? "text-amber-100/85"
              : state === "complete"
                ? "text-emerald-100/85"
                : "text-stone-500",
          )}
        >
          {item.label}
        </p>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
            state === "active"
              ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
              : state === "complete"
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                : "border-white/10 bg-black/20 text-stone-500",
          )}
        >
          {item.shortLabel}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold text-stone-100">{item.title}</p>
      <p className="mt-3 text-sm leading-6 text-stone-400">{item.body}</p>
    </div>
  );
}

export function FocusSessionWorkspace() {
  const { today } = useCurrentDate();
  const { onboarding } = useOnboardingProfile();
  const { dailyPlan } = useTodayPlan();
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
  const pillars = getLoopPillars(onboarding.pillars);
  const pillarSignature = pillars.join("|");
  const metrics = computeFocusSessionMetrics(sessions);
  const [planDraft, setPlanDraft] = useState<FocusLoopPlanDraft>({
    ...applyFocusLoopPreset(
      focusLoopPresets[1] ?? focusLoopPresets[0],
      {
        ...defaultFocusLoopPlanDraft,
        pillar: pillars[0] ?? "",
      },
      pillars[0],
    ),
    taskTitle: "",
  });
  const [selectedPresetId, setSelectedPresetId] = useState(
    focusLoopPresets[1]?.id ?? focusLoopPresets[0]?.id ?? "deep-75",
  );
  const [formError, setFormError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const taskSuggestions = useMemo(
    () =>
      getUniqueSuggestions([
        dailyPlan.oneThing,
        ...dailyPlan.topThree.map((item) => item.title),
      ]).slice(0, 4),
    [dailyPlan.oneThing, dailyPlan.topThree],
  );

  useEffect(() => {
    const nextPreset = focusLoopPresets.find((preset) => preset.id === selectedPresetId);

    if (activeLoop) {
      setFormError("");
      return;
    }

    setPlanDraft((current) => ({
      ...(nextPreset
        ? applyFocusLoopPreset(nextPreset, current, pillars[0])
        : {
            ...current,
            pillar: current.pillar || pillars[0] || "",
          }),
      taskTitle: current.taskTitle,
    }));
    setFormError("");
  }, [activeLoop, pillarSignature, selectedPresetId, today]);

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

  const activePhaseIndex = activeLoop ? getPhaseIndex(activeLoop.phase) : -1;
  const phaseProgress = getPhaseProgress(activeLoop, now);
  const focusElapsedSeconds = activeLoop
    ? getElapsedSeconds(activeLoop.focusStartedAt, now)
    : 0;
  const activationCompleteCount = activeLoop
    ? Object.values(activeLoop.activationChecklist).filter(Boolean).length
    : 0;

  function setDraftField<K extends keyof FocusLoopPlanDraft>(
    key: K,
    value: FocusLoopPlanDraft[K],
  ) {
    setPlanDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function choosePreset(preset: FocusLoopPreset) {
    setSelectedPresetId(preset.id);
    setPlanDraft((current) => ({
      ...applyFocusLoopPreset(preset, current, pillars[0]),
      taskTitle: current.taskTitle,
      pillar: current.pillar || pillars[0] || "",
    }));
  }

  function handleTaskSuggestion(task: string) {
    setPlanDraft((current) => ({
      ...current,
      taskTitle: task,
    }));
  }

  function beginLoop() {
    const error = validateFocusLoopPlanDraft(planDraft);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    setActiveLoop(createActiveFocusLoop(planDraft, today));
  }

  function advancePhase(
    nextPhase: FocusLoopPhase,
    mutator?: (current: ActiveFocusLoop) => ActiveFocusLoop,
  ) {
    const nowIso = new Date().toISOString();

    setActiveLoop((current) => {
      if (!current) {
        return null;
      }

      const baseLoop = {
        ...current,
        phase: nextPhase,
        phaseStartedAt: nowIso,
      } satisfies ActiveFocusLoop;

      return mutator ? mutator(baseLoop) : baseLoop;
    });
  }

  function updateActivationChecklist(key: keyof ActivationChecklist) {
    setActiveLoop((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        activationChecklist: {
          ...current.activationChecklist,
          [key]: !current.activationChecklist[key],
        },
      };
    });
  }

  function startFocusPhase() {
    if (!activeLoop || activationCompleteCount < 3) {
      setFormError("Lock in at least three activation checks before starting the block.");
      return;
    }

    setFormError("");
    const nowIso = new Date().toISOString();
    advancePhase("focus", (loop) => ({
      ...loop,
      focusStartedAt: loop.focusStartedAt ?? nowIso,
    }));
  }

  function endFocusPhase(status: FocusSessionStatus) {
    const nowIso = new Date().toISOString();
    advancePhase("recovery", (loop) => ({
      ...loop,
      focusEndedAt: nowIso,
      sessionStatus: status,
      qualityRating: loop.qualityRating ?? 4,
    }));
  }

  function adjustDistractions(delta: number) {
    setActiveLoop((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        distractionCount: Math.max(0, current.distractionCount + delta),
      };
    });
  }

  function updateLoopField<K extends "activationLabel" | "environmentLabel" | "recoveryLabel" | "closureNotes">(
    key: K,
    value: ActiveFocusLoop[K],
  ) {
    setActiveLoop((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function setLoopQuality(qualityRating: number) {
    setActiveLoop((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        qualityRating,
      };
    });
  }

  async function saveLoop() {
    if (!activeLoop) {
      return;
    }

    const qualityRating = activeLoop.qualityRating ?? 4;
    const session = buildFocusSessionFromLoop(activeLoop, {
      qualityRating,
      closureNotes: activeLoop.closureNotes,
      recoveryLabel: activeLoop.recoveryLabel,
      sessionStatus: activeLoop.sessionStatus ?? "completed",
    });

    await createSession(session);
    clearActiveLoop();
    setPlanDraft((current) => ({
      ...current,
      taskTitle: "",
    }));
  }

  const activeSessionMinutes = activeLoop
    ? getElapsedMinutes(activeLoop.focusStartedAt, activeLoop.focusEndedAt)
    : 0;

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="surface-kicker">Focus loop</p>
            <h1 className="mt-5 text-4xl text-stone-50 sm:text-5xl">
              Build focus before the block starts demanding it.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-stone-300">
              The loop is deliberate: preload into boredom, activate the environment,
              protect a real block of work, then exit without blowing your dopamine
              baseline apart.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-panel-soft rounded-[1.5rem] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Active day
              </p>
              <p className="mt-3 text-xl font-semibold text-stone-50">
                {formatPlanDate(today)}
              </p>
            </div>
            <div className="surface-panel-soft rounded-[1.5rem] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Loops today
              </p>
              <p className="mt-3 text-xl font-semibold text-stone-50">
                {metrics.totalSessions}
              </p>
            </div>
            <div className="surface-panel-soft rounded-[1.5rem] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Deep minutes
              </p>
              <p className="mt-3 text-xl font-semibold text-stone-50">
                {formatMinutes(metrics.deepMinutes)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {phaseConfig.map((item, index) => {
              const state =
                activePhaseIndex === -1
                  ? index === 0
                    ? "active"
                    : "upcoming"
                  : index < activePhaseIndex
                    ? "complete"
                    : index === activePhaseIndex
                      ? "active"
                      : "upcoming";

              return <PhaseCard key={item.id} item={item} state={state} />;
            })}
          </div>

          {!activeLoop ? (
            <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <div className="flex flex-col gap-5 border-b border-white/8 pb-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      Build the loop
                    </p>
                    <h2 className="mt-3 text-3xl text-stone-50">
                      Decide the block before the block decides you.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                      Choose the work, preload window, activation cue, and recovery plan
                      before you touch the task. The fewer decisions left for mid-block,
                      the better the odds of staying in it.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Save status
                    </p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-stone-300">
                      {hasLoaded ? syncMessage : "Loading focus history..."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {focusLoopPresets.map((preset) => {
                    const active = selectedPresetId === preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => choosePreset(preset)}
                        className={cn(
                          "rounded-[1.5rem] border p-5 text-left transition",
                          active
                            ? "border-amber-300/25 bg-amber-300/10"
                            : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-lg font-semibold text-stone-100">{preset.label}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
                              active
                                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                                : "border-white/10 bg-black/20 text-stone-500",
                            )}
                          >
                            {preset.detail}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-stone-400">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <div className="space-y-5">
                  {taskSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Pull from today
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {taskSuggestions.map((task) => (
                          <button
                            key={task}
                            type="button"
                            onClick={() => handleTaskSuggestion(task)}
                            className="rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-sm text-stone-300 transition hover:border-white/16 hover:bg-white/[0.05] hover:text-stone-100"
                          >
                            {task}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      Block target
                    </label>
                    <textarea
                      className={textareaClassName}
                      value={planDraft.taskTitle}
                      onChange={(event) => setDraftField("taskTitle", event.target.value)}
                      placeholder="The exact block this loop should protect."
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Pillar
                      </label>
                      <select
                        className={inputClassName}
                        value={planDraft.pillar}
                        onChange={(event) => setDraftField("pillar", event.target.value)}
                      >
                        <option value="">Select pillar</option>
                        {pillars.map((pillar) => (
                          <option key={pillar} value={pillar}>
                            {pillar}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Work depth
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { label: "Deep work", value: "deep" as const },
                          { label: "Shallow work", value: "shallow" as const },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDraftField("workDepth", option.value)}
                            className={cn(
                              "rounded-2xl border px-4 py-4 text-left text-sm transition",
                              planDraft.workDepth === option.value
                                ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                : "border-white/10 bg-white/[0.03] text-stone-300 hover:bg-white/[0.05]",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Focus mode
                      </label>
                      <select
                        className={inputClassName}
                        value={planDraft.focusMode}
                        onChange={(event) =>
                          setDraftField(
                            "focusMode",
                            event.target.value === "open-ended" ? "open-ended" : "timed",
                          )
                        }
                      >
                        <option value="timed">Timed block</option>
                        <option value="open-ended">Open-ended</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Focus minutes
                      </label>
                      <input
                        className={inputClassName}
                        value={planDraft.plannedMinutes}
                        onChange={(event) => setDraftField("plannedMinutes", event.target.value)}
                        inputMode="numeric"
                        disabled={planDraft.focusMode === "open-ended"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Preload minutes
                      </label>
                      <input
                        className={inputClassName}
                        value={planDraft.preloadMinutes}
                        onChange={(event) => setDraftField("preloadMinutes", event.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      Activation cue
                    </label>
                    <input
                      className={inputClassName}
                      value={planDraft.activationLabel}
                      onChange={(event) => setDraftField("activationLabel", event.target.value)}
                      placeholder="Tea, mint gum, one soundtrack, posture cue..."
                    />
                    <div className="flex flex-wrap gap-2">
                      {focusActivationSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDraftField("activationLabel", item)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-white/[0.05]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      Environment lock
                    </label>
                    <textarea
                      className="min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40"
                      value={planDraft.environmentLabel}
                      onChange={(event) => setDraftField("environmentLabel", event.target.value)}
                      placeholder="One tab, low light, blockers on, no second screen..."
                    />
                    <div className="flex flex-wrap gap-2">
                      {focusEnvironmentSuggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDraftField("environmentLabel", item)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-white/[0.05]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[0.48fr_0.52fr]">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Recovery minutes
                      </label>
                      <input
                        className={inputClassName}
                        value={planDraft.recoveryMinutes}
                        onChange={(event) => setDraftField("recoveryMinutes", event.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                        Recovery protocol
                      </label>
                      <input
                        className={inputClassName}
                        value={planDraft.recoveryLabel}
                        onChange={(event) => setDraftField("recoveryLabel", event.target.value)}
                        placeholder="Walk, breathe, stretch..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {focusRecoverySuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDraftField("recoveryLabel", item)}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-white/[0.05]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Loop design
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-stone-100">Preload debt</p>
                        <p className="mt-2 text-sm leading-6 text-stone-400">
                          Sit in low stimulation first so the work becomes more
                          attractive than wandering.
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-stone-100">
                          Recovery protects the next block
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-400">
                          Your break matters almost as much as the block. Keep it low
                          dopamine so you can do this again.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formError ? (
                <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
                  {formError}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-stone-500">
                  The loop should feel strict, not complicated. Decide now so the block
                  itself can be simple.
                </p>
                <Button size="lg" onClick={beginLoop}>
                  Start preload
                </Button>
              </div>
            </section>
          ) : (
            <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <div className="flex flex-col gap-6 border-b border-white/8 pb-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    Active focus loop
                  </p>
                  <h2 className="mt-3 text-3xl text-stone-50">{activeLoop.taskTitle}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                    {getFocusStatusLine(activeLoop, now)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-300">
                      {activeLoop.pillar}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-300">
                      {activeLoop.workDepth === "deep" ? "Deep work" : "Shallow work"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-stone-300">
                      {activeLoop.focusMode === "timed"
                        ? `${activeLoop.plannedMinutes}m target`
                        : "Open-ended"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="surface-panel-soft rounded-[1.5rem] p-4 text-right xl:text-left">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Phase timer
                    </p>
                    <p className="mt-3 font-display text-4xl text-stone-50">
                      {activeLoop.phase === "focus" && activeLoop.focusMode === "open-ended"
                        ? formatTimer(focusElapsedSeconds)
                        : phaseProgress.targetSeconds > 0 &&
                            activeLoop.phase !== "focus"
                          ? formatTimer(phaseProgress.remainingSeconds)
                          : activeLoop.phase === "focus"
                            ? formatTimer(
                                Math.max(
                                  0,
                                  activeLoop.plannedMinutes * 60 - focusElapsedSeconds,
                                ),
                              )
                            : formatTimer(phaseProgress.elapsedSeconds)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      {activeLoop.phase === "focus" && activeLoop.focusMode === "open-ended"
                        ? "Elapsed inside the block"
                        : activeLoop.phase === "focus"
                          ? `${formatTimer(focusElapsedSeconds)} elapsed`
                          : "Current phase countdown"}
                    </p>
                  </div>
                  <div className="surface-panel-soft rounded-[1.5rem] p-4 text-right xl:text-left">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Distractions
                    </p>
                    <p className="mt-3 text-4xl font-semibold text-stone-50">
                      {activeLoop.distractionCount}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      Interruptions logged so far
                    </p>
                  </div>
                  <div className="surface-panel-soft rounded-[1.5rem] p-4 text-right xl:text-left">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Recovery
                    </p>
                    <p className="mt-3 text-xl font-semibold text-stone-50">
                      {formatMinutes(activeLoop.recoveryMinutes)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      Planned low-dopamine reset
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                          Current phase
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-stone-100">
                          {
                            phaseConfig.find((item) => item.id === activeLoop.phase)?.title
                          }
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                        {phaseConfig.find((item) => item.id === activeLoop.phase)?.label}
                      </span>
                    </div>

                    {(activeLoop.phase === "preload" ||
                      (activeLoop.phase === "focus" &&
                        activeLoop.focusMode === "timed") ||
                      activeLoop.phase === "recovery") &&
                    phaseProgress.targetSeconds > 0 ? (
                      <div className="mt-6">
                        <div className="h-2 rounded-full bg-white/8">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,#d7a85b,#82b4ac)] transition-all"
                            style={{ width: `${phaseProgress.progressPercent}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-stone-400">
                          <span>{formatTimer(phaseProgress.elapsedSeconds)} elapsed</span>
                          <span>
                            {activeLoop.phase === "focus"
                              ? `${formatTimer(
                                  Math.max(
                                    0,
                                    activeLoop.plannedMinutes * 60 - focusElapsedSeconds,
                                  ),
                                )} remaining`
                              : `${formatTimer(phaseProgress.remainingSeconds)} remaining`}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {activeLoop.phase === "preload" ? (
                      <div className="mt-6 space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <MoonStar className="h-4 w-4 text-amber-200" />
                              Preload rule
                            </p>
                            <p className="mt-3 text-sm leading-6 text-stone-400">
                              No phone, no browsing, no reward stimulus. Sit there until
                              the block starts feeling like relief.
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Coffee className="h-4 w-4 text-amber-200" />
                              Activation queued
                            </p>
                            <p className="mt-3 text-sm leading-6 text-stone-400">
                              {activeLoop.activationLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            size="lg"
                            onClick={() => advancePhase("activation")}
                          >
                            Begin activation
                          </Button>
                          <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => advancePhase("activation")}
                          >
                            Skip preload
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            Cancel loop
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {activeLoop.phase === "activation" ? (
                      <div className="mt-6 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          {checklistLabels.map((item) => {
                            const checked = activeLoop.activationChecklist[item.key];

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => updateActivationChecklist(item.key)}
                                className={cn(
                                  "rounded-[1.5rem] border p-5 text-left transition",
                                  checked
                                    ? "border-emerald-300/25 bg-emerald-300/10"
                                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]",
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-base font-semibold text-stone-100">
                                    {item.label}
                                  </p>
                                  {checked ? (
                                    <CircleCheckBig className="h-5 w-5 text-emerald-200" />
                                  ) : (
                                    <CircleOff className="h-5 w-5 text-stone-500" />
                                  )}
                                </div>
                                <p className="mt-3 text-sm leading-6 text-stone-400">
                                  {item.detail}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                              Activation cue
                            </label>
                            <input
                              className={inputClassName}
                              value={activeLoop.activationLabel}
                              onChange={(event) =>
                                updateLoopField("activationLabel", event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                              Environment lock
                            </label>
                            <input
                              className={inputClassName}
                              value={activeLoop.environmentLabel}
                              onChange={(event) =>
                                updateLoopField("environmentLabel", event.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button size="lg" onClick={startFocusPhase}>
                            Start deep work
                          </Button>
                          <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => advancePhase("preload")}
                          >
                            Back to preload
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            Cancel loop
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {activeLoop.phase === "focus" ? (
                      <div className="mt-6 space-y-5">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Zap className="h-4 w-4 text-amber-200" />
                              Focus elapsed
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-stone-50">
                              {formatTimer(focusElapsedSeconds)}
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Headphones className="h-4 w-4 text-amber-200" />
                              Environment
                            </p>
                            <p className="mt-3 text-sm leading-6 text-stone-400">
                              {activeLoop.environmentLabel}
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Ban className="h-4 w-4 text-amber-200" />
                              Interruption count
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => adjustDistractions(-1)}
                              >
                                -
                              </Button>
                              <span className="text-2xl font-semibold text-stone-50">
                                {activeLoop.distractionCount}
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => adjustDistractions(1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            Hard rule
                          </p>
                          <p className="mt-3 text-base leading-7 text-stone-200">
                            Do not open anything that was not part of the plan. If the
                            urge spikes, log the interruption and stay with the block.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button size="lg" onClick={() => endFocusPhase("completed")}>
                            End block cleanly
                          </Button>
                          <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => endFocusPhase("ended-early")}
                          >
                            End early
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            Abandon loop
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {activeLoop.phase === "recovery" ? (
                      <div className="mt-6 space-y-5">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Hourglass className="h-4 w-4 text-amber-200" />
                              Focus result
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-stone-50">
                              {formatMinutes(activeSessionMinutes)}
                            </p>
                            <p className="mt-2 text-sm text-stone-400">
                              {activeLoop.sessionStatus === "ended-early"
                                ? "Ended early"
                                : "Completed cleanly"}
                            </p>
                          </div>
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Footprints className="h-4 w-4 text-amber-200" />
                              Recovery protocol
                            </p>
                            <input
                              className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40"
                              value={activeLoop.recoveryLabel}
                              onChange={(event) =>
                                updateLoopField("recoveryLabel", event.target.value)
                              }
                            />
                          </div>
                          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                            <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                              <Sparkles className="h-4 w-4 text-amber-200" />
                              Quality
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  onClick={() => setLoopQuality(rating)}
                                  className={cn(
                                    "rounded-full border px-3 py-2 text-sm transition",
                                    (activeLoop.qualityRating ?? 4) === rating
                                      ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                                      : "border-white/10 bg-black/20 text-stone-300 hover:bg-white/[0.05]",
                                  )}
                                >
                                  {rating}/5
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                            What happened in the block?
                          </label>
                          <textarea
                            className={textareaClassName}
                            value={activeLoop.closureNotes}
                            onChange={(event) =>
                              updateLoopField("closureNotes", event.target.value)
                            }
                            placeholder="One honest line: what moved, what drifted, and what the next block should protect."
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {focusRecoverySuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => updateLoopField("recoveryLabel", item)}
                              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-white/[0.05]"
                            >
                              {item}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button size="lg" onClick={() => void saveLoop()}>
                            Save completed loop
                          </Button>
                          <Button
                            variant="secondary"
                            size="lg"
                            onClick={() =>
                              setActiveLoop((current) =>
                                current
                                  ? {
                                      ...current,
                                      phase: "focus",
                                      phaseStartedAt: current.focusStartedAt ?? current.phaseStartedAt,
                                      focusEndedAt: null,
                                      sessionStatus: null,
                                    }
                                  : null,
                              )
                            }
                          >
                            Return to focus
                          </Button>
                          <Button variant="ghost" size="lg" onClick={clearActiveLoop}>
                            Discard loop
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Live protocol
                    </p>
                    <div className="mt-5 grid gap-4">
                      <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                          <Coffee className="h-4 w-4 text-amber-200" />
                          Activation cue
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-400">
                          {activeLoop.activationLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                          <Headphones className="h-4 w-4 text-amber-200" />
                          Environment lock
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-400">
                          {activeLoop.environmentLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-100">
                          <Footprints className="h-4 w-4 text-amber-200" />
                          Exit protocol
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-400">
                          {activeLoop.recoveryLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <InfoCallout
                    eyebrow="Loop doctrine"
                    title="The block should feel narrower than your excuses."
                    body="Preload lowers the noise floor. Activation creates a repeatable switch. The block is where you remove choice. Recovery keeps tomorrow usable."
                  />
                </div>
              </div>
            </section>
          )}
        </section>

        <section className="space-y-6">
          <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                  Focus history
                </p>
                <h2 className="mt-3 text-3xl text-stone-50">
                  The loop only matters if it repeats.
                </h2>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Save status
                </p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-stone-300">
                  {hasLoaded ? syncMessage : "Loading focus history..."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="surface-panel-soft rounded-[1.5rem] p-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Completed loops
                </p>
                <p className="mt-3 text-3xl font-semibold text-stone-50">
                  {metrics.completedLoops}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Blocks closed cleanly today
                </p>
              </div>
              <div className="surface-panel-soft rounded-[1.5rem] p-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Distractions
                </p>
                <p className="mt-3 text-3xl font-semibold text-stone-50">
                  {metrics.totalDistractions}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Interruptions logged across loops
                </p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="mt-6 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
                <p className="text-lg font-semibold text-stone-100">
                  No completed loops yet.
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-400">
                  Build the loop, run the block, then save the proof here. Once one honest
                  loop lands, the rest of the app gets sharper.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-stone-100">
                            {session.taskTitle}
                          </p>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
                              session.sessionStatus === "completed"
                                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                : "border-amber-300/25 bg-amber-300/10 text-amber-100",
                            )}
                          >
                            {session.sessionStatus === "completed"
                              ? "Completed"
                              : "Ended early"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-stone-400">
                          {session.pillar} • {session.workDepth === "deep" ? "Deep work" : "Shallow work"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteSession(session.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-stone-400 transition hover:bg-white/[0.06] hover:text-stone-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        {
                          label: "Focus",
                          value: `${formatMinutes(session.actualMinutes)} of ${formatMinutes(session.plannedMinutes)}`,
                        },
                        {
                          label: "Preload",
                          value: formatMinutes(session.preloadMinutes),
                        },
                        {
                          label: "Recovery",
                          value: `${formatMinutes(session.recoveryMinutes)} • ${session.recoveryLabel || "No reset set"}`,
                        },
                        {
                          label: "Cue",
                          value: session.activationLabel || "No cue recorded",
                        },
                        {
                          label: "Environment",
                          value: session.environmentLabel || "No environment recorded",
                        },
                        {
                          label: "Distractions",
                          value: `${session.distractionCount} interruption${session.distractionCount === 1 ? "" : "s"} • Quality ${session.qualityRating}/5`,
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-[1.25rem] border border-white/8 bg-black/20 p-4"
                        >
                          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                            {metric.label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-stone-100">
                            {metric.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {session.closureNotes ? (
                      <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-black/20 p-4">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                          Closure note
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-300">
                          {session.closureNotes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <InfoCallout
            eyebrow="Why this works"
            title="The ritual is doing part of the discipline for you."
            body="Preload removes the cheap stimulation advantage. Activation turns focus into a practiced cue. Recovery keeps the loop repeatable tomorrow instead of burning it all in one block."
          />
        </section>
      </div>
    </div>
  );
}
