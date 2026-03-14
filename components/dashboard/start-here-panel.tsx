"use client";

import Link from "next/link";

import { useMonthlyMission } from "@/components/providers/monthly-mission-provider";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useSetupGuide } from "@/components/providers/setup-guide-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { buttonStyles } from "@/components/ui/button";

export function StartHerePanel() {
  const { mission } = useMonthlyMission();
  const { dailyPlan } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review } = useDailyReview();
  const { hasLoaded: guideLoaded, isVisible: guideVisible, isComplete: guideComplete } =
    useSetupGuide();

  const isEmpty =
    !mission?.focusTheme.trim() &&
    !dailyPlan.oneThing.trim() &&
    sessions.length === 0 &&
    !review;

  if (!isEmpty || (guideLoaded && guideVisible && !guideComplete)) {
    return null;
  }

  return (
    <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Start here
          </p>
          <h2 className="mt-3 text-2xl tracking-tight text-stone-50">
            The app gets sharper once the first loop is complete.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
            Define the month, pick today&apos;s highest-leverage task, open one honest
            focus window, and close the day. After that, the pressure system becomes real.
          </p>
        </div>
        <Link
          href="/mission"
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Open setup loop
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["1", "Set the month", "Define the focus theme and 1-3 measurable targets."],
          ["2", "Choose the one thing", "Make the hardest priority impossible to ignore."],
          ["3", "Open a focus window", "Preload once, run a real block, and save the proof."],
          ["4", "Close the day", "Finish with a nightly review so the score counts."],
        ].map(([step, title, body]) => (
          <div key={step} className="surface-panel-soft rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
              Step {step}
            </p>
            <p className="mt-3 text-base font-semibold text-stone-100">{title}</p>
            <p className="mt-3 text-sm leading-7 text-stone-300">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
