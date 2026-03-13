import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { CurrentDateProvider } from "@/components/providers/current-date-provider";
import { DailyReviewProvider } from "@/components/providers/daily-review-provider";
import { FocusSessionsProvider } from "@/components/providers/focus-sessions-provider";
import { MonthlyMissionProvider } from "@/components/providers/monthly-mission-provider";
import { SetupGuideProvider } from "@/components/providers/setup-guide-provider";
import { TodayPlanProvider } from "@/components/providers/today-plan-provider";
import { WeeklyReviewProvider } from "@/components/providers/weekly-review-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CurrentDateProvider>
      <TodayPlanProvider>
        <FocusSessionsProvider>
          <DailyReviewProvider>
            <WeeklyReviewProvider>
              <MonthlyMissionProvider>
                <AnalyticsProvider>
                  <SetupGuideProvider>
                    <AppShell>{children}</AppShell>
                  </SetupGuideProvider>
                </AnalyticsProvider>
              </MonthlyMissionProvider>
            </WeeklyReviewProvider>
          </DailyReviewProvider>
        </FocusSessionsProvider>
      </TodayPlanProvider>
    </CurrentDateProvider>
  );
}
