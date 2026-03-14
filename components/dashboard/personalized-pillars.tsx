"use client";

import { useMemo } from "react";

import { PillarProgress } from "@/components/dashboard/pillar-progress";
import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";

function normalizePillarKey(value: string) {
  return value.trim().toLowerCase();
}

export function PersonalizedPillars() {
  const { onboarding, hasLoaded } = useOnboardingProfile();
  const { sessions } = useFocusSessions();
  const pillars = useMemo(() => {
    const configured = hasLoaded
      ? onboarding.pillars.filter((pillar) => pillar.trim())
      : [];
    const fallback = Array.from(
      new Set(sessions.map((session) => session.pillar.trim()).filter(Boolean)),
    );
    const names = configured.length > 0 ? configured : fallback;
    const byPillar = new Map(
      names.map((pillar) => [
        normalizePillarKey(pillar),
        {
          name: pillar,
          minutes: 0,
          deepMinutes: 0,
          sessions: 0,
        },
      ]),
    );

    for (const session of sessions) {
      const key = normalizePillarKey(session.pillar);
      if (!key) {
        continue;
      }

      const entry = byPillar.get(key);

      if (!entry) {
        byPillar.set(key, {
          name: session.pillar,
          minutes: session.actualMinutes,
          deepMinutes: session.workDepth === "deep" ? session.actualMinutes : 0,
          sessions: 1,
        });
        continue;
      }

      entry.minutes += session.actualMinutes;
      entry.deepMinutes += session.workDepth === "deep" ? session.actualMinutes : 0;
      entry.sessions += 1;
    }

    return Array.from(byPillar.values())
      .map((pillar) => {
        const progressBase = pillar.deepMinutes > 0 ? pillar.deepMinutes / 90 : pillar.minutes / 60;
        const progress = Math.max(0, Math.min(1, progressBase));
        const valueLabel = pillar.minutes > 0 ? `${pillar.minutes} min` : "Not touched";
        const detail =
          pillar.sessions === 0
            ? "No focus proof logged for this pillar today."
            : `${pillar.sessions} block${pillar.sessions === 1 ? "" : "s"} saved${pillar.deepMinutes > 0 ? ` • ${pillar.deepMinutes} deep min` : ""}`;

        return {
          ...pillar,
          progress,
          valueLabel,
          detail,
        };
      })
      .sort((left, right) => right.minutes - left.minutes || left.name.localeCompare(right.name));
  }, [hasLoaded, onboarding.pillars, sessions]);

  if (pillars.length === 0) {
    return (
      <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-5">
        <p className="text-sm font-medium text-stone-100">No pillars are active yet.</p>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Add your real life areas in onboarding, then use saved focus blocks to show
          which pillar today is actually serving.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {pillars.map((pillar) => (
        <PillarProgress
          key={pillar.name}
          name={pillar.name}
          progress={pillar.progress}
          valueLabel={pillar.valueLabel}
          detail={pillar.detail}
        />
      ))}
    </div>
  );
}
