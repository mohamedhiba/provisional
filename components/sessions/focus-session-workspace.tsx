"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { Button } from "@/components/ui/button";
import { InfoCallout } from "@/components/ui/info-callout";
import {
  computeFocusSessionMetrics,
  defaultFocusSessionDraft,
  formatMinutes,
  parseFocusSessionDraft,
  validateFocusSessionDraft,
  type FocusSessionDraft,
} from "@/lib/focus-session";

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40";

export function FocusSessionWorkspace() {
  const { today } = useCurrentDate();
  const { onboarding } = useOnboardingProfile();
  const { sessions, createSession, deleteSession, hasLoaded, syncMessage } =
    useFocusSessions();
  const [draft, setDraft] = useState<FocusSessionDraft>({
    ...defaultFocusSessionDraft,
    taskTitle: "",
    pillar: onboarding.pillars[0] ?? "",
  });
  const [formError, setFormError] = useState("");

  const metrics = computeFocusSessionMetrics(sessions);
  const pillars = onboarding.pillars.length > 0
    ? onboarding.pillars
    : ["Career", "Academics", "Health", "Discipline"];

  function setField<K extends keyof FocusSessionDraft>(key: K, value: FocusSessionDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateFocusSessionDraft(draft);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    await createSession(parseFocusSessionDraft(draft, today));
    setDraft((current) => ({
      ...defaultFocusSessionDraft,
      pillar: current.pillar,
      taskTitle: "",
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-6">
        {sessions.length === 0 ? (
          <InfoCallout
            eyebrow="Session guide"
            title="Keep session logging blunt and quick."
            body="Use one real work block per entry. Name the task plainly, choose the pillar it served, and record the actual minutes even if the block was messy. The goal is evidence, not perfect tracking theater."
          />
        ) : null}

        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Log focus session
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
            Make effort visible.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-stone-400">
            The logger is intentionally fast. Capture the real work block, how long it
            actually lasted, and whether it was deep or shallow effort.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Task
            </label>
            <input
              className={inputClassName}
              value={draft.taskTitle}
              onChange={(event) => setField("taskTitle", event.target.value)}
              placeholder="Resume tailoring, ML study block, project debugging..."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Pillar
              </label>
              <select
                className={inputClassName}
                value={draft.pillar}
                onChange={(event) => setField("pillar", event.target.value)}
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
                  { label: "Deep work", value: "deep" },
                  { label: "Shallow work", value: "shallow" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField("workDepth", option.value as "deep" | "shallow")}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
                      draft.workDepth === option.value
                        ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                        : "border-white/10 bg-white/[0.03] text-stone-300 hover:bg-white/[0.06]"
                    }`}
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
                Planned minutes
              </label>
              <input
                className={inputClassName}
                value={draft.plannedMinutes}
                onChange={(event) => setField("plannedMinutes", event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Actual minutes
              </label>
              <input
                className={inputClassName}
                value={draft.actualMinutes}
                onChange={(event) => setField("actualMinutes", event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Quality rating
              </label>
              <select
                className={inputClassName}
                value={draft.qualityRating}
                onChange={(event) => setField("qualityRating", event.target.value)}
              >
                {["1", "2", "3", "4", "5"].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}/5
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError ? (
            <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
              {formError}
            </div>
          ) : null}

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm leading-6 text-stone-500">
                {hasLoaded ? syncMessage : "Loading today's sessions..."}
              </p>
              <Button size="lg" type="submit">
                Log session
              </Button>
            </div>
          </form>
        </section>
      </div>

      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Sessions", value: `${metrics.totalSessions}`, detail: "Logged today" },
            { label: "Deep work", value: formatMinutes(metrics.deepMinutes), detail: "High-focus minutes" },
            { label: "Quality", value: `${metrics.averageQuality}/5`, detail: "Average session rating" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
                {metric.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-400">{metric.detail}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Recent sessions
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
            Work sessions are evidence.
          </h2>

          {sessions.length === 0 ? (
            <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
              <p className="text-lg font-semibold text-stone-100">No sessions logged yet.</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                Log the first block of real work and the app will start showing honest
                execution evidence here.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-stone-100">
                        {session.taskTitle}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">
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
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        Planned
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">
                        {formatMinutes(session.plannedMinutes)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        Actual
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">
                        {formatMinutes(session.actualMinutes)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                        Quality
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">
                        {session.qualityRating}/5
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
