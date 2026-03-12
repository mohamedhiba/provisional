"use client";

import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { PillarProgress } from "@/components/dashboard/pillar-progress";

type PersonalizedPillarsProps = {
  fallbackPillars: Array<{
    name: string;
    progress: number;
  }>;
};

export function PersonalizedPillars({ fallbackPillars }: PersonalizedPillarsProps) {
  const { onboarding, hasLoaded } = useOnboardingProfile();
  const pillars =
    hasLoaded && onboarding.pillars.length > 0
      ? onboarding.pillars.map((pillar, index) => ({
          name: pillar,
          progress: fallbackPillars[index % fallbackPillars.length]?.progress ?? 0.35,
        }))
      : fallbackPillars;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {pillars.map((pillar) => (
        <PillarProgress key={pillar.name} name={pillar.name} progress={pillar.progress} />
      ))}
    </div>
  );
}
