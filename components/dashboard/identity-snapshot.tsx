"use client";

import Link from "next/link";

import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
export function IdentitySnapshot() {
  const { onboarding: data, hasLoaded, syncMessage, syncSource } = useOnboardingProfile();

  if (!hasLoaded) {
    return (
      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
          Operating system
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
          Loading your standards...
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">{syncMessage}</p>
      </section>
    );
  }

  if (!data.mission.trim()) {
    return (
      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
          Operating system
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
          Setup is not finished yet.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
          Define your mission, pillars, and standards so the dashboard can pressure
          the right behavior instead of showing generic productivity fluff.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.1]"
        >
          Finish onboarding
        </Link>
      </section>
    );
  }

  return (
    <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Operating system
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50">
            {data.name ? `${data.name}'s mission` : "Mission"}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-stone-200">
            {data.mission}
          </p>
        </div>
        <div className="surface-panel-soft rounded-[1.5rem] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/75">
            Tone
          </p>
          <p className="font-display mt-2 text-xl text-stone-50">{data.tone}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-panel-soft rounded-[1.5rem] p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
            Long-term goal
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-300">{data.longTermGoal}</p>
        </div>
        <div className="surface-panel-soft rounded-[1.5rem] p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
            Standards
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-300">{data.defaultFirstMove}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {data.pillars.map((pillar) => (
          <span
            key={pillar}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-stone-300"
          >
            {pillar}
          </span>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-stone-500">
        {syncSource === "supabase" ? "Loaded from Supabase." : syncMessage}
      </p>
    </section>
  );
}
