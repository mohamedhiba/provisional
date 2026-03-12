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

export function ActivityHeatmap({ days }: { days: AnalyticsActivityDay[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="grid shrink-0 grid-rows-7 gap-2 pt-6 text-[10px] uppercase tracking-[0.22em] text-stone-500">
          {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((label, index) => (
            <span key={`${label}-${index}`} className="h-3 leading-3">
              {label}
            </span>
          ))}
        </div>
        <div className="grid auto-cols-max grid-flow-col grid-rows-7 gap-2 overflow-x-auto pb-1">
          {days.map((day) => (
            <div
              key={day.date}
              title={getTooltip(day)}
              className={`h-3 w-3 rounded-[3px] ${cellClassName(day)}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
        <span>Last 12 weeks of daily proof</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
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
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

