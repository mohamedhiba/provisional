import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { DailyReviewProvider } from "@/components/providers/daily-review-provider";
import { FocusSessionsProvider } from "@/components/providers/focus-sessions-provider";
import { TodayPlanProvider } from "@/components/providers/today-plan-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TodayPlanProvider>
      <FocusSessionsProvider>
        <DailyReviewProvider>
          <AppShell>{children}</AppShell>
        </DailyReviewProvider>
      </FocusSessionsProvider>
    </TodayPlanProvider>
  );
}
