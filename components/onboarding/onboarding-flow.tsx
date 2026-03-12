"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { Button } from "@/components/ui/button";
import {
  accountabilityTones,
  createWeeklyTarget,
  pillarOptions,
  type OnboardingState,
} from "@/lib/onboarding";

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40";

const textAreaClassName =
  "min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition focus:border-amber-300/40";

const steps = [
  {
    label: "Step 1 of 4",
    title: "Who are you becoming?",
    description: "Set the identity and ambition this system is meant to protect.",
  },
  {
    label: "Step 2 of 4",
    title: "What pillars define this season?",
    description: "Choose the few areas that deserve pressure, not vague attention.",
  },
  {
    label: "Step 3 of 4",
    title: "What does a winning week look like?",
    description: "Turn standards into measurable weekly proof.",
  },
  {
    label: "Step 4 of 4",
    title: "Set your standards.",
    description: "Define the rules that make drift harder and recovery faster.",
  },
] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const {
    onboarding: form,
    setOnboarding: setForm,
    hasLoaded,
    syncMessage,
    syncSource,
    syncStatus,
  } = useOnboardingProfile();
  const [step, setStep] = useState(0);
  const [customPillar, setCustomPillar] = useState("");
  const [stepError, setStepError] = useState("");

  const selectedStep = steps[step];
  const completion = `${Math.round(((step + 1) / steps.length) * 100)}%`;

  function setField<K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) {
    setForm((current: OnboardingState) => ({
      ...current,
      [key]: value,
    }));
  }

  function togglePillar(pillar: string) {
    setStepError("");
    setForm((current: OnboardingState) => {
      const hasPillar = current.pillars.includes(pillar);

      if (hasPillar) {
        return {
          ...current,
          pillars: current.pillars.filter((item) => item !== pillar),
          weeklyTargets: current.weeklyTargets.filter((item) => item.pillar !== pillar),
        };
      }

      if (current.pillars.length >= 4) {
        return current;
      }

      return {
        ...current,
        pillars: [...current.pillars, pillar],
        weeklyTargets: [...current.weeklyTargets, createWeeklyTarget(pillar)],
      };
    });
  }

  function addCustomPillar() {
    const value = customPillar.trim();

    if (!value) {
      return;
    }

    if (form.pillars.includes(value) || form.pillars.length >= 4) {
      setCustomPillar("");
      return;
    }

    setForm((current: OnboardingState) => ({
      ...current,
      pillars: [...current.pillars, value],
      weeklyTargets: [...current.weeklyTargets, createWeeklyTarget(value)],
    }));
    setCustomPillar("");
    setStepError("");
  }

  function updateTarget(
    id: string,
    key: "pillar" | "label" | "targetNumber" | "targetUnit",
    value: string,
  ) {
    setForm((current: OnboardingState) => ({
      ...current,
      weeklyTargets: current.weeklyTargets.map((target) =>
        target.id === id
          ? {
              ...target,
              [key]: value,
            }
          : target,
      ),
    }));
  }

  function removeTarget(id: string) {
    setForm((current: OnboardingState) => ({
      ...current,
      weeklyTargets: current.weeklyTargets.filter((target) => target.id !== id),
    }));
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!form.name.trim() || !form.mission.trim() || !form.longTermGoal.trim()) {
        return "Fill out your name, mission, and long-term goal before moving on.";
      }
    }

    if (step === 1) {
      if (form.pillars.length < 3) {
        return "Choose at least 3 pillars so the system knows what to protect.";
      }
    }

    if (step === 2) {
      if (form.weeklyTargets.length === 0) {
        return "Add at least one weekly target.";
      }

      const hasInvalidTarget = form.weeklyTargets.some(
        (target) =>
          !target.pillar.trim() ||
          !target.label.trim() ||
          !target.targetNumber.trim() ||
          !target.targetUnit.trim(),
      );

      if (hasInvalidTarget) {
        return "Every weekly target needs a pillar, metric, number, and unit.";
      }
    }

    if (step === 3) {
      if (!form.nonNegotiables.trim() || !form.defaultFirstMove.trim()) {
        return "Set your standards before entering the app.";
      }
    }

    return "";
  }

  function goNext() {
    const error = validateCurrentStep();

    if (error) {
      setStepError(error);
      return;
    }

    setStepError("");

    if (step === steps.length - 1) {
      startTransition(() => {
        router.push("/today");
      });
      return;
    }

    setStep((current) => current + 1);
  }

  function goBack() {
    setStepError("");
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-50">
          Build your operating system before the first day starts.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-stone-300">
          This flow is intentionally strict. Proof should know what you are trying to
          become, what matters this season, and what standards define a winning week.
        </p>

        <div className="mt-8 space-y-4">
          {steps.map((item, index) => (
            <div
              key={item.label}
              className={`rounded-[1.5rem] border p-5 transition ${
                index === step
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-white/8 bg-black/20"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-100">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-stone-400">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Live summary
            </p>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/70">
              {completion}
            </p>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/8">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,_rgba(245,158,11,0.95),_rgba(239,68,68,0.9))]"
              style={{ width: completion }}
            />
          </div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-stone-300">
            <p>
              <span className="text-stone-500">Mission:</span>{" "}
              {form.mission || "Not written yet"}
            </p>
            <p>
              <span className="text-stone-500">Long-term goal:</span>{" "}
              {form.longTermGoal || "Not written yet"}
            </p>
            <p>
              <span className="text-stone-500">Pillars:</span>{" "}
              {form.pillars.join(", ")}
            </p>
            <p>
              <span className="text-stone-500">Tone:</span> {form.tone}
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-stone-500">
            {hasLoaded
              ? syncMessage
              : "Loading your current setup..."}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              {selectedStep.label}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-50">
              {selectedStep.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
              {selectedStep.description}
            </p>
          </div>
          <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-stone-400">
            {form.tone} mode
          </div>
        </div>

        <div className="mt-8">
          {step === 0 ? (
            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Name
                </label>
                <input
                  className={inputClassName}
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Mohamed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Mission statement
                </label>
                <textarea
                  className={textAreaClassName}
                  value={form.mission}
                  onChange={(event) => setField("mission", event.target.value)}
                  placeholder="I do the hard thing first and turn ambition into evidence."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Long-term goal
                </label>
                <textarea
                  className={textAreaClassName}
                  value={form.longTermGoal}
                  onChange={(event) => setField("longTermGoal", event.target.value)}
                  placeholder="ML engineer role, stronger GPA, disciplined life."
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Choose 3 to 4 pillars
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {pillarOptions.map((pillar) => {
                    const active = form.pillars.includes(pillar);

                    return (
                      <button
                        key={pillar}
                        type="button"
                        onClick={() => togglePillar(pillar)}
                        className={`rounded-full border px-4 py-3 text-sm transition ${
                          active
                            ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                            : "border-white/10 bg-white/[0.03] text-stone-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        {pillar}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Add custom pillar
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className={inputClassName}
                    value={customPillar}
                    onChange={(event) => setCustomPillar(event.target.value)}
                    placeholder="Examples: Relationships, Faith, Writing"
                  />
                  <Button onClick={addCustomPillar} variant="secondary">
                    Add pillar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {form.weeklyTargets.map((target) => (
                <div
                  key={target.id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.2fr_0.45fr_0.6fr_auto]">
                    <select
                      className={inputClassName}
                      value={target.pillar}
                      onChange={(event) =>
                        updateTarget(target.id, "pillar", event.target.value)
                      }
                    >
                      <option value="">Select pillar</option>
                      {form.pillars.map((pillar) => (
                        <option key={pillar} value={pillar}>
                          {pillar}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClassName}
                      value={target.label}
                      onChange={(event) =>
                        updateTarget(target.id, "label", event.target.value)
                      }
                      placeholder="Applications sent"
                    />
                    <input
                      className={inputClassName}
                      value={target.targetNumber}
                      onChange={(event) =>
                        updateTarget(target.id, "targetNumber", event.target.value)
                      }
                      placeholder="10"
                    />
                    <input
                      className={inputClassName}
                      value={target.targetUnit}
                      onChange={(event) =>
                        updateTarget(target.id, "targetUnit", event.target.value)
                      }
                      placeholder="per week"
                    />
                    <Button
                      className="w-full xl:w-auto"
                      onClick={() => removeTarget(target.id)}
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button onClick={() => setField("weeklyTargets", [...form.weeklyTargets, createWeeklyTarget(form.pillars[0] || "")])} variant="secondary">
                Add weekly target
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Non-negotiables
                </label>
                <textarea
                  className={textAreaClassName}
                  value={form.nonNegotiables}
                  onChange={(event) =>
                    setField("nonNegotiables", event.target.value)
                  }
                  placeholder="Sleep by 12, gym four times a week, no-scroll during work blocks."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Default first move
                </label>
                <textarea
                  className={textAreaClassName}
                  value={form.defaultFirstMove}
                  onChange={(event) =>
                    setField("defaultFirstMove", event.target.value)
                  }
                  placeholder="Do the hardest meaningful task before admin work."
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Accountability tone
                </label>
                <div className="flex flex-wrap gap-3">
                  {accountabilityTones.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setField("tone", tone)}
                      className={`rounded-full border px-4 py-3 text-sm transition ${
                        form.tone === tone
                          ? "border-amber-300/25 bg-amber-300/10 text-stone-50"
                          : "border-white/10 bg-white/[0.03] text-stone-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {stepError ? (
          <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-100">
            {stepError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-stone-500">
            {syncStatus === "saving"
              ? "Saving changes..."
              : syncSource === "supabase"
                ? "Changes are syncing to Supabase."
                : "Changes are saved on this device."}
          </p>
          <div className="flex gap-3">
            <Button onClick={goBack} disabled={step === 0} variant="secondary">
              Back
            </Button>
            <Button onClick={goNext} size="lg">
              {step === steps.length - 1 ? "Enter Proof" : "Continue"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
