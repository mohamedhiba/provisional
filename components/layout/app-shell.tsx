"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.06),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(226,88,34,0.08),_transparent_40%),linear-gradient(180deg,_#08090c,_#0e1015_45%,_#090a0d)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
        <aside className="mb-4 rounded-[2rem] border border-white/10 bg-black/25 p-4 backdrop-blur lg:sticky lg:top-6 lg:mb-0 lg:h-[calc(100vh-3rem)] lg:w-[280px] lg:p-6">
          <div className="flex h-full flex-col">
            <Logo />
            <div className="mt-10 space-y-2">
              {siteConfig.navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-2xl border px-4 py-3 transition",
                      active
                        ? "border-amber-300/30 bg-amber-200/10 text-stone-50"
                        : "border-transparent bg-white/[0.03] text-stone-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-stone-100",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500 transition group-hover:text-stone-400">
                      {item.shortLabel}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Operating rule
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Daily proof beats motivational fiction. One thing first.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <header className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                Thursday, March 12
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
                Know what matters. Do the work. Face the truth.
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:w-[360px]">
              {[
                ["Streak", "6 days"],
                ["Weekly", "3 / 5"],
                ["Score", "68"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-stone-100">{value}</p>
                </div>
              ))}
            </div>
          </header>
          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
