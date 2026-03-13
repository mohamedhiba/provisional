"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  getMillisecondsUntilNextLocalMidnight,
  getTodayIsoDate,
} from "@/lib/daily-plan";
import { getCurrentMonthStart } from "@/lib/monthly-mission";
import { getCurrentWeekStart } from "@/lib/weekly-review";

type CurrentDateValue = {
  today: string;
  weekStart: string;
  monthStart: string;
};

const CurrentDateContext = createContext<CurrentDateValue | null>(null);

function createCurrentDateValue(): CurrentDateValue {
  const today = getTodayIsoDate();

  return {
    today,
    weekStart: getCurrentWeekStart(today),
    monthStart: getCurrentMonthStart(today),
  };
}

export function CurrentDateProvider({ children }: PropsWithChildren) {
  const [currentDate, setCurrentDate] = useState<CurrentDateValue>(createCurrentDateValue);

  useEffect(() => {
    let timeoutId = 0;

    function refreshIfNeeded() {
      setCurrentDate((current) => {
        const next = createCurrentDateValue();

        if (
          current.today === next.today &&
          current.weekStart === next.weekStart &&
          current.monthStart === next.monthStart
        ) {
          return current;
        }

        return next;
      });
    }

    function scheduleMidnightRefresh(reference = new Date()) {
      timeoutId = window.setTimeout(() => {
        refreshIfNeeded();
        scheduleMidnightRefresh(new Date());
      }, getMillisecondsUntilNextLocalMidnight(reference));
    }

    const intervalId = window.setInterval(refreshIfNeeded, 60 * 1000);
    scheduleMidnightRefresh();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

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
