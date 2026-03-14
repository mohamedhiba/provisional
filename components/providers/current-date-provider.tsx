"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { useOnboardingProfile } from "@/components/providers/onboarding-provider";
import { getCurrentMonthStart } from "@/lib/monthly-mission";
import { getCurrentWeekStart } from "@/lib/weekly-review";
import { normalizeWeekStartPreference, type WeekStartPreference } from "@/lib/onboarding";
import {
  getBrowserTimeZone,
  getEffectiveTimeZone,
  getIsoDateInTimeZone,
  normalizeTimeZone,
} from "@/lib/time-zone";

type CurrentDateValue = {
  today: string;
  weekStart: string;
  monthStart: string;
  timeZone: string;
  browserTimeZone: string;
  isDeviceTimeZone: boolean;
  weekStartsOn: WeekStartPreference;
};

const CurrentDateContext = createContext<CurrentDateValue | null>(null);

function createCurrentDateValue(
  preferredTimeZone?: string,
  preferredWeekStart?: string,
): CurrentDateValue {
  const browserTimeZone = getBrowserTimeZone();
  const selectedTimeZone = normalizeTimeZone(preferredTimeZone);
  const timeZone = getEffectiveTimeZone(selectedTimeZone, browserTimeZone);
  const weekStartsOn = normalizeWeekStartPreference(preferredWeekStart);
  const today = getIsoDateInTimeZone(timeZone);

  return {
    today,
    weekStart: getCurrentWeekStart(today, weekStartsOn),
    monthStart: getCurrentMonthStart(today),
    timeZone,
    browserTimeZone,
    isDeviceTimeZone: !selectedTimeZone,
    weekStartsOn,
  };
}

export function CurrentDateProvider({ children }: PropsWithChildren) {
  const {
    onboarding: { timeZone: preferredTimeZone, weekStartsOn: preferredWeekStart },
  } = useOnboardingProfile();
  const [currentDate, setCurrentDate] = useState<CurrentDateValue>(() =>
    createCurrentDateValue(preferredTimeZone, preferredWeekStart),
  );

  useEffect(() => {
    function refreshIfNeeded() {
      setCurrentDate((current) => {
        const next = createCurrentDateValue(preferredTimeZone, preferredWeekStart);

        if (
          current.today === next.today &&
          current.weekStart === next.weekStart &&
          current.monthStart === next.monthStart &&
          current.timeZone === next.timeZone &&
          current.browserTimeZone === next.browserTimeZone &&
          current.isDeviceTimeZone === next.isDeviceTimeZone &&
          current.weekStartsOn === next.weekStartsOn
        ) {
          return current;
        }

        return next;
      });
    }

    refreshIfNeeded();
    const intervalId = window.setInterval(refreshIfNeeded, 30 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [preferredTimeZone, preferredWeekStart]);

  const value = useMemo(() => currentDate, [currentDate]);

  return <CurrentDateContext.Provider value={value}>{children}</CurrentDateContext.Provider>;
}

export function useCurrentDate() {
  const context = useContext(CurrentDateContext);

  if (!context) {
    throw new Error("useCurrentDate must be used inside CurrentDateProvider.");
  }

  return context;
}
