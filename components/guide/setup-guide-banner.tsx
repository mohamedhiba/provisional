"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSetupGuide } from "@/components/providers/setup-guide-provider";
import { cn } from "@/lib/utils";

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SetupGuideBanner() {
  const pathname = usePathname();
  const {
    hasLoaded,
    isVisible,
    isComplete,
    completedCount,
    totalSteps,
    currentStep,
    steps,
    hideGuide,
    showGuide,
  } = useSetupGuide();

  if (!hasLoaded || isComplete) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3">
        <p className="text-sm text-stone-300">
          Guided setup is hidden. You have completed {completedCount} of {totalSteps} steps.
        </p>
        <button
          type="button"
          onClick={showGuide}
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.1]"
        >
          Open guide
        </button>
      </div>
    );
  }

  if (!currentStep) {
    return null;
  }

  const onCurrentPage = matchesRoute(pathname, currentStep.href);

  return (
    <section className="rounded-[1.9rem] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(215,168,91,0.12),rgba(255,255,255,0.04))] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-100/80">
              Guided setup
            </p>
            <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-300">
              {completedCount}/{totalSteps} complete
            </span>
            {onCurrentPage ? (
              <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-100">
                You are here
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl tracking-tight text-stone-50">
            Build the first proof loop.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-200">
            {currentStep.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={currentStep.href}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#f0d6a4]/25 bg-[linear-gradient(135deg,#f6efe2,#d8b070)] px-5 text-sm font-semibold text-stone-950 shadow-[0_16px_40px_rgba(215,168,91,0.2)] transition hover:brightness-[1.03]"
          >
            {onCurrentPage ? "Finish this step" : currentStep.actionLabel}
          </Link>
          <button
            type="button"
            onClick={hideGuide}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-stone-300 transition hover:bg-white/[0.1] hover:text-stone-100"
            aria-label="Hide setup guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const isActiveRoute = matchesRoute(pathname, step.href);

          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "rounded-[1.45rem] border px-4 py-4 transition",
                step.state === "complete"
                  ? "border-emerald-300/18 bg-emerald-300/10"
                  : step.state === "current"
                    ? "border-amber-300/20 bg-amber-300/10"
                    : "border-white/8 bg-black/20 hover:bg-white/[0.05]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Step {index + 1}
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[10px] uppercase tracking-[0.2em]",
                    step.state === "complete"
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                      : step.state === "current"
                        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-white/[0.04] text-stone-400",
                  )}
                >
                  {step.state === "complete" ? <Check className="h-3.5 w-3.5" /> : step.shortLabel}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-stone-100">{step.label}</p>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                {step.state === "complete"
                  ? "Complete."
                  : step.state === "current"
                    ? "Current priority in the setup flow."
                    : "Upcoming after the current step is closed."}
              </p>
              {isActiveRoute ? (
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-100/80">
                  Current page
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
