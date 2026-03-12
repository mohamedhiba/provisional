import Link from "next/link";

import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export function Hero() {
  const activityPreview = [
    0, 1, 0, 2, 3, 4, 1, 0, 2, 3, 4, 4, 2, 1, 0, 3, 4, 2, 1, 0, 1, 2, 4, 3,
    2, 1, 0, 1, 3, 4, 4, 2, 1, 0, 2, 3, 4, 3, 1, 0, 0, 2,
  ];

  const cellClassName = (level: number) => {
    if (level === 4) {
      return "bg-emerald-300";
    }

    if (level === 3) {
      return "bg-emerald-400/70";
    }

    if (level === 2) {
      return "bg-amber-300/70";
    }

    if (level === 1) {
      return "bg-rose-300/60";
    }

    return "bg-white/[0.06]";
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12 sm:px-10">
      <div className="mb-14 flex items-center justify-between gap-4">
        <Logo />
        <div className="surface-kicker hidden sm:inline-flex">Built for ambitious people under pressure</div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
        <div className="space-y-8">
          <div className="surface-kicker">
            Behavior first
          </div>
          <div className="space-y-6">
            <h1 className="max-w-5xl text-[clamp(3.2rem,7vw,6.9rem)] leading-[0.88] text-stone-100">
              Turn ambition into daily proof.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              {siteConfig.mission}
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#f0d6a4]/25 bg-[linear-gradient(135deg,#f6efe2,#d8b070)] px-6 text-sm font-semibold text-stone-950 shadow-[0_16px_40px_rgba(215,168,91,0.2)] transition hover:brightness-[1.03]"
            >
              Start setup
            </Link>
            <Link
              href="/today"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-6 text-sm font-semibold text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.1]"
            >
              Explore app shell
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["One thing", "A day gets one highest-leverage task, not fifteen fake priorities."],
              ["Evidence", "Focus sessions and closeouts make avoidance visible instead of polite."],
              ["Adjustment", "Weekly and monthly layers force the system to evolve, not drift."],
            ].map(([title, body]) => (
              <div key={title} className="surface-panel-soft rounded-[1.5rem] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  {title}
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-300">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-panel rounded-[2rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                  Command preview
                </p>
                <h2 className="mt-3 text-3xl text-stone-50">
                  A serious interface for serious days.
                </h2>
              </div>
              <div className="surface-panel-soft rounded-[1.25rem] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  Day score
                </p>
                <p className="font-display mt-2 text-2xl text-stone-50">82</p>
              </div>
            </div>

            <div className="mt-6 surface-panel-soft rounded-[1.6rem] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                The one thing
              </p>
              <p className="mt-3 text-lg leading-8 text-stone-100">
                Finish the internship applications batch before anything performative.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="surface-panel-soft rounded-[1.6rem] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  Activity map
                </p>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {activityPreview.map((level, index) => (
                    <span
                      key={`${level}-${index}`}
                      className={`h-3 w-3 rounded-[3px] ${cellClassName(level)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="surface-panel-soft rounded-[1.6rem] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  Core loop
                </p>
                <div className="mt-4 space-y-4">
                  {[
                    ["Morning clarity", "Define the one thing and top three."],
                    ["Midday execution", "Log focus sessions as proof of effort."],
                    ["Night truth", "Close the day with score and reflection."],
                  ].map(([title, body]) => (
                    <div key={title}>
                      <p className="text-sm uppercase tracking-[0.24em] text-amber-200/80">
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-stone-300">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-panel-soft rounded-[1.6rem] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                What changes
              </p>
              <p className="mt-3 text-base leading-7 text-stone-200">
                More deep work, fewer fake productive days, tighter weekly correction.
              </p>
            </div>
            <div className="surface-panel-soft rounded-[1.6rem] p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                Emotional tone
              </p>
              <p className="mt-3 text-base leading-7 text-stone-200">
                Minimal, sharp, honest, a little uncomfortable, and impossible to confuse with a toy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
