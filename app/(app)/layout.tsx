import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { DailyReviewProvider } from "@/components/providers/daily-review-provider";
import { FocusSessionsProvider } from "@/components/providers/focus-sessions-provider";
import { TodayPlanProvider } from "@/components/providers/today-plan-provider";
import { WeeklyReviewProvider } from "@/components/providers/weekly-review-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TodayPlanProvider>
      <FocusSessionsProvider>
        <DailyReviewProvider>
          <WeeklyReviewProvider>
            <AppShell>{children}</AppShell>
          </WeeklyReviewProvider>
        </DailyReviewProvider>
      </FocusSessionsProvider>
    </TodayPlanProvider>
  );
}
