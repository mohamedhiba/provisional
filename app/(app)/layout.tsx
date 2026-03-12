import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
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
            <AnalyticsProvider>
              <AppShell>{children}</AppShell>
            </AnalyticsProvider>
          </WeeklyReviewProvider>
        </DailyReviewProvider>
      </FocusSessionsProvider>
    </TodayPlanProvider>
  );
}
