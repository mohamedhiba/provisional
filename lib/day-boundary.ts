import { getIsoDateForLocalDate } from "@/lib/daily-plan";

function shiftIsoDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getIsoDateForLocalDate(date);
}

export function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return "UTC";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getLocalIsoDateForTimestamp(timestamp: string, timeZone: string) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function getLegacyCorrectedDate(
  storedDate: string,
  createdAt: string | null | undefined,
  timeZone: string | null | undefined,
) {
  if (!createdAt || !timeZone) {
    return null;
  }

  const localDate = getLocalIsoDateForTimestamp(createdAt, timeZone);

  if (!localDate || localDate === storedDate) {
    return null;
  }

  const previousDate = shiftIsoDate(storedDate, -1);

  if (localDate === previousDate) {
    return localDate;
  }

  return null;
}
