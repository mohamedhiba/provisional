"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useCurrentDate } from "@/components/providers/current-date-provider";
import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { InfoCallout } from "@/components/ui/info-callout";
import { Button } from "@/components/ui/button";
import {
  clearLocalMonthlyMissionDraft,
  computeMonthlyMissionProgress,
  createEmptyMonthlyMission,
  createMonthlyMissionTarget,
  formatMonthLabel,
  isMonthlyMissionEmpty,
  normalizeMonthlyMissionState,
  readLocalMonthlyMissionDraft,
  validateMonthlyMission,
  writeLocalMonthlyMissionDraft,
  type MonthlyMissionState,
} from "@/lib/monthly-mission";

const inputClassName =
  "w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

const textAreaClassName =
  "min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

export function MonthlyMissionWorkspace() {
  const { monthStart } = useCurrentDate();
  const { mission, hasLoaded, syncMessage, saveMission } = useMonthlyMission();
  const [form, setForm] = useState<MonthlyMissionState>(createEmptyMonthlyMission(monthStart));
  const [formError, setFormError] = useState("");
  const [hasHydratedForm, setHasHydratedForm] = useState(false);
  const progress = computeMonthlyMissionProgress(form);

  useEffect(() => {
    if (mission) {
      setForm(mission);
      setHasHydratedForm(true);
      return;
    }

    const draft = readLocalMonthlyMissionDraft(monthStart);
    setForm(draft ?? createEmptyMonthlyMission(monthStart));
    setHasHydratedForm(true);
  }, [mission, monthStart]);

  useEffect(() => {
    if (!hasHydratedForm) {
      return;
    }

    const normalizedForm = normalizeMonthlyMissionState(form, monthStart);
    const normalizedMission = mission
      ? normalizeMonthlyMissionState(mission, monthStart)
      : null;

    if (normalizedMission && JSON.stringify(normalizedMission) === JSON.stringify(normalizedForm)) {
      clearLocalMonthlyMissionDraft(monthStart);
      return;
    }

    if (isMonthlyMissionEmpty(normalizedForm)) {
      clearLocalMonthlyMissionDraft(monthStart);
      return;
    }

    writeLocalMonthlyMissionDraft(normalizedForm);
  }, [form, hasHydratedForm, mission, monthStart]);

  function setField<K extends keyof MonthlyMissionState>(
    key: K,
    value: MonthlyMissionState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTarget(
    id: string,
    key: keyof MonthlyMissionState["targets"][number],
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      targets: current.targets.map((target) =>
        target.id === id
          ? {
              ...target,
              [key]: value,
            }
          : target,
      ),
    }));
  }

  function addTarget() {
    setForm((current) => ({
      ...current,
      targets: [...current.targets, createMonthlyMissionTarget()],
    }));
  }

  function removeTarget(id: string) {
    setForm((current) => ({
      ...current,
      targets:
        current.targets.length > 1
          ? current.targets.filter((target) => target.id !== id)
          : current.targets,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateMonthlyMission(form);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    await saveMission(form);
    clearLocalMonthlyMissionDraft(form.monthStart);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Monthly mission
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
              Decide what this month is really about.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              A month should have a theme, a mission, and measurable proof. If
              everything matters, drift wins by default.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Month
            </p>
            <p className="mt-2 text-xl font-semibold text-stone-50">
              {formatMonthLabel(form.monthStart)}
            </p>
            <p className="mt-2 text-sm text-stone-400">
              {mission ? "Mission set" : "Mission still open"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Theme"
            value={form.focusTheme.trim() || "Unset"}
            detail="The one lens this month should be judged through."
          />
          <MetricCard
            label="Targets"
            value={`${progress.completedTargets}/${progress.activeTargets || 0}`}
            detail="Completed measurable targets this month."
          />
          <MetricCard
            label="Progress"
            value={`${progress.progressPercent}%`}
            detail="Average progress across active targets."
          />
          <MetricCard
            label="Week bridge"
            value={form.currentWeekFocus.trim() || "Unset"}
            detail="What this week must reinforce."
          />
        </div>
      </section>

      {!mission ? (
        <InfoCallout
          eyebrow="Monthly guide"
          title="Keep this page concrete."
          body="Use one short theme, one main mission, and a few measurable targets. The placeholders are examples of structure, not prefilled commitments you need to keep."
        />
      ) : null}

      <form className="grid gap-6 xl:grid-cols-[1fr_0.95fr]" onSubmit={handleSubmit}>
        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Focus theme
              </label>
              <input
                className={inputClassName}
                value={form.focusTheme}
                onChange={(event) => setField("focusTheme", event.target.value)}
                placeholder="Example: Career acceleration"
              />
              <p className="text-xs leading-6 text-stone-500">
                Short phrase, not a paragraph.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Primary mission
              </label>
              <textarea
                className={textAreaClassName}
                value={form.primaryMission}
                onChange={(event) => setField("primaryMission", event.target.value)}
                placeholder="What must be true by the end of this month?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Why this matters now
              </label>
              <textarea
                className={textAreaClassName}
                value={form.whyThisMatters}
                onChange={(event) => setField("whyThisMatters", event.target.value)}
                placeholder="Why is this month consequential?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Current week focus
              </label>
              <textarea
                className={textAreaClassName}
                value={form.currentWeekFocus}
                onChange={(event) => setField("currentWeekFocus", event.target.value)}
                placeholder="What should this week prove for the month?"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Targets and constraints
          </p>
          <div className="mt-6 grid gap-4">
            {form.targets.map((target, index) => (
              <div
                key={target.id}
                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Target {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeTarget(target.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-stone-400 transition hover:bg-white/[0.06] hover:text-stone-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3">
                  <input
                    className={inputClassName}
                    value={target.label}
                    onChange={(event) => updateTarget(target.id, "label", event.target.value)}
                    placeholder="Example: Applications sent"
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      className={inputClassName}
                      value={target.currentNumber}
                      onChange={(event) =>
                        updateTarget(target.id, "currentNumber", event.target.value)
                      }
                      placeholder="Current"
                    />
                    <input
                      className={inputClassName}
                      value={target.targetNumber}
                      onChange={(event) =>
                        updateTarget(target.id, "targetNumber", event.target.value)
                      }
                      placeholder="Target"
                    />
                    <input
                      className={inputClassName}
                      value={target.unit}
                      onChange={(event) => updateTarget(target.id, "unit", event.target.value)}
                      placeholder="per month"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button onClick={addTarget} type="button" variant="secondary">
              Add target
            </Button>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Must protect
              </label>
              <textarea
                className={textAreaClassName}
                value={form.mustProtect}
                onChange={(event) => setField("mustProtect", event.target.value)}
                placeholder="What standards cannot collapse this month?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Must ignore
              </label>
              <textarea
                className={textAreaClassName}
                value={form.mustIgnore}
                onChange={(event) => setField("mustIgnore", event.target.value)}
                placeholder="What gets cut, delayed, or treated as noise this month?"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8 xl:col-span-2">
          {formError ? (
            <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
              {formError}
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-stone-500">
              {hasLoaded ? syncMessage : "Loading monthly mission..."}
            </p>
            <Button size="lg" type="submit">
              {mission ? "Update mission" : "Lock monthly mission"}
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
