"use client";

import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { DriftAlertList } from "@/components/analytics/drift-alert-list";
import { useAnalytics } from "@/components/providers/analytics-provider";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useDailyReview } from "@/components/providers/daily-review-provider";
import { useFocusSessions } from "@/components/providers/focus-sessions-provider";
import { useTodayPlan } from "@/components/providers/today-plan-provider";
import { useWeeklyReview } from "@/components/providers/weekly-review-provider";
import { InfoCallout } from "@/components/ui/info-callout";
import { computeDailyScore } from "@/lib/daily-score";
import { formatMinutes } from "@/lib/focus-session";

function statusClassName(status: "winning" | "solid" | "drift" | "open") {
  if (status === "winning") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "solid") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-100";
  }

  if (status === "drift") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

export function AnalyticsOverview() {
  const { dailyPlan } = useTodayPlan();
  const { sessions } = useFocusSessions();
  const { review } = useDailyReview();
  const { summary } = useWeeklyReview();
  const { snapshot } = useAnalytics();
  const todayScore = computeDailyScore({
    dailyPlan,
    sessions,
    reviewCompleted: Boolean(review),
  });
  const hasMeaningfulActivity = snapshot.activityGrid.some((day) => day.intensity > 0);

  return (
    <div className="space-y-6">
      {!hasMeaningfulActivity ? (
        <InfoCallout
          eyebrow="Analytics guide"
          title="The dashboard wakes up after a few honest days."
          body="Start by setting the one thing, logging one focus session, and closing the day with a review. Once that loop runs a few times, this page will show trends, alerts, and a real activity map instead of flat zeroes."
          actionHref="/today"
          actionLabel="Run the first loop"
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Top-task completion"
          value={`${summary.topTaskCompletionRate}%`}
          detail={`${summary.missedTopTasks} missed top task${summary.missedTopTasks === 1 ? "" : "s"} this week.`}
        />
        <MetricCard
          label="Night review completion"
          value={`${summary.reviewCompletionRate}%`}
          detail={`${snapshot.currentStreak} day${snapshot.currentStreak === 1 ? "" : "s"} of real streak momentum.`}
        />
        <MetricCard
          label="Deep work hours"
          value={`${summary.deepWorkHours.toFixed(1)}`}
          detail={`${summary.sessionCount} focus session${summary.sessionCount === 1 ? "" : "s"} logged this week.`}
        />
        <MetricCard
          label="Drift days"
          value={`${summary.driftDays}`}
          detail={`Today is at ${todayScore} and the week is currently led by ${summary.mostActivePillar.toLowerCase()}.`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Drift alerts
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
            The system should call out avoidance while it is happening.
          </h2>
          <div className="mt-6">
            <DriftAlertList alerts={snapshot.driftAlerts} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Progress map
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
            Daily proof across the last 12 weeks.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
            Each square belongs to one calendar day. Stronger color means stronger execution evidence on that specific day, not a rolling average.
          </p>
          <div className="mt-6">
            <ActivityHeatmap days={snapshot.activityGrid} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
          Last four weeks
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
          Trends should expose whether the system is tightening or slipping.
        </h2>
        <div className="mt-8 overflow-x-auto rounded-[1.75rem] border border-white/8">
          <table className="min-w-[720px] border-collapse text-left xl:min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                {["Week", "Top-task completion", "Deep work", "Drift days", "Closeout"].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-stone-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!hasMeaningfulActivity ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-sm leading-6 text-stone-400"
                  >
                    You have not logged enough activity yet for trend history. A few
                    closed days will turn this table into a real scorecard.
                  </td>
                </tr>
              ) : (
                snapshot.weeklyHistory.map((week) => (
                  <tr key={week.weekStart} className="border-t border-white/8">
                    <td className="px-5 py-4 text-sm font-medium text-stone-100">
                      <div className="flex items-center gap-3">
                        <span>{week.label}</span>
                        {week.isCurrentWeek ? (
                          <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                            Current
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {week.topTaskCompletionRate}%
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {week.deepWorkHours.toFixed(1)}h
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {week.driftDays}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {week.reviewCompletionRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
          Current week breakdown
        </p>
        <div className="mt-6 overflow-x-auto rounded-[1.75rem] border border-white/8">
          <table className="min-w-[720px] border-collapse text-left xl:min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                {["Day", "Score", "Top task", "Deep work", "Closeout"].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-stone-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!hasMeaningfulActivity ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-sm leading-6 text-stone-400"
                  >
                    Current-week detail appears once you begin closing days and logging
                    real work.
                  </td>
                </tr>
              ) : (
                summary.dailyBreakdown.map((day) => (
                  <tr key={day.date} className="border-t border-white/8">
                    <td className="px-5 py-4 text-sm font-medium text-stone-100">
                      {day.label}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusClassName(day.status)}`}
                      >
                        {day.score} {day.scoreLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {day.topTaskDone ? "Done" : "Open"}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {formatMinutes(day.deepMinutes)}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-300">
                      {day.reviewCompleted ? "Closed" : "Open"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Pattern pressure
          </p>
          <div className="mt-6 space-y-4">
            {[
              ["Main lie", summary.mainLie],
              ["Repeated excuse", summary.repeatedExcuse],
              ["Most active pillar", summary.mostActivePillar],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  {label}
                </p>
                <p className="mt-2 text-base leading-7 text-stone-100">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
            Current signal
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Today score"
              value={`${todayScore}`}
              detail="Live from the current day state."
            />
            <MetricCard
              label="Winning days"
              value={`${summary.winningDays}`}
              detail="Days at 75+ this week."
            />
            <MetricCard
              label="Weekly score"
              value={`${summary.totalScore}`}
              detail={`Across ${summary.daysElapsed} tracked day${summary.daysElapsed === 1 ? "" : "s"}.`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
