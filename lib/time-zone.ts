const fallbackTimeZones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function getDatePartValue(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day" | "hour" | "minute",
) {
  return parts.find((part) => part.type === type)?.value ?? null;
}

export function isValidTimeZone(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
      hour: "2-digit",
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return isValidTimeZone(trimmed) ? trimmed : "";
}

export function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return "UTC";
  }

  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return normalizeTimeZone(browserTimeZone) || "UTC";
}

export function getEffectiveTimeZone(
  preferredTimeZone: string | null | undefined,
  browserTimeZone = getBrowserTimeZone(),
) {
  return normalizeTimeZone(preferredTimeZone) || normalizeTimeZone(browserTimeZone) || "UTC";
}

export function getTimeZoneOptions() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }

  return fallbackTimeZones;
}

export function getIsoDateInTimeZone(
  timeZone: string,
  referenceDate = new Date(),
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(referenceDate);
  const year = getDatePartValue(parts, "year");
  const month = getDatePartValue(parts, "month");
  const day = getDatePartValue(parts, "day");

  if (!year || !month || !day) {
    return "1970-01-01";
  }

  return `${year}-${month}-${day}`;
}

export function formatCurrentTimeInTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}
