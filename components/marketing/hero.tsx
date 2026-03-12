import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function Hero() {
  return (
    <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-stone-300">
            Behavior first
          </div>
          <div className="space-y-6">
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.94] text-stone-100 sm:text-6xl lg:text-7xl">
              Turn ambition into daily proof.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              {siteConfig.mission}
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full bg-stone-100 px-6 text-sm font-medium text-stone-950 transition hover:bg-stone-200"
            >
              Start setup
            </Link>
            <Link
              href="/today"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 text-sm font-medium text-stone-100 transition hover:bg-white/10"
            >
              Explore app shell
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
              Core loop
            </p>
            <div className="grid gap-4">
              {[
                ["Morning clarity", "Define the one thing and top three."],
                ["Midday execution", "Log focus sessions as proof of effort."],
                ["Night truth", "Close the day with score and reflection."],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/8 bg-black/20 p-5"
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-amber-300/80">
                    {title}
                  </p>
                  <p className="mt-2 text-base text-stone-300">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
