"use client";

import Link from "next/link";

import type { AnalyticsDriftAlert } from "@/lib/analytics";

function alertClassName(level: AnalyticsDriftAlert["level"]) {
  if (level === "high") {
    return "border-rose-300/25 bg-rose-300/10";
  }

  if (level === "medium") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  return "border-sky-300/20 bg-sky-300/10";
}

function labelClassName(level: AnalyticsDriftAlert["level"]) {
  if (level === "high") {
    return "text-rose-100";
  }

  if (level === "medium") {
    return "text-amber-100";
  }

  return "text-sky-100";
}

export function DriftAlertList({ alerts }: { alerts: AnalyticsDriftAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-100/80">
          Drift detection
        </p>
        <p className="mt-3 text-base leading-7 text-stone-100">
          No strong drift pattern is active right now. Keep protecting the standard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-[1.5rem] border p-5 ${alertClassName(alert.level)}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.25em] ${labelClassName(alert.level)}`}>
                {alert.level} signal
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-stone-50">
                {alert.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-200">{alert.body}</p>
              <p className="mt-3 text-sm text-stone-400">{alert.metric}</p>
            </div>
            <Link
              href={alert.href}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 text-sm font-medium text-stone-100 transition hover:bg-white/[0.08]"
            >
              Open
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

