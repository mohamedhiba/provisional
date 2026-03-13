"use client";

import { formatActivityDate, type AnalyticsActivityDay } from "@/lib/analytics";

function cellClassName(day: AnalyticsActivityDay) {
  if (day.isFuture) {
    return "border border-dashed border-white/8 bg-transparent";
  }

  if (day.intensity === 4) {
    return "bg-emerald-300";
  }

  if (day.intensity === 3) {
    return "bg-emerald-400/70";
  }

  if (day.intensity === 2) {
    return "bg-amber-300/70";
  }

  if (day.intensity === 1) {
    return "bg-rose-300/60";
  }

  return "bg-white/[0.06]";
}

function getTooltip(day: AnalyticsActivityDay) {
  if (day.isFuture) {
    return `${formatActivityDate(day.date)} • Future day`;
  }

  const details = [
    `Score ${day.score}`,
    day.topTaskDone ? "Top task done" : day.oneThingSet ? "Top task open" : "No top task set",
    day.deepMinutes > 0 ? `${day.deepMinutes} deep min` : "No deep work",
    day.reviewCompleted ? "Night review closed" : "Night review open",
  ];

  return `${formatActivityDate(day.date)} • ${details.join(" • ")}`;
}

function groupIntoWeeks(days: AnalyticsActivityDay[]) {
  const weeks: AnalyticsActivityDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function ActivityHeatmap({ days }: { days: AnalyticsActivityDay[] }) {
  const weeks = groupIntoWeeks(days);
  const latestPastDate = days.filter((day) => !day.isFuture).at(-1)?.date ?? "";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full grid-cols-[auto_1fr] gap-x-3 gap-y-3">
          <div />
          <div className="flex gap-2 pl-[1px]">
            {weeks.map((week, index) => {
              const firstDay = week[0];
              const previousWeek = weeks[index - 1]?.[0];
              const shouldShowMonth =
                index === 0 ||
                (firstDay && previousWeek && formatMonthLabel(firstDay.date) !== formatMonthLabel(previousWeek.date));

              return (
                <div
                  key={`month-${firstDay?.date ?? index}`}
                  className="w-3 overflow-visible whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-stone-500"
                >
                  {shouldShowMonth && firstDay ? formatMonthLabel(firstDay.date) : ""}
                </div>
              );
            })}
          </div>

          <div className="grid shrink-0 grid-rows-7 gap-2 text-[10px] uppercase tracking-[0.22em] text-stone-500">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((label, index) => (
              <span key={`${label}-${index}`} className="h-3 leading-3">
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-2 pb-1">
            {weeks.map((week, weekIndex) => (
              <div
                key={week[0]?.date ?? `week-${weekIndex}`}
                className="grid grid-rows-7 gap-2"
              >
                {week.map((day) => {
                  const isToday = day.date === latestPastDate && !day.isFuture;

                  return (
                    <div
                      key={day.date}
                      title={getTooltip(day)}
                      className={`h-3 w-3 rounded-[3px] ${cellClassName(day)} ${isToday ? "ring-1 ring-amber-100/80 ring-offset-2 ring-offset-[#090b0f]" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
        <span>Last 12 weeks of daily proof and drift pressure</span>
        <div className="flex items-center gap-2">
          <span>Light</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`h-3 w-3 rounded-[3px] ${cellClassName({
                date: "",
                score: level === 0 ? 0 : 40 + level * 10,
                deepMinutes: 0,
                topTaskDone: false,
                oneThingSet: level > 0,
                reviewCompleted: level > 0,
                sessionCount: level > 0 ? 1 : 0,
                intensity: level as 0 | 1 | 2 | 3 | 4,
                isFuture: false,
              })}`}
            />
          ))}
          <span>Strong</span>
        </div>
      </div>
    </div>
  );
}
