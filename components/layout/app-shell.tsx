"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import { SetupGuideBanner } from "@/components/guide/setup-guide-banner";
import { Logo } from "@/components/logo";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import { formatPlanDate } from "@/lib/daily-plan";
import { computeDailyScore } from "@/lib/daily-score";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { dailyPlan, hasLoaded: todayLoaded } = useTodayPlan();
  const { sessions, hasLoaded: sessionsLoaded } = useFocusSessions();
  const { review, hasLoaded: reviewLoaded } = useDailyReview();
  const { summary, hasLoaded: weeklyLoaded } = useWeeklyReview();
  const { snapshot, hasLoaded: analyticsLoaded } = useAnalytics();
  const score = computeDailyScore({
    dailyPlan,
    sessions,
    reviewCompleted: Boolean(review),
  });
  const headerMetrics = [
    [
      "Streak",
      analyticsLoaded
        ? `${snapshot.currentStreak} day${snapshot.currentStreak === 1 ? "" : "s"}`
        : weeklyLoaded
          ? `${summary.currentStreak} day${summary.currentStreak === 1 ? "" : "s"}`
          : "--",
    ],
    [
      "Weekly",
      weeklyLoaded ? `${summary.winningDays} / 5` : "--",
    ],
    [
      "Score",
      todayLoaded && sessionsLoaded && reviewLoaded ? `${score}` : "--",
    ],
  ] as const;

  return (
    <div className="relative min-h-screen text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
        <aside className="surface-panel mb-4 rounded-[2rem] p-4 lg:sticky lg:top-6 lg:mb-0 lg:h-[calc(100vh-3rem)] lg:w-[290px] lg:p-6">
          <div className="flex h-full flex-col">
            <Logo />
            <div className="mt-8 surface-panel-soft rounded-[1.5rem] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Operating mode
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-200">
                Discipline is a design problem. Build the environment so drift has less room.
              </p>
            </div>
            <div className="mt-8 space-y-2">
              {siteConfig.navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between rounded-[1.35rem] border px-4 py-3.5 transition duration-200",
                      active
                        ? "border-[#e0bf8c]/30 bg-[linear-gradient(135deg,rgba(215,168,91,0.18),rgba(130,180,172,0.1))] text-stone-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border-transparent bg-white/[0.03] text-stone-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-stone-100",
                    )}
                    >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-[1.05rem] w-[1.05rem]",
                          active ? "text-amber-100" : "text-stone-500",
                        )}
                      />
                      <span className="text-[0.96rem] font-semibold tracking-[-0.01em]">
                        {item.label}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-stone-500 transition group-hover:text-stone-400">
                      {item.shortLabel}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="surface-panel-soft mt-auto rounded-[1.75rem] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Operating rule
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Daily proof beats motivational fiction. One thing first.
              </p>
            </div>
          </div>
        </aside>

        <div className="surface-panel flex min-h-[calc(100vh-3rem)] flex-1 flex-col rounded-[2rem]">
          <header className="border-b border-white/8 px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="surface-kicker">
                  Execution OS
                </p>
                <p className="mt-5 text-xs uppercase tracking-[0.3em] text-stone-500">
                  {formatPlanDate(dailyPlan.planDate)}
                </p>
                <h1 className="mt-3 max-w-2xl text-[clamp(2rem,3vw,3rem)] tracking-tight text-stone-50">
                  Know what matters. Do the work. Face the truth.
                </h1>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:w-[420px]">
                {headerMetrics.map(([label, value]) => (
                  <div
                    key={label}
                    className="surface-panel-soft ambient-ring rounded-[1.45rem] px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      {label}
                    </p>
                    <p className="font-display mt-3 text-2xl tracking-tight text-stone-50">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-400">
                Treat the interface like a command room: fewer decorations, sharper signals, and visible proof when standards slip.
              </p>
            </div>
          </header>
          <div className="px-5 pt-6 sm:px-8">
            <SetupGuideBanner />
          </div>
          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
